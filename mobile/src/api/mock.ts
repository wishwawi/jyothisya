import { localDate } from "../dates";
import { id, validateBirth } from "../model";
import {
  ApiError,
  type Api,
  type Input,
  type Operation,
  type Output,
  type Profile,
  type Purchase,
  type Scenario,
  type StoreProof,
} from "./contracts";
import { bootstrap, entitlements, type Database } from "./database";
import {
  categoryInfo,
  makeChart,
  makeDaily,
  makeReading,
  matchFixtures,
  places,
  products,
} from "./fixtures";
import { routes } from "./routes";
import {
  handleInsight,
  isInsightOperation,
  type InsightRequest,
} from "./insight-operations";
type ApiRequest = {
  [K in Operation]: { operation: K; input: Input<K> };
}[Operation];

type Options = { delayMs?: number; now?: () => number };
export function createMockApi(
  read: () => Database,
  commit: (db: Database) => Promise<void>,
  options: Options = {},
): Api {
  let tail: Promise<unknown> = Promise.resolve(),
    scenario: Scenario = "normal";
  const now = options.now ?? Date.now;
  const stamp = () => new Date(now()).toISOString();
  function fail(code: string, message: string, retryable = false): never {
    throw new ApiError(code, message, retryable);
  }
  function profile(db: Database, profileId: string, includeArchived = false) {
    const p = db.profiles.find(
      (p) => p.id === profileId && (includeArchived || !p.archived),
    );
    return p ?? fail("NOT_FOUND", "This profile is not available.");
  }
  function chart(db: Database, p: Profile, kind: "rasi" | "navamsha") {
    let result = db.charts.find(
      (c) =>
        c.profileId === p.id &&
        c.profileRevision === p.revision &&
        c.kind === kind,
    );
    if (!result) {
      result = makeChart(p, kind);
      db.charts.push(result);
    }
    return result;
  }
  function birth(value: unknown) {
    const d = value as Record<string, unknown> | undefined;
    if (
      !d ||
      !["name", "dob", "time", "place"].every((k) => typeof d[k] === "string")
    )
      fail("VALIDATION", "Enter complete birth details.");
    const draft = {
      name: d.name as string,
      dob: d.dob as string,
      time: d.time as string,
      place: d.place as string,
      isExample: d.isExample === true,
      ...(typeof d.placeId === "string" ? { placeId: d.placeId } : {}),
    };
    const error = validateBirth(
      draft,
      localDate("Asia/Colombo", new Date(now())),
    );
    if (error) fail("VALIDATION", error);
    return draft;
  }
  function newProfile(db: Database, draft: Input<"createProfile">["draft"]) {
    draft = birth(draft);
    const p: Profile = {
      ...draft,
      name: draft.name.trim(),
      place: draft.place.trim(),
      id: "p_" + id(),
      revision: 1,
      archived: false,
      createdAt: stamp(),
    };
    db.profiles.push(p);
    db.activeId = p.id;
    chart(db, p, "rasi");
    chart(db, p, "navamsha");
    return p;
  }
  function purchase(db: Database, purchaseId: string) {
    return (
      db.purchases.find((p) => p.id === purchaseId) ??
      fail("NOT_FOUND", "Purchase not found.")
    );
  }
  function matchGate(db: Database) {
    if (db.plan === "free")
      fail("PLAN_REQUIRED", "Choose a plan to use Matrimony.");
    if (db.verification.status !== "verified")
      fail(
        "VERIFICATION_REQUIRED",
        "Complete demo verification before browsing.",
      );
  }
  function getMatch(matchId: string) {
    return (
      matchFixtures.find((m) => m.id === matchId) ??
      fail("NOT_FOUND", "Member not found.")
    );
  }
  function handle(db: Database, request: ApiRequest): Output<Operation> {
    const { operation: op, input: a } = request;
    if (isInsightOperation(op))
      return handleInsight(db, request as InsightRequest, now(), (p) =>
        chart(db, p, "rasi"),
      );
    let result: unknown;
    switch (op) {
      case "bootstrap":
        result = bootstrap(db);
        break;
      case "places":
        result = places.filter((p) =>
          (p.name + " " + p.country)
            .toLowerCase()
            .includes(String(a.query ?? "").toLowerCase()),
        );
        break;
      case "preferences":
        if (a.language && !["en", "si", "ta"].includes(a.language))
          fail("VALIDATION", "Unsupported language.");
        if (a.timingPlaceId && !places.some((p) => p.id === a.timingPlaceId))
          fail("VALIDATION", "Select a supported timing place.");
        db.preferences = {
          ...db.preferences,
          ...(a.language ? { language: a.language } : {}),
          ...(a.timingPlaceId ? { timingPlaceId: a.timingPlaceId } : {}),
        };
        result = db.preferences;
        break;
      case "profiles":
        result = db.profiles.filter((p) => a.includeArchived || !p.archived);
        break;
      case "createProfile":
        if (db.freeProfileClaimed)
          fail(
            "PROFILE_PURCHASE_REQUIRED",
            "Each additional profile needs a creation purchase.",
          );
        result = newProfile(db, a.draft);
        db.freeProfileClaimed = true;
        break;
      case "updateProfile": {
        const p = profile(db, a.profileId);
        if (p.revision !== a.revision)
          fail(
            "REVISION_CONFLICT",
            "This profile changed. Reload before saving.",
          );
        const draft = birth(a.draft);
        Object.assign(p, draft, {
          name: draft.name.trim(),
          place: draft.place.trim(),
          revision: p.revision + 1,
        });
        chart(db, p, "rasi");
        chart(db, p, "navamsha");
        result = p;
        break;
      }
      case "selectProfile":
        result = profile(db, a.profileId);
        db.activeId = a.profileId;
        break;
      case "archiveProfile": {
        const p = profile(db, a.profileId, true);
        p.archived = !!a.archived;
        if (p.archived && db.activeId === p.id)
          db.activeId = db.profiles.find((v) => !v.archived)?.id ?? null;
        else if (!p.archived && !db.activeId) db.activeId = p.id;
        result = p;
        break;
      }
      case "home": {
        const p = profile(db, a.profileId);
        result = {
          profile: p,
          summary: chart(db, p, "rasi").summary,
          entitlements: entitlements(db),
          categories: Object.entries(categoryInfo).map(([key, v]) => ({
            id: key,
            ...v,
            locked:
              db.plan === "free" && !!p.freeCategory && p.freeCategory !== key,
          })),
        };
        break;
      }
      case "chart": {
        const p = profile(db, a.profileId);
        if (!["rasi", "navamsha"].includes(a.kind))
          fail("VALIDATION", "Select a supported chart type.");
        result = a.snapshotId
          ? (db.charts.find(
              (c) => c.id === a.snapshotId && c.profileId === p.id,
            ) ?? fail("NOT_FOUND", "Saved chart snapshot unavailable."))
          : chart(db, p, a.kind);
        break;
      }
      case "saveChart": {
        const p = profile(db, a.profileId);
        const snap =
          db.charts.find(
            (c) => c.id === a.snapshotId && c.profileId === p.id,
          ) ?? fail("NOT_FOUND", "Chart does not belong to this profile.");
        const existing = db.savedCharts.find(
          (v) => v.snapshotId === snap.id && v.profileId === p.id,
        );
        if (existing) {
          result = existing;
          break;
        }
        const item = {
          id: "saved_" + id(),
          profileId: p.id,
          snapshotId: snap.id,
          title: String(a.title || snap.kind)
            .trim()
            .slice(0, 100),
          createdAt: stamp(),
        };
        db.savedCharts.push(item);
        result = item;
        break;
      }
      case "savedCharts":
        profile(db, a.profileId);
        result = db.savedCharts.filter((c) => c.profileId === a.profileId);
        break;
      case "removeSavedChart": {
        const saved = db.savedCharts.find((s) => s.id === a.id);
        if (!saved) fail("NOT_FOUND", "Saved chart not found.");
        db.savedCharts = db.savedCharts.filter((s) => s.id !== a.id);
        result = { removed: true };
        break;
      }
      case "createReading": {
        const p = profile(db, a.profileId);
        if (!Object.hasOwn(categoryInfo, a.category))
          fail("VALIDATION", "Unsupported reading category.");
        if (
          db.plan === "free" &&
          p.freeCategory &&
          p.freeCategory !== a.category
        )
          fail(
            "PLAN_REQUIRED",
            "Your free reading is already selected. Choose a plan for more categories.",
          );
        let reading = db.readings.find(
          (r) =>
            r.profileId === p.id &&
            r.category === a.category &&
            r.chartSnapshotId === chart(db, p, "rasi").id,
        );
        if (!reading) {
          reading = makeReading(p, chart(db, p, "rasi"), a.category);
          db.readings.push(reading);
        }
        if (!p.freeCategory && db.plan === "free") p.freeCategory = a.category;
        result = reading;
        break;
      }
      case "reading":
        result =
          db.readings.find((r) => r.id === a.id) ??
          fail("NOT_FOUND", "Reading not found.");
        break;
      case "products":
        result = products;
        break;
      case "createPurchase": {
        const product =
          products.find((p) => p.id === a.productId) ??
          fail("VALIDATION", "Product not found.");
        if (product.id === "extra_profile") {
          if (!db.freeProfileClaimed)
            fail("FREE_PROFILE_AVAILABLE", "Create your first profile free.");
          birth(a.draft);
        }
        const p: Purchase = {
          id: "order_" + id(),
          product: JSON.parse(JSON.stringify(product)),
          status: "awaiting_confirmation",
          createdAt: stamp(),
          ...(product.id === "extra_profile" ? { draft: a.draft } : {}),
        };
        db.purchases.push(p);
        result = p;
        break;
      }
      case "purchase":
        result = purchase(db, a.id);
        break;
      case "purchases":
        result = [...db.purchases].reverse();
        break;
      case "verifyPurchase": {
        const p = purchase(db, a.id);
        const proof = a.proof as StoreProof;
        if (p.status === "fulfilled") {
          result = p;
          break;
        }
        if (p.status === "cancelled")
          fail(
            "PURCHASE_CANCELLED",
            "This purchase was cancelled. Start a new purchase.",
          );
        if (proof.kind !== "demo")
          fail(
            "MOCK_ONLY",
            "Only simulated purchase proofs are accepted by this app.",
          );
        if (!["approved", "pending", "declined"].includes(proof.outcome))
          fail("VALIDATION", "Unsupported demo purchase outcome.");
        if (proof.outcome === "pending") {
          p.status = "pending";
          result = p;
          break;
        }
        if (proof.outcome === "declined") {
          p.status = "failed";
          p.failureReason =
            "The demo purchase was declined. No entitlement was granted.";
          result = p;
          break;
        }
        p.status = "fulfilled";
        delete p.failureReason;
        if (p.product.id === "extra_profile") {
          const person = newProfile(db, p.draft!);
          p.profileId = person.id;
        } else if (p.product.id === "graha" || p.product.id === "jyotisha") {
          if (p.product.id === "jyotisha" || db.plan === "free")
            db.plan = p.product.id;
          db.questionCredits += p.product.credits;
        } else db.questionCredits += p.product.credits;
        result = p;
        break;
      }
      case "cancelPurchase": {
        const p = purchase(db, a.id);
        if (p.status === "fulfilled")
          fail(
            "ALREADY_FULFILLED",
            "Completed purchases cannot be cancelled here.",
          );
        p.status = "cancelled";
        result = p;
        break;
      }
      case "conversations":
        profile(db, a.profileId);
        result = db.conversations
          .filter((c) => c.profileId === a.profileId)
          .slice()
          .reverse();
        break;
      case "createConversation": {
        const p = profile(db, a.profileId);
        const conversation = {
          id: "chat_" + id(),
          profileId: p.id,
          profileName: p.name,
          chartSnapshotId: a.chartSnapshotId
            ? (db.charts.find(
                (c) => c.id === a.chartSnapshotId && c.profileId === p.id,
              )?.id ?? fail("NOT_FOUND", "Chart basis not found."))
            : chart(db, p, "rasi").id,
          title: "New conversation",
          messages: [],
          createdAt: stamp(),
        };
        db.conversations.push(conversation);
        result = conversation;
        break;
      }
      case "conversation":
        result =
          db.conversations.find((c) => c.id === a.id) ??
          fail("NOT_FOUND", "Conversation not found.");
        break;
      case "sendMessage": {
        const chat =
          db.conversations.find((c) => c.id === a.conversationId) ??
          fail("NOT_FOUND", "Conversation not found.");
        profile(db, chat.profileId);
        const text = String(a.text ?? "").trim();
        if (!text || text.length > 2000)
          fail("VALIDATION", "Enter a question up to 2000 characters.");
        if (db.questionCredits < 1)
          fail(
            "CREDITS_REQUIRED",
            "You have no question credits left. Add credits to continue.",
          );
        const q = text.toLowerCase();
        const answer = q.includes("dasha")
          ? "Dasha describes a sequence of life periods, with main periods and subperiods. Your selected demo snapshot has Budha as its main period. These dates are fixture data, not calculated from your birth details."
          : q.includes("hora")
            ? "Hora is a daily planetary-hour method. It is different from a longer dasha period. Open Daily to see example helpful and caution intervals for your selected date and location."
            : q.includes("lagna")
              ? `Lagna is the rising sign at a defined birth moment and place. This demo snapshot uses ${db.charts.find((c) => c.id === chat.chartSnapshotId)?.summary.lagna ?? "Thula"} as its reference. Houses are read in relation to that reference.`
              : q.includes("marri") || q.includes("love")
                ? "Relationship readings consider several factors together. The demo report highlights communication and shared plans; it cannot establish an actual marriage date. Open Love & Marriage to inspect the supporting fixture factors."
                : "This demo answer refers to the chart snapshot saved with this conversation. A complete interpretation combines the natal basis, life periods and transits. Ask about Lagna, Dasha or Hora to explore a specific concept.";
        chat.messages.push(
          {
            id: "msg_" + id(),
            role: "user",
            text,
            createdAt: stamp(),
            evidenceRefs: [],
          },
          {
            id: "msg_" + id(),
            role: "assistant",
            text: answer,
            createdAt: stamp(),
            evidenceRefs: [chat.chartSnapshotId],
          },
        );
        if (chat.title === "New conversation") chat.title = text.slice(0, 80);
        db.questionCredits--;
        result = { conversation: chat, creditsRemaining: db.questionCredits };
        break;
      }
      case "daily": {
        const p = profile(db, a.profileId),
          place =
            places.find((p) => p.id === a.placeId) ??
            fail("VALIDATION", "Choose a timing location.");
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(a.localDate) ||
          Number.isNaN(Date.parse(a.localDate + "T12:00:00Z")) ||
          new Date(a.localDate + "T12:00:00Z").toISOString().slice(0, 10) !==
            a.localDate
        )
          fail("VALIDATION", "Choose a valid date.");
        result = makeDaily(p, chart(db, p, "rasi"), a.localDate, place);
        break;
      }
      case "verification":
        if (
          db.verification.status === "pending" &&
          now() >= (db.verification.reviewReadyAt ?? Infinity)
        )
          db.verification = {
            ...db.verification,
            status: db.verification.outcome ?? "verified",
            ...(db.verification.outcome === "rejected"
              ? {
                  reason:
                    "The sample document is unclear. Choose a different demo outcome and resubmit.",
                }
              : { reason: undefined }),
          };
        result = db.verification;
        break;
      case "submitVerification":
        if (
          !["NIC", "Passport"].includes(a.documentType) ||
          a.documentFixtureId !== "demo-document" ||
          a.selfieFixtureId !== "demo-selfie" ||
          !["verified", "rejected"].includes(a.demoOutcome)
        )
          fail("VALIDATION", "Select both demo document and selfie samples.");
        if (db.verification.status === "pending")
          fail("ALREADY_PENDING", "Your demo review is still pending.");
        db.verification = {
          id: "verification_" + id(),
          documentType: a.documentType,
          status: "pending",
          submittedAt: stamp(),
          reviewReadyAt: now() + 2500,
          outcome: a.demoOutcome,
        };
        result = db.verification;
        break;
      case "matches":
        matchGate(db);
        result = matchFixtures.filter(
          (m) =>
            (!a.city || m.city === a.city) &&
            (!a.minAge || m.age >= a.minAge) &&
            (!a.maxAge || m.age <= a.maxAge) &&
            (!a.query ||
              (m.name + " " + m.occupation)
                .toLowerCase()
                .includes(String(a.query).toLowerCase())),
        );
        break;
      case "match":
        matchGate(db);
        result = getMatch(a.id);
        break;
      case "favorite":
        matchGate(db);
        getMatch(a.matchId);
        db.favorites = db.favorites.filter((id) => id !== a.matchId);
        if (a.saved) db.favorites.push(a.matchId);
        result = { matchId: a.matchId, saved: !!a.saved };
        break;
      case "favorites":
        matchGate(db);
        result = matchFixtures.filter((m) => db.favorites.includes(m.id));
        break;
      case "interest": {
        matchGate(db);
        getMatch(a.matchId);
        let interest = db.interests.find((i) => i.matchId === a.matchId);
        if (!interest) {
          interest = {
            id: "interest_" + id(),
            matchId: a.matchId,
            status: "sent",
            createdAt: stamp(),
          };
          db.interests.push(interest);
        }
        interest.status = a.withdraw ? "withdrawn" : "sent";
        result = interest;
        break;
      }
      case "interests":
        matchGate(db);
        result = db.interests;
        break;
      default:
        fail("UNKNOWN_OPERATION", "Unsupported API operation.");
    }
    return result as Output<Operation>;
  }
  return {
    setScenario(value) {
      scenario = value;
    },
    call<K extends Operation>(op: K, input: Input<K>, key?: string) {
      const task = async () => {
        const mode = scenario;
        if (mode === "error_once") scenario = "normal";
        await new Promise((r) =>
          setTimeout(r, options.delayMs ?? (mode === "slow" ? 1500 : 220)),
        );
        if (mode === "offline")
          fail(
            "NETWORK_OFFLINE",
            "You are offline in this demo. Switch to Normal in Demo controls, then retry.",
            true,
          );
        if (mode === "error_once")
          fail(
            "SERVICE_UNAVAILABLE",
            "The demo service could not finish this request. Retry to continue.",
            true,
          );
        const db = JSON.parse(JSON.stringify(read())) as Database;
        const before = JSON.stringify(db);
        const fingerprint = JSON.stringify({ op, input });
        const ledgerKey = op + ":" + key;
        if (routes[op].write) {
          if (!key) fail("IDEMPOTENCY_REQUIRED", "A request key is required.");
          const previous = db.ledger.find((l) => l.key === ledgerKey);
          if (previous) {
            if (previous.fingerprint !== fingerprint)
              fail(
                "IDEMPOTENCY_CONFLICT",
                "This request key was already used for different input.",
              );
            return {
              data: previous.data as Output<K>,
              meta: {
                requestId: "req_" + id(),
                source: "mock" as const,
                localeUsed: db.preferences.language,
                fallback: db.preferences.language !== "en",
              },
            };
          }
        }
        const data = handle(db, { operation: op, input } as ApiRequest);
        if (routes[op].write) {
          db.ledger.push({
            key: ledgerKey,
            fingerprint,
            data: JSON.parse(JSON.stringify(data)),
          });
          if (db.ledger.length > 250) db.ledger.shift();
        }
        if (JSON.stringify(db) !== before) {
          db.revision++;
          try {
            await commit(db);
          } catch {
            fail(
              "STORAGE_FAILED",
              "Could not save this change. Your input is kept; retry before leaving.",
              true,
            );
          }
        }
        return {
          data: JSON.parse(JSON.stringify(data)) as Output<K>,
          meta: {
            requestId: "req_" + id(),
            source: "mock" as const,
            localeUsed: db.preferences.language,
            fallback: db.preferences.language !== "en",
          },
        };
      };
      const result = tail.then(task, task);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
