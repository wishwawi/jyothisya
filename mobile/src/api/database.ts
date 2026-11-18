import { makeChart } from "./fixtures";
import {
  decodeState as decodeLegacy,
  type State as LegacyState,
} from "../model";
import type {
  ChartSnapshot,
  Conversation,
  Interest,
  Preferences,
  Profile,
  Purchase,
  Reading,
  SavedChart,
  Verification,
  Entitlements,
  Bootstrap,
  Message,
  Prediction,
  ReportDocument,
} from "./contracts";
import { validateInsightStorage } from "./insight-storage";
export type Database = {
  version: 2;
  revision: number;
  profiles: Profile[];
  activeId: string | null;
  preferences: Preferences;
  plan: Entitlements["plan"];
  freeProfileClaimed: boolean;
  questionCredits: number;
  charts: ChartSnapshot[];
  readings: Reading[];
  savedCharts: SavedChart[];
  purchases: Purchase[];
  conversations: Conversation[];
  verification: Verification;
  favorites: string[];
  interests: Interest[];
  predictions: Prediction[];
  reports: ReportDocument[];
  ledger: { key: string; fingerprint: string; data: unknown }[];
};
export function freshDatabase(): Database {
  return {
    version: 2,
    revision: 0,
    profiles: [],
    activeId: null,
    preferences: { language: "en", timingPlaceId: "colombo" },
    plan: "free",
    freeProfileClaimed: false,
    questionCredits: 0,
    charts: [],
    readings: [],
    savedCharts: [],
    purchases: [],
    conversations: [],
    verification: { status: "not_started" },
    favorites: [],
    interests: [],
    predictions: [],
    reports: [],
    ledger: [],
  };
}
export function entitlements(db: Database): Entitlements {
  return {
    plan: db.plan,
    freeProfileEligible: !db.freeProfileClaimed,
    questionCredits: db.questionCredits,
    readingsUnlocked: db.plan !== "free",
    features: {
      timeline: db.plan !== "free",
      journal: db.plan !== "free",
      pdfReports: db.plan !== "free",
    },
  };
}
export function bootstrap(db: Database): Bootstrap {
  return {
    account: { id: "demo_account", name: "Nekath member" },
    profiles: db.profiles.filter((p) => !p.archived),
    activeId: db.activeId,
    preferences: db.preferences,
    entitlements: entitlements(db),
  };
}
export function migrateLegacy(raw: string): Database {
  const old: LegacyState = decodeLegacy(raw),
    db = freshDatabase();
  db.preferences.language = old.language;
  db.plan =
    old.previewPlan === 2
      ? "jyotisha"
      : old.previewPlan === 1
        ? "graha"
        : "free";
  db.freeProfileClaimed = old.profiles.length > 0;
  db.profiles = old.profiles.map((p) => ({
    ...p,
    revision: 1,
    archived: false,
    createdAt: new Date().toISOString(),
  }));
  db.charts = db.profiles.flatMap((p) => [
    makeChart(p, "rasi"),
    makeChart(p, "navamsha"),
  ]);
  db.activeId = old.activeId;
  db.questionCredits = Math.max(
    0,
    (old.previewPlan === 2 ? 15 : old.previewPlan === 1 ? 3 : 0) -
      old.questions.length,
  );
  for (const profile of db.profiles) {
    const qs = old.questions.filter((q) => q.profileId === profile.id);
    if (qs.length)
      db.conversations.push({
        id: `migrated_${profile.id}`,
        profileId: profile.id,
        profileName: profile.name,
        chartSnapshotId: `chart_${profile.id}_1_rasi`,
        title: qs[0].text,
        messages: qs.flatMap((q) => [
          {
            id: q.id + "_u",
            role: "user" as const,
            text: q.text,
            createdAt: q.createdAt,
            evidenceRefs: [],
          },
          {
            id: q.id + "_a",
            role: "assistant" as const,
            text: q.answer,
            createdAt: q.createdAt,
            evidenceRefs: [],
          },
        ]),
        createdAt: qs[0].createdAt,
      });
  }
  return db;
}
function isStoredMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.text === "string" &&
    typeof message.createdAt === "string" &&
    Array.isArray(message.evidenceRefs) &&
    message.evidenceRefs.every((ref: unknown) => typeof ref === "string")
  );
}

export function decodeDatabase(raw: string): Database {
  const d = JSON.parse(raw);
  if (
    !d ||
    d.version !== 2 ||
    !Number.isInteger(d.revision) ||
    !["free", "graha", "jyotisha"].includes(d.plan) ||
    typeof d.freeProfileClaimed !== "boolean" ||
    !Number.isInteger(d.questionCredits) ||
    d.questionCredits < 0 ||
    !d.preferences ||
    !["en", "si", "ta"].includes(d.preferences.language) ||
    typeof d.preferences.timingPlaceId !== "string"
  )
    throw Error("Saved app data could not be read.");
  for (const key of [
    "profiles",
    "charts",
    "readings",
    "savedCharts",
    "purchases",
    "conversations",
    "favorites",
    "interests",
    "ledger",
  ])
    if (!Array.isArray(d[key])) throw Error("Saved app data is incomplete.");
  if (
    !d.verification ||
    !["not_started", "pending", "verified", "rejected"].includes(
      d.verification.status,
    )
  )
    throw Error("Saved verification data could not be read.");
  const ids = new Set<string>();
  for (const p of d.profiles) {
    if (
      !p ||
      typeof p.id !== "string" ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      typeof p.dob !== "string" ||
      typeof p.time !== "string" ||
      typeof p.place !== "string" ||
      typeof p.archived !== "boolean" ||
      !Number.isInteger(p.revision)
    )
      throw Error("Saved profile data is invalid.");
    ids.add(p.id);
  }
  for (const key of ["charts", "readings", "savedCharts", "conversations"])
    for (const item of d[key])
      if (!item || typeof item.id !== "string" || !ids.has(item.profileId))
        throw Error("Saved resource ownership is invalid.");
  for (const conversation of d.conversations)
    if (
      !Array.isArray(conversation.messages) ||
      !conversation.messages.every(isStoredMessage)
    )
      throw Error("Saved conversation data is invalid.");
  for (const purchase of d.purchases)
    if (
      !purchase ||
      typeof purchase.id !== "string" ||
      !purchase.product ||
      !["graha", "jyotisha", "extra_profile", "questions_5"].includes(
        purchase.product.id,
      ) ||
      ![
        "awaiting_confirmation",
        "pending",
        "fulfilled",
        "failed",
        "cancelled",
      ].includes(purchase.status)
    )
      throw Error("Saved purchase data is invalid.");
  if (
    d.activeId &&
    !d.profiles.some((p: Profile) => p.id === d.activeId && !p.archived)
  )
    d.activeId = d.profiles.find((p: Profile) => !p.archived)?.id ?? null;
  if (d.predictions === undefined) d.predictions = [];
  if (d.reports === undefined) d.reports = [];
  validateInsightStorage(d);
  return d as Database;
}
