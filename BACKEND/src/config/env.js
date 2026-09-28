const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

// Load BACKEND/.env regardless of the directory the process was started from.
dotenv.config({ path: path.join(__dirname, "..", "..", ".env"), quiet: true });

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: optionalString,
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  SERVER_URL: optionalString,
  RENDER_EXTERNAL_URL: optionalString,
  GEMINI_API_KEY: optionalString,
  // Legacy name used by earlier versions of this project.
  GEMINI_API: optionalString,
  GEMINI_MODEL: z.string().trim().default("gemini-flash-latest"),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  TRUST_PROXY: optionalString,
  MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(20).default(2),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${issues}\nSee BACKEND/.env.example.`);
  process.exit(1);
}

const env = parsed.data;
const isProd = env.NODE_ENV === "production";

if (isProd && env.JWT_SECRET.length < 32) {
  console.error(
    "JWT_SECRET must be at least 32 characters in production. Generate one with:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
  );
  process.exit(1);
}

const stripSlash = (url) => url.replace(/\/+$/, "");

const clientUrls = env.CLIENT_URL.split(",")
  .map((url) => stripSlash(url.trim()))
  .filter(Boolean);

const serverUrl = stripSlash(
  env.SERVER_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${env.PORT}`
);

function parseTrustProxy(value) {
  if (value === undefined) return isProd ? 1 : false;
  if (value === "true") return true;
  if (value === "false") return false;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value;
}

const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

module.exports = {
  nodeEnv: env.NODE_ENV,
  isProd,
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  mongoUri: env.MONGO_URI,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "ai-evaluaite",
    audience: "ai-evaluaite-web",
  },
  clientUrls,
  clientUrl: clientUrls[0],
  serverUrl,
  trustProxy: parseTrustProxy(env.TRUST_PROXY),
  gemini: {
    apiKey: env.GEMINI_API_KEY || env.GEMINI_API,
    model: env.GEMINI_MODEL,
  },
  google: {
    enabled: googleEnabled,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: `${serverUrl}/api/auth/google/callback`,
  },
  jobs: {
    maxConcurrent: env.MAX_CONCURRENT_JOBS,
    maxQueued: 25,
    staleAfterMs: 10 * 60 * 1000,
  },
};
