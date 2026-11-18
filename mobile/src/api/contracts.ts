import type {
  BirthDraft as LegacyBirthDraft,
  Category,
  Language,
} from "../model";
import type {
  Tathkala,
  LifeTimeline,
  BirthTimeSensitivity,
  Prediction,
  PredictionJournal,
  PredictionOutcome,
  ReportDocument,
} from "./insights";
export type * from "./insights";
export type { Category, Language };
export type BirthDraft = LegacyBirthDraft & { placeId?: string };
export type Plan = "free" | "graha" | "jyotisha";
export type Scenario = "normal" | "slow" | "offline" | "error_once";
export type Profile = BirthDraft & {
  id: string;
  revision: number;
  archived: boolean;
  freeCategory?: Category;
  createdAt: string;
};
export type Preferences = { language: Language; timingPlaceId: string };
export type Place = {
  id: string;
  name: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
};
export type Entitlements = {
  plan: Plan;
  freeProfileEligible: boolean;
  questionCredits: number;
  readingsUnlocked: boolean;
  features: { timeline: boolean; journal: boolean; pdfReports: boolean };
};
export type Position = {
  bodyId: string;
  label: string;
  sign: string;
  signIndex: number;
  house: number;
  longitudeDeg: number;
  degreeLabel: string;
  nakshatra: string;
  pada: number;
  retrograde: boolean;
};
export type ChartSnapshot = {
  id: string;
  profileId: string;
  profileRevision: number;
  profileName: string;
  kind: "rasi" | "navamsha";
  createdAt: string;
  method: { id: string; label: string; version: string };
  summary: {
    lagna: string;
    rashi: string;
    nakshatra: string;
    lagnaLord: string;
    moonLord: string;
  };
  positions: Position[];
  cells: { signIndex: number; house: number; bodies: string[] }[];
  dashas: {
    id: string;
    lord: string;
    startDate: string;
    endDate: string;
    current: boolean;
  }[];
  source: "mock" | "live";
};
export type Reading = {
  id: string;
  profileId: string;
  chartSnapshotId: string;
  category: Category;
  title: string;
  headline: string;
  body: string;
  assessment: "supportive" | "mixed" | "care";
  factors: { id: string; term: string; meaning: string; basisRef: string }[];
  window: { startDate: string; endDate: string; label: string } | null;
  checks: { name: string; result: string }[];
  localeUsed: Language;
  source: "mock" | "live";
};
export type Home = {
  profile: Profile;
  summary: ChartSnapshot["summary"];
  categories: {
    id: Category;
    title: string;
    description: string;
    locked: boolean;
  }[];
  entitlements: Entitlements;
};
export type Product = {
  id: "graha" | "jyotisha" | "extra_profile" | "questions_5";
  title: string;
  amountMinor: number;
  currency: "LKR";
  credits: number;
  description: string[];
};
export type Purchase = {
  id: string;
  product: Product;
  status:
    "awaiting_confirmation" | "pending" | "fulfilled" | "failed" | "cancelled";
  createdAt: string;
  profileId?: string;
  draft?: BirthDraft;
  failureReason?: string;
};
export type DemoProof = {
  kind: "demo";
  outcome: "approved" | "pending" | "declined";
};
export type StoreProof =
  | DemoProof
  | { kind: "apple"; signedTransaction: string }
  | { kind: "google"; purchaseToken: string };
