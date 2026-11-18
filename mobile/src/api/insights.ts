import type { ChartSnapshot, Profile } from "./contracts";

export type InsightBasis = {
  source: "mock" | "live";
  method: string;
  notice: string;
};
export type Tathkala = {
  profileId: string;
  natalSnapshotId: string;
  localDate: string;
  localTime: string;
  placeId: string;
  timezone: string;
  momentChart: ChartSnapshot;
  factors: { name: string; value: string; meaning: string }[];
  basis: InsightBasis;
};
export type TimelineEvent = {
  id: string;
  kind: "dasha" | "transit" | "eclipse";
  startDate: string;
  endDate: string;
  title: string;
  description: string;
};
export type LifeTimeline = {
  profileId: string;
  chartSnapshotId: string;
  fromDate: string;
  toDate: string;
  events: TimelineEvent[];
  basis: InsightBasis;
};
export type BirthTimeSensitivity = {
  profileId: string;
  chartSnapshotId: string;
  uncertaintyMinutes: number;
  crossesSignBoundary: boolean;
  samples: { offsetMinutes: number; ascendant: string; degreeLabel: string }[];
  basis: InsightBasis;
};
export type PredictionOutcome = "hit" | "partial" | "miss";
export type Prediction = {
  id: string;
  profileId: string;
  chartSnapshotId: string;
  statement: string;
  criteria: string;
  targetStart: string;
  targetEnd: string;
  timezone: string;
  createdAt: string;
  review: {
    outcome: PredictionOutcome;
    notes: string;
    reviewedAt: string;
  } | null;
};
export type JournalSummary = {
  total: number;
  reviewed: number;
  hits: number;
  partials: number;
  misses: number;
  due: number;
  scorePercent: number | null;
};
export type PredictionJournal = {
  profileId: string;
  entries: Prediction[];
  summary: JournalSummary;
};
export type ReportDocument = {
  id: string;
  profileId: string;
  chartSnapshotId: string;
  title: string;
  createdAt: string;
  localeUsed: "en";
  profile: Pick<Profile, "name" | "dob" | "time" | "place" | "revision">;
  sections: { title: string; paragraphs: string[] }[];
  basis: InsightBasis;
};
