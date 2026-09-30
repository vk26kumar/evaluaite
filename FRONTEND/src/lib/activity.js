import {
  LuCircleAlert,
  LuCopy,
  LuFilePen,
  LuFilePlus,
  LuFileText,
  LuKeyRound,
  LuLink,
  LuLogOut,
  LuMailCheck,
  LuPencil,
  LuPresentation,
  LuRefreshCw,
  LuSquareCheck,
  LuSquarePen,
  LuTrash2,
  LuUserRound,
  LuUserRoundPlus,
} from "react-icons/lu";
import { formatMarks } from "./format";

const quote = (title) => `“${title || "Untitled"}”`;
const pct = (meta) => (meta?.percentage !== undefined ? ` (${Math.round(meta.percentage)}%)` : "");

export function describeActivity(item) {
  const { type, entity, meta = {} } = item;
  const title = entity?.title;
  const link =
    entity?.exists && entity.id
      ? entity.kind === "assignment"
        ? `/assignments/${entity.id}`
        : entity.kind === "evaluation"
          ? `/evaluations/${entity.id}`
          : null
      : null;

  const base = { link, tone: "neutral" };
  switch (type) {
    case "account.created":
      return { ...base, icon: LuUserRoundPlus, text: meta.method === "google" ? "Created your account with Google" : "Created your account" };
    case "account.updated":
      return { ...base, icon: LuUserRound, text: "Updated your profile details" };
    case "account.password_changed":
      return { ...base, icon: LuKeyRound, text: meta.added ? "Added a password to your account" : "Changed your password" };
    case "account.google_linked":
      return {
        ...base,
        icon: LuLink,
        text: "Connected your Google account",
        detail: meta.passwordRemoved ? "The old password was removed and other devices were signed out" : "",
      };
    case "account.password_reset":
      return { ...base, icon: LuKeyRound, text: "Reset your password from an email link" };
    case "account.email_verified":
      return { ...base, icon: LuMailCheck, tone: "good", text: "Confirmed your email address" };
    case "account.recovery_codes_created":
      return { ...base, icon: LuKeyRound, text: "Created new recovery codes" };
    case "account.password_recovered":
      return { ...base, icon: LuKeyRound, text: "Reset your password with a recovery code", detail: meta.codesLeft !== undefined ? `${meta.codesLeft} codes left` : "" };
    case "account.sessions_revoked":
      return { ...base, icon: LuLogOut, text: "Signed out on every other device" };
    case "assignment.created":
      return { ...base, icon: LuFilePlus, text: `Started the question paper ${quote(title)}`, detail: meta.questions ? `${meta.subject} · ${meta.className} · ${meta.questions} questions` : "" };
    case "assignment.generated":
      return { ...base, icon: LuFileText, tone: "good", text: `Question paper ${quote(title)} is ready`, detail: `${meta.questions} questions · ${formatMarks(meta.marks)} marks` };
    case "assignment.regenerated":
      return { ...base, icon: LuRefreshCw, text: `Wrote a new version of ${quote(title)}` };
    case "assignment.duplicated":
      return { ...base, icon: LuCopy, text: `Copied ${quote(meta.sourceTitle)} as ${quote(title)}` };
    case "assignment.edited":
      return { ...base, icon: LuFilePen, text: meta.question ? `Edited question ${meta.question} of ${quote(title)}` : `Edited the details of ${quote(title)}` };
    case "assignment.failed":
      return { ...base, icon: LuCircleAlert, tone: "bad", text: `Couldn't generate ${quote(title)}`, detail: meta.reason };
    case "assignment.deleted":
      return { ...base, icon: LuTrash2, tone: "muted", text: `Deleted the question paper ${quote(title)}` };
    case "evaluation.created":
      return { ...base, icon: LuSquarePen, text: `Submitted ${quote(title)} for grading`, detail: meta.pages ? `${meta.questions} questions · ${meta.pages} page${meta.pages === 1 ? "" : "s"}` : "" };
    case "evaluation.completed":
      return { ...base, icon: LuSquareCheck, tone: "good", text: `Graded ${quote(title)}`, detail: meta.max ? `${formatMarks(meta.awarded)} / ${formatMarks(meta.max)}${pct(meta)}` : "" };
    case "evaluation.failed":
      return { ...base, icon: LuCircleAlert, tone: "bad", text: `Couldn't grade ${quote(title)}`, detail: meta.reason };
    case "evaluation.mark_adjusted":
      return { ...base, icon: LuPencil, text: `Changed the mark for question ${meta.question} of ${quote(title)}`, detail: `${formatMarks(meta.from)} → ${formatMarks(meta.to)} out of ${formatMarks(meta.max)}` };
    case "evaluation.deleted":
      return { ...base, icon: LuTrash2, tone: "muted", text: `Deleted the graded sheet ${quote(title)}`, detail: meta.max ? `Scored ${formatMarks(meta.awarded)} / ${formatMarks(meta.max)}` : "" };
    case "slides.generated":
      return { ...base, icon: LuPresentation, text: `Generated the slide deck ${quote(title)}`, detail: meta.slides ? `${meta.slides} slides · ${meta.audience} audience` : "" };
    default:
      return { ...base, icon: LuFileText, text: type };
  }
}

export const ACTIVITY_CATEGORIES = [
  { value: "all", label: "Everything" },
  { value: "assignment", label: "Question papers" },
  { value: "evaluation", label: "Checking" },
  { value: "slides", label: "Slides" },
  { value: "account", label: "Account" },
];

export function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}
