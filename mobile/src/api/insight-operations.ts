import { localDate } from "../dates";
import { id } from "../model";
import {
  ApiError,
  type Operations,
  type Operation,
  type Profile,
  type ReportDocument,
  type ChartSnapshot,
} from "./contracts";
import type { Database } from "./database";
import {
  insightBasis,
  journalFor,
  makeSensitivity,
  makeTathkala,
  makeTimeline,
  validDate,
} from "./insight-fixtures";
import { places } from "./fixtures";

export const insightOperations = [
  "tathkala",
  "timeline",
  "birthTimeSensitivity",
  "journal",
  "createPrediction",
  "reviewPrediction",
  "reports",
  "createReport",
  "report",
] as const;
export type InsightOperation = (typeof insightOperations)[number];
export type InsightRequest = {
  [K in InsightOperation]: { operation: K; input: Operations[K]["input"] };
}[InsightOperation];
export function isInsightOperation(op: Operation): op is InsightOperation {
  return (insightOperations as readonly string[]).includes(op);
}
function fail(code: string, message: string): never {
  throw new ApiError(code, message);
}
function requirePremium(db: Database) {
  if (db.plan === "free")
    fail("PLAN_REQUIRED", "Choose a premium plan to use this feature.");
}
function requiredText(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail("VALIDATION", `Enter ${label} up to ${max} characters.`);
  return value.trim();
}

export function handleInsight(
  db: Database,
  request: InsightRequest,
  now: number,
  getChart: (p: Profile) => ChartSnapshot,
): Operations[InsightOperation]["output"] {
  const { operation: op, input: a } = request;
  const record =
    op === "reviewPrediction"
      ? db.predictions.find((e) => e.id === a.id)
      : op === "report"
        ? db.reports.find((r) => r.id === a.id)
        : undefined;
  const profileId = "profileId" in a ? a.profileId : record?.profileId;
  const p =
    db.profiles.find((p) => p.id === profileId && !p.archived) ??
    fail("NOT_FOUND", "This profile or record is not available.");
  const stamp = new Date(now).toISOString();
  switch (op) {
    case "tathkala": {
      if (
        !validDate(a.localDate) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.localTime)
      )
        fail("VALIDATION", "Enter a valid date and 24-hour time (HH:mm).");
      const place =
        places.find((p) => p.id === a.placeId) ??
        fail("VALIDATION", "Choose a supported place.");
      return makeTathkala(p, getChart(p), a.localDate, a.localTime, place);
    }
    case "timeline": {
      requirePremium(db);
      if (
        !validDate(a.fromDate) ||
        !validDate(a.toDate) ||
        a.fromDate > a.toDate
      )
        fail(
          "VALIDATION",
          "Enter a valid, ordered date range from 1900 to 2200.",
        );
      return makeTimeline(p, getChart(p), a.fromDate, a.toDate);
    }
    case "birthTimeSensitivity":
      if (![5, 15, 30].includes(a.uncertaintyMinutes))
        fail("VALIDATION", "Choose a 5, 15 or 30 minute uncertainty window.");
      return makeSensitivity(p, getChart(p), a.uncertaintyMinutes);
    case "journal":
      return journalFor(p.id, db.predictions, now);
    case "createPrediction": {
      requirePremium(db);
      const statement = requiredText(a.statement, 2000, "a prediction");
      const criteria = requiredText(a.criteria, 1000, "success criteria");
      const timezone = (
        places.find((v) => v.id === db.preferences.timingPlaceId) ?? places[0]
      ).timezone;
      if (
        !validDate(a.targetStart) ||
        !validDate(a.targetEnd) ||
        a.targetStart > a.targetEnd ||
        a.targetStart <= localDate(timezone, new Date(now))
      )
        fail(
          "VALIDATION",
          "The target window must begin after today and end on or after its start.",
        );
      const entry = {
        id: "prediction_" + id(),
        profileId: p.id,
        chartSnapshotId: getChart(p).id,
        statement,
        criteria,
        targetStart: a.targetStart,
        targetEnd: a.targetEnd,
        timezone,
        createdAt: stamp,
        review: null,
      };
      db.predictions.push(entry);
      return entry;
    }
    case "reviewPrediction": {
      const entry = db.predictions.find((e) => e.id === a.id)!;
      if (entry.review)
        fail(
          "ALREADY_REVIEWED",
          "This outcome is already recorded and cannot be changed.",
        );
      if (localDate(entry.timezone, new Date(now)) <= entry.targetEnd)
        fail(
          "REVIEW_NOT_DUE",
          "Review this prediction after its complete target window has ended.",
        );
      if (!["hit", "partial", "miss"].includes(a.outcome))
        fail("VALIDATION", "Choose hit, partial or miss.");
      entry.review = {
        outcome: a.outcome,
        notes: requiredText(a.notes, 2000, "outcome evidence"),
        reviewedAt: stamp,
      };
      return entry;
    }
    case "reports":
      return db.reports
        .filter((r) => r.profileId === p.id)
        .slice()
        .reverse();
    case "report":
      return db.reports.find((r) => r.id === a.id)!;
    case "createReport": {
      requirePremium(db);
      const chart = getChart(p);
      const journal = journalFor(p.id, db.predictions, now);
      const r: ReportDocument = {
        id: "report_" + id(),
        profileId: p.id,
        chartSnapshotId: chart.id,
        title: "Nekath personal report",
        createdAt: stamp,
        localeUsed: "en",
        profile: {
          name: p.name,
          dob: p.dob,
          time: p.time,
          place: p.place,
          revision: p.revision,
        },
        basis: insightBasis,
        sections: [
          {
            title: "Birth chart · demonstration",
            paragraphs: [
              `Lagna: ${chart.summary.lagna}. Moon sign: ${chart.summary.rashi}. Nakshatra: ${chart.summary.nakshatra}.`,
              ...chart.positions.map(
                (v) =>
                  `${v.label}: ${v.sign}, house ${v.house}, ${v.degreeLabel}.`,
              ),
            ],
          },
          {
            title: "Life timeline · demonstration",
            paragraphs: makeTimeline(
              p,
              chart,
              "1900-01-01",
              "2200-12-31",
            ).events.map(
              (e) =>
                `${e.startDate} to ${e.endDate}: ${e.title}. ${e.description}`,
            ),
          },
          {
            title: "Your prediction journal",
            paragraphs: [
              `${journal.summary.reviewed} reviewed of ${journal.summary.total} recorded. Hits: ${journal.summary.hits}; partials: ${journal.summary.partials}; misses: ${journal.summary.misses}.`,
              journal.summary.scorePercent === null
                ? "Accuracy: no reviewed predictions yet."
                : `Self-reported score: ${journal.summary.scorePercent}%. Partial results count as one half; unreviewed entries are excluded.`,
              ...journal.entries.map(
                (e) =>
                  `${e.statement}\nCriteria: ${e.criteria}\nWindow: ${e.targetStart} to ${e.targetEnd} (${e.timezone}). Recorded: ${e.createdAt}. Basis: ${e.chartSnapshotId}.\nOutcome: ${e.review ? e.review.outcome + ". " + e.review.notes : "Not reviewed"}`,
              ),
            ],
          },
          {
            title: "Birth-time uncertainty",
            paragraphs: [
              "Sensitivity examples are available from Charts. No birth-time uncertainty or rectification has been calculated in this demo.",
            ],
          },
        ],
      };
      db.reports.push(r);
      return r;
    }
  }
}
