import { localDate } from "../dates";
import type { Database } from "./database";
import { validDate } from "./insight-fixtures";

function text(v: unknown, max: number) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}
function timestamp(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

/** Reject malformed new records rather than silently losing a user's evidence. */
export function validateInsightStorage(db: Database) {
  if (!Array.isArray(db.predictions) || !Array.isArray(db.reports))
    throw Error("Saved insight data is incomplete.");
  const ids = new Set<string>();
  for (const item of [...db.predictions, ...db.reports]) {
    if (
      !item ||
      !text(item.id, 200) ||
      ids.has(item.id) ||
      !db.profiles.some((p) => p.id === item.profileId) ||
      !db.charts.some(
        (c) => c.id === item.chartSnapshotId && c.profileId === item.profileId,
      ) ||
      !timestamp(item.createdAt)
    )
      throw Error("Saved insight ownership is invalid.");
    ids.add(item.id);
  }
  for (const e of db.predictions) {
    if (
      !text(e.statement, 2000) ||
      !text(e.criteria, 1000) ||
      !validDate(e.targetStart) ||
      !validDate(e.targetEnd) ||
      e.targetStart > e.targetEnd ||
      typeof e.timezone !== "string"
    )
      throw Error("Saved prediction is invalid.");
    try {
      if (localDate(e.timezone, new Date(e.createdAt)) >= e.targetStart)
        throw Error("Prediction was not recorded in advance.");
      if (
        e.review !== null &&
        (!e.review ||
          !["hit", "partial", "miss"].includes(e.review.outcome) ||
          !text(e.review.notes, 2000) ||
          !timestamp(e.review.reviewedAt) ||
          localDate(e.timezone, new Date(e.review.reviewedAt)) <= e.targetEnd)
      )
        throw Error("Invalid review.");
    } catch {
      throw Error("Saved prediction timing is invalid.");
    }
  }
  for (const r of db.reports) {
    if (
      !text(r.title, 200) ||
      !r.profile ||
      !text(r.profile.name, 200) ||
      !validDate(r.profile.dob) ||
      typeof r.profile.time !== "string" ||
      typeof r.profile.place !== "string" ||
      !Number.isInteger(r.profile.revision) ||
      r.localeUsed !== "en" ||
      !r.basis ||
      !["mock", "live"].includes(r.basis.source) ||
      !text(r.basis.method, 500) ||
      !text(r.basis.notice, 2000) ||
      !Array.isArray(r.sections) ||
      r.sections.length === 0 ||
      r.sections.some(
        (s) =>
          !s ||
          !text(s.title, 200) ||
          !Array.isArray(s.paragraphs) ||
          !s.paragraphs.every((p) => typeof p === "string"),
      )
    )
      throw Error("Saved report is invalid.");
  }
}
