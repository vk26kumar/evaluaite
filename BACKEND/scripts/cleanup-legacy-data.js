/**
 * One-off cleanup of data left behind by the old version of the app.
 *
 *   npm run cleanup:legacy -- --db test                        report only, changes nothing
 *   npm run cleanup:legacy -- --db test --apply                back up, then clean up
 *   npm run cleanup:legacy -- --db test --apply --remove-user <id>
 *   npm run cleanup:legacy -- --db test --restore backups/<file>.json
 *
 * Production data lives in the "test" database, the driver's default, because
 * its MONGO_URI names none. The name is required so a local run can't clean
 * the wrong database by accident.
 *
 * What it cleans up:
 * - Graded sheets with no owner. The old version didn't link sheets to
 *   accounts, so nobody can open them in the app.
 * - Emails saved with capital letters are lowercased, unless another account
 *   already uses the lowercase form.
 * - Two accounts with the same email in different cases are listed in the
 *   report. Pass --remove-user with the id of the one to remove: its papers,
 *   sheets and history move to the other account, then it is deleted.
 *
 * Everything it deletes or changes is saved to BACKEND/backups/ first, and
 * --restore puts it back.
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const config = require("../src/config/env");

const { EJSON } = mongoose.mongo.BSON;
const { ObjectId } = mongoose.Types;
const BACKUP_DIR = path.join(__dirname, "..", "backups");

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--db") args.db = argv[++i];
    else if (arg === "--remove-user") args.removeUser = argv[++i];
    else if (arg === "--restore") args.restore = argv[++i];
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!args.db) throw new Error('Pass --db <name>, the database to clean. Production uses "test".');
  if (args.removeUser && !ObjectId.isValid(args.removeUser)) throw new Error("--remove-user needs an account id from the report.");
  return args;
}

function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  return `${local.slice(0, 2)}…@${domain}`;
}

const day = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "never");

/** Works out what would change, without changing anything. */
async function plan(db) {
  const users = db.collection("users");
  const evaluations = db.collection("evaluations");

  const ownerless = await evaluations
    .find({ owner: null }, { projection: { _id: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  const groups = await users
    .aggregate([
      { $group: { _id: { $toLower: "$email" }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  const duplicates = [];
  for (const group of groups) {
    const accounts = [];
    for (const id of group.ids) {
      const user = await users.findOne({ _id: id });
      accounts.push({
        id: String(id),
        email: user.email,
        password: Boolean(user.password),
        google: Boolean(user.googleId),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        evaluations: await evaluations.countDocuments({ owner: id }),
        assignments: await db.collection("assignments").countDocuments({ owner: id }),
        activities: await db.collection("activities").countDocuments({ user: id }),
      });
    }
    duplicates.push({ email: group._id, accounts });
  }

  const duplicateEmails = new Set(duplicates.map((group) => group.email));
  const mixedCase = (
    await users
      .find({ $expr: { $ne: ["$email", { $toLower: "$email" }] } }, { projection: { email: 1 } })
      .toArray()
  ).filter((user) => !duplicateEmails.has(user.email.toLowerCase()));

  // Linked to Google before linking removed unverified passwords. Shown for review only.
  const linkedWithPassword = await users.countDocuments({
    googleId: { $exists: true, $ne: null },
    password: { $exists: true, $nin: [null, ""] },
    emailVerified: { $ne: true },
  });

  return { ownerless, duplicates, mixedCase, linkedWithPassword };
}

function printReport(db, found, log) {
  log(`Database: ${db.databaseName}`);
  const { ownerless, duplicates, mixedCase, linkedWithPassword } = found;

  log(`\nGraded sheets with no owner: ${ownerless.length}`);
  if (ownerless.length > 0) {
    log(`  created ${day(ownerless[0].createdAt)} to ${day(ownerless[ownerless.length - 1].createdAt)}`);
  }

  log(`\nEmails with capital letters to lowercase: ${mixedCase.length}`);

  log(`\nEmails shared by more than one account: ${duplicates.length}`);
  for (const group of duplicates) {
    log(`  ${maskEmail(group.email)}`);
    for (const account of group.accounts) {
      const methods = [account.password && "password", account.google && "Google"].filter(Boolean).join(" + ") || "none";
      log(
        `    id ${account.id}  sign-in: ${methods}  created ${day(account.createdAt)}  last sign-in ${day(account.lastLoginAt)}  ` +
          `papers ${account.assignments}, sheets ${account.evaluations}, history ${account.activities}`
      );
    }
  }

  if (linkedWithPassword > 0) {
    log(`\nAccounts linked to Google earlier that still have an unverified password: ${linkedWithPassword} (review by hand)`);
  }
}

/** Saves everything that will be deleted or changed, then makes the changes. Returns the backup's path. */
async function apply(db, found, { removeUser } = {}) {
  const users = db.collection("users");
  const backup = {
    createdAt: new Date(),
    database: db.databaseName,
    deleted: { evaluations: [], users: [], authcodes: [] },
    moved: null,
    emailsLowercased: [],
  };

  let merge = null;
  if (removeUser) {
    const group = found.duplicates.find((g) => g.accounts.some((account) => account.id === removeUser));
    if (!group) throw new Error(`${removeUser} isn't one of the duplicate accounts in the report.`);
    if (group.accounts.length !== 2) throw new Error("More than two accounts share this email. Clean it up by hand.");
    const from = new ObjectId(removeUser);
    const to = new ObjectId(group.accounts.find((account) => account.id !== removeUser).id);
    const idsOf = async (name, field) =>
      (await db.collection(name).find({ [field]: from }, { projection: { _id: 1 } }).toArray()).map((doc) => doc._id);
    merge = {
      from,
      to,
      evaluations: await idsOf("evaluations", "owner"),
      assignments: await idsOf("assignments", "owner"),
      activities: await idsOf("activities", "user"),
    };
    backup.moved = merge;
    backup.deleted.users = await users.find({ _id: from }).toArray();
    backup.deleted.authcodes = await db.collection("authcodes").find({ user: from }).toArray();
  }

  const ownerlessIds = found.ownerless.map((doc) => doc._id);
  backup.deleted.evaluations = await db.collection("evaluations").find({ _id: { $in: ownerlessIds } }).toArray();

  const lowercase = [...found.mixedCase];
  if (merge) {
    const kept = await users.findOne({ _id: merge.to }, { projection: { email: 1 } });
    if (kept.email !== kept.email.toLowerCase()) lowercase.push(kept);
  }
  backup.emailsLowercased = lowercase.map((user) => ({ _id: user._id, from: user.email }));

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `cleanup-${db.databaseName}-${backup.createdAt.toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, EJSON.stringify(backup, null, 2, { relaxed: false }));

  if (merge) {
    await db.collection("evaluations").updateMany({ _id: { $in: merge.evaluations } }, { $set: { owner: merge.to } });
    await db.collection("assignments").updateMany({ _id: { $in: merge.assignments } }, { $set: { owner: merge.to } });
    await db.collection("activities").updateMany({ _id: { $in: merge.activities } }, { $set: { user: merge.to } });
    await db.collection("authcodes").deleteMany({ user: merge.from });
    await users.deleteOne({ _id: merge.from });
  }
  await db.collection("evaluations").deleteMany({ _id: { $in: ownerlessIds }, owner: null });
  for (const user of lowercase) {
    await users.updateOne({ _id: user._id }, { $set: { email: user.email.toLowerCase() } });
  }

  return file;
}

/** Puts back everything a backup recorded. Documents that exist again are left alone. */
async function restore(db, file) {
  const backup = EJSON.parse(fs.readFileSync(file, "utf8"), { relaxed: false });
  const counts = {};

  // Emails first, so a re-inserted account can't collide with one that was lowercased.
  for (const { _id, from } of backup.emailsLowercased) {
    await db.collection("users").updateOne({ _id }, { $set: { email: from } });
  }
  for (const [name, docs] of Object.entries(backup.deleted)) {
    counts[name] = 0;
    const collection = db.collection(name);
    for (const doc of docs) {
      if (await collection.countDocuments({ _id: doc._id }, { limit: 1 })) continue;
      await collection.insertOne(doc);
      counts[name] += 1;
    }
  }
  if (backup.moved) {
    const { from, evaluations, assignments, activities } = backup.moved;
    await db.collection("evaluations").updateMany({ _id: { $in: evaluations } }, { $set: { owner: from } });
    await db.collection("assignments").updateMany({ _id: { $in: assignments } }, { $set: { owner: from } });
    await db.collection("activities").updateMany({ _id: { $in: activities } }, { $set: { user: from } });
  }
  return counts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!config.mongoUri) throw new Error("MONGO_URI is not set in BACKEND/.env.");
  await mongoose.connect(config.mongoUri, { dbName: args.db, serverSelectionTimeoutMS: 15_000 });
  const { db } = mongoose.connection;

  try {
    if (args.restore) {
      const counts = await restore(db, path.resolve(args.restore));
      console.log(`Restored into ${db.databaseName}:`, counts);
      return;
    }

    const found = await plan(db);
    printReport(db, found, console.log);

    if (!args.apply) {
      console.log("\nNothing was changed. Run again with --apply to clean up.");
      if (found.duplicates.length > 0) console.log("Add --remove-user <id> to remove one of the duplicate accounts.");
      return;
    }

    const file = await apply(db, found, { removeUser: args.removeUser });
    console.log(`\nDone. Backup of everything changed: ${file}`);
    console.log(`To undo: npm run cleanup:legacy -- --db ${db.databaseName} --restore "${file}"`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Failed: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { plan, apply, restore, printReport };