export type SavedChart = {
  id: string;
  profileId: string;
  snapshotId: string;
  title: string;
  createdAt: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  evidenceRefs: string[];
};
export type Conversation = {
  id: string;
  profileId: string;
  profileName: string;
  chartSnapshotId: string;
  title: string;
  messages: Message[];
  createdAt: string;
};
export type Daily = {
  id: string;
  profileId: string;
  chartSnapshotId: string;
  localDate: string;
  place: Place;
  headline: string;
  body: string;
  assessment: "supportive" | "mixed" | "care";
  lifePeriod: { main: string; sub: string };
  panchanga: { name: string; term: string; value: string }[];
  intervals: {
    id: string;
    startAt: string;
    endAt: string;
    assessment: "supportive" | "care";
    activity: string;
    factors: { term: string; meaning: string }[];
  }[];
  source: "mock" | "live";
};
export type Verification = {
  status: "not_started" | "pending" | "verified" | "rejected";
  documentType?: "NIC" | "Passport";
  submittedAt?: string;
  reviewReadyAt?: number;
  outcome?: "verified" | "rejected";
  reason?: string;
  id?: string;
};
export type Match = {
  id: string;
  name: string;
  age: number;
  city: string;
  occupation: string;
  about: string;
  interests: string[];
  initials: string;
  compatibility: {
    method: string;
    checks: { name: string; result: string; meaning: string }[];
  };
  source: "mock" | "live";
};
export type Interest = {
  id: string;
  matchId: string;
  status: "sent" | "withdrawn";
  createdAt: string;
};
export type Bootstrap = {
  account: { id: string; name: string };
  profiles: Profile[];
  activeId: string | null;
  preferences: Preferences;
  entitlements: Entitlements;
};
export type Envelope<T> = {
  data: T;
  meta: {
    requestId: string;
    source: "mock" | "live";
    localeUsed: Language;
    fallback: boolean;
  };
};
export type ErrorBody = {
  code: string;
  message: string;
  retryable: boolean;
  fields?: { path: string; message: string }[];
};
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public fields?: ErrorBody["fields"],
  ) {
    super(message);
  }
}
export interface Operations {
  tathkala: {
    input: {
      profileId: string;
      localDate: string;
      localTime: string;
      placeId: string;
    };
    output: Tathkala;
  };
  timeline: {
    input: { profileId: string; fromDate: string; toDate: string };
    output: LifeTimeline;
  };
  birthTimeSensitivity: {
    input: { profileId: string; uncertaintyMinutes: number };
    output: BirthTimeSensitivity;
  };
  journal: { input: { profileId: string }; output: PredictionJournal };
  createPrediction: {
    input: {
      profileId: string;
      statement: string;
      criteria: string;
      targetStart: string;
      targetEnd: string;
    };
    output: Prediction;
  };
  reviewPrediction: {
    input: { id: string; outcome: PredictionOutcome; notes: string };
    output: Prediction;
  };
  reports: { input: { profileId: string }; output: ReportDocument[] };
  createReport: { input: { profileId: string }; output: ReportDocument };
  report: { input: { id: string }; output: ReportDocument };
  bootstrap: { input: Record<string, never>; output: Bootstrap };
  places: { input: { query: string }; output: Place[] };
  preferences: { input: Partial<Preferences>; output: Preferences };
  profiles: { input: { includeArchived?: boolean }; output: Profile[] };
  createProfile: { input: { draft: BirthDraft }; output: Profile };
  updateProfile: {
    input: { profileId: string; revision: number; draft: BirthDraft };
    output: Profile;
  };
  selectProfile: { input: { profileId: string }; output: Profile };
  archiveProfile: {
    input: { profileId: string; archived: boolean };
    output: Profile;
  };
  home: { input: { profileId: string }; output: Home };
  chart: {
    input: {
      profileId: string;
      kind: ChartSnapshot["kind"];
      snapshotId?: string;
    };
    output: ChartSnapshot;
  };
  saveChart: {
    input: { profileId: string; snapshotId: string; title: string };
    output: SavedChart;
  };
  savedCharts: { input: { profileId: string }; output: SavedChart[] };
  removeSavedChart: { input: { id: string }; output: { removed: boolean } };
  createReading: {
    input: { profileId: string; category: Category };
    output: Reading;
  };
  reading: { input: { id: string }; output: Reading };
  products: { input: Record<string, never>; output: Product[] };
  createPurchase: {
    input: { productId: Product["id"]; draft?: BirthDraft };
    output: Purchase;
  };
  purchase: { input: { id: string }; output: Purchase };
  purchases: { input: Record<string, never>; output: Purchase[] };
  verifyPurchase: {
    input: { id: string; proof: StoreProof };
    output: Purchase;
  };
  cancelPurchase: { input: { id: string }; output: Purchase };
  conversations: { input: { profileId: string }; output: Conversation[] };
  createConversation: {
    input: { profileId: string; chartSnapshotId?: string };
    output: Conversation;
  };
  conversation: { input: { id: string }; output: Conversation };
  sendMessage: {
    input: { conversationId: string; text: string };
    output: { conversation: Conversation; creditsRemaining: number };
  };
  daily: {
    input: { profileId: string; localDate: string; placeId: string };
    output: Daily;
  };
  verification: { input: Record<string, never>; output: Verification };
  submitVerification: {
    input: {
      documentType: "NIC" | "Passport";
      documentFixtureId: "demo-document";
      selfieFixtureId: "demo-selfie";
      demoOutcome: "verified" | "rejected";
    };
    output: Verification;
  };
  matches: {
    input: { query?: string; city?: string; minAge?: number; maxAge?: number };
    output: Match[];
  };
  match: { input: { id: string }; output: Match };
  favorite: {
    input: { matchId: string; saved: boolean };
    output: { matchId: string; saved: boolean };
  };
  favorites: { input: Record<string, never>; output: Match[] };
  interest: {
    input: { matchId: string; withdraw?: boolean };
    output: Interest;
  };
  interests: { input: Record<string, never>; output: Interest[] };
}
export type Operation = keyof Operations;
export type Input<K extends Operation> = Operations[K]["input"];
export type Output<K extends Operation> = Operations[K]["output"];
export interface Api {
  call<K extends Operation>(
    operation: K,
    input: Input<K>,
    idempotencyKey?: string,
  ): Promise<Envelope<Output<K>>>;
  setScenario: (scenario: Scenario) => void;
}
