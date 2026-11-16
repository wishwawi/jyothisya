import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockApi } from "../src/api/mock";
import { createHttpApi } from "../src/api/http";
import {
  decodeDatabase,
  freshDatabase,
  migrateLegacy,
} from "../src/api/database";
import { sampleDraft, initialState } from "../src/model";
import { ApiError, type Input, type Operation } from "../src/api/contracts";
import { localDate, shiftDate } from "../src/dates";
function harness() {
  let db = freshDatabase(),
    time = Date.parse("2026-11-16T00:00:00Z"),
    fail = false,
    counter = 0;
  const api = createMockApi(
    () => db,
    async (next) => {
      if (fail) throw Error("disk");
      db = next;
    },
    { delayMs: 0, now: () => time },
  );
  return {
    api,
    get db() {
      return db;
    },
    advance() {
      time += 3000;
    },
    setFail(v: boolean) {
      fail = v;
    },
    call<K extends Operation>(op: K, input: Input<K>) {
      return api.call(op, input, "test_" + ++counter).then((r) => r.data);
    },
  };
}
const hasCode = (code: string) => (e: unknown) =>
  e instanceof ApiError && e.code === code;
async function buy(
  h: ReturnType<typeof harness>,
  productId: Input<"createPurchase">["productId"],
  draft?: Input<"createProfile">["draft"],
) {
  const p = await h.call("createPurchase", { productId, draft });
  return h.call("verifyPurchase", {
    id: p.id,
    proof: { kind: "demo", outcome: "approved" },
  });
}
test("first free claim survives archiving; every additional creation needs an independently fulfilled purchase", async () => {
  const h = harness();
  const p = await h.call("createProfile", { draft: sampleDraft });
  await h.call("archiveProfile", { profileId: p.id, archived: true });
  await assert.rejects(
    h.call("createProfile", { draft: sampleDraft }),
    hasCode("PROFILE_PURCHASE_REQUIRED"),
  );
  const intent = await h.call("createPurchase", {
    productId: "extra_profile",
    draft: { ...sampleDraft, name: "Second" },
  });
  await h.call("verifyPurchase", {
    id: intent.id,
    proof: { kind: "demo", outcome: "pending" },
  });
  assert.equal(h.db.profiles.length, 1);
  await h.call("verifyPurchase", {
    id: intent.id,
    proof: { kind: "demo", outcome: "declined" },
  });
  assert.equal(h.db.profiles.length, 1);
  await Promise.all([
    h.call("verifyPurchase", {
      id: intent.id,
      proof: { kind: "demo", outcome: "approved" },
    }),
    h.call("verifyPurchase", {
      id: intent.id,
      proof: { kind: "demo", outcome: "approved" },
    }),
  ]);
  assert.equal(h.db.profiles.length, 2);
  assert.equal(h.db.profiles[1].name, "Second");
  assert.equal(h.db.plan, "free");
  await h.call("archiveProfile", { profileId: p.id, archived: false });
  assert.equal(h.db.profiles.length, 2);
});
test("purchase cancellation, serial allocation and exact mutation retries", async () => {
  const h = harness();
  await h.call("createProfile", { draft: sampleDraft });
  const p = await h.call("createPurchase", { productId: "questions_5" });
  await h.call("cancelPurchase", { id: p.id });
  await assert.rejects(
    h.call("verifyPurchase", {
      id: p.id,
      proof: { kind: "demo", outcome: "approved" },
    }),
    hasCode("PURCHASE_CANCELLED"),
  );
  const input = { productId: "questions_5" as const };
  const [a, b] = await Promise.all([
    h.api.call("createPurchase", input, "same"),
    h.api.call("createPurchase", input, "same"),
  ]);
  assert.equal(a.data.id, b.data.id);
  await assert.rejects(
    h.api.call("createPurchase", { productId: "graha" }, "same"),
    hasCode("IDEMPOTENCY_CONFLICT"),
  );
  await buy(h, "questions_5");
  const profileId = h.db.activeId!;
  const chat = await h.call("createConversation", { profileId });
  const message = { conversationId: chat.id, text: "Explain Dasha" };
  await Promise.all([
    h.api.call("sendMessage", message, "msg"),
    h.api.call("sendMessage", message, "msg"),
  ]);
  assert.equal(h.db.questionCredits, 4);
  assert.equal(h.db.conversations[0].messages.length, 2);
  await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      h.api
        .call("sendMessage", { ...message, text: "Lagna " + i }, "other" + i)
        .catch((e) => e),
    ),
  );
  assert.equal(h.db.questionCredits, 0);
  assert.equal(h.db.conversations[0].messages.length, 10);
});
test("profile edits preserve saved and conversation basis and enforce optimistic revisions", async () => {
  const h = harness();
  const p = await h.call("createProfile", { draft: sampleDraft });
  const old = await h.call("chart", { profileId: p.id, kind: "rasi" });
  const saved = await h.call("saveChart", {
    profileId: p.id,
    snapshotId: old.id,
    title: "Original",
  });
  await h.call("updateProfile", {
    profileId: p.id,
    revision: 1,
    draft: { ...sampleDraft, name: "Edited" },
  });
  const current = await h.call("chart", { profileId: p.id, kind: "rasi" });
  assert.notEqual(current.id, old.id);
  assert.deepEqual(
    await h.call("chart", {
      profileId: p.id,
      kind: "rasi",
      snapshotId: saved.snapshotId,
    }),
    old,
  );
  const c = await h.call("createConversation", {
    profileId: p.id,
    chartSnapshotId: old.id,
  });
  assert.equal(c.chartSnapshotId, old.id);
  await assert.rejects(
    h.call("updateProfile", {
      profileId: p.id,
      revision: 1,
      draft: sampleDraft,
    }),
    hasCode("REVISION_CONFLICT"),
  );
  await assert.rejects(
    h.call("createConversation", { profileId: p.id, chartSnapshotId: "other" }),
    hasCode("NOT_FOUND"),
  );
  assert.equal(decodeDatabase(JSON.stringify(h.db)).charts.length, 4);
});
test("validation excludes entitlement injection and errors do not publish partial writes", async () => {
  const h = harness();
  await assert.rejects(
    h.api.call("createProfile", { draft: undefined } as never, "bad"),
    hasCode("VALIDATION"),
  );
  h.setFail(true);
  await assert.rejects(
    h.call("createProfile", { draft: sampleDraft }),
    hasCode("STORAGE_FAILED"),
  );
  assert.equal(h.db.profiles.length, 0);
  assert.equal(h.db.freeProfileClaimed, false);
  h.setFail(false);
  const p = await h.call("createProfile", { draft: sampleDraft });
  await h.call("updateProfile", {
    profileId: p.id,
    revision: 1,
    draft: {
      ...sampleDraft,
      id: "injected",
      freeCategory: "love",
      archived: true,
    } as never,
  });
  assert.equal(h.db.profiles[0].id, p.id);
  assert.equal(h.db.profiles[0].freeCategory, undefined);
  assert.equal(h.db.profiles[0].archived, false);
  h.api.setScenario("offline");
  await assert.rejects(h.call("products", {}), hasCode("NETWORK_OFFLINE"));
  h.api.setScenario("error_once");
  await assert.rejects(h.call("products", {}), hasCode("SERVICE_UNAVAILABLE"));
  assert.equal((await h.call("products", {})).length, 4);
});
test("readings gate categories and retain chart evidence", async () => {
  const h = harness();
  const p = await h.call("createProfile", { draft: sampleDraft });
  const reading = await h.call("createReading", {
    profileId: p.id,
    category: "love",
  });
  await assert.rejects(
    h.call("createReading", { profileId: p.id, category: "career" }),
    hasCode("PLAN_REQUIRED"),
  );
  await buy(h, "graha");
  const career = await h.call("createReading", {
    profileId: p.id,
    category: "career",
  });
  assert.equal(career.profileId, p.id);
  assert.ok(reading.factors.every((f) => f.basisRef));
  assert.equal((await h.call("reading", { id: reading.id })).id, reading.id);
});
test("local timing instants use requested zone and validate dates", async () => {
  const h = harness();
  const p = await h.call("createProfile", { draft: sampleDraft });
  for (const [placeId, zone, date] of [
    ["colombo", "Asia/Colombo", "2026-11-16"],
    ["london", "Europe/London", "2027-07-16"],
    ["melbourne", "Australia/Melbourne", "2027-01-16"],
  ]) {
    const d = await h.call("daily", {
      profileId: p.id,
      localDate: date,
      placeId,
    });
    const start = new Date(d.intervals[0].startAt);
    assert.equal(localDate(zone, start), date);
    assert.equal(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(start),
      "10:20",
    );
    assert.ok(Date.parse(d.intervals[0].endAt) > start.getTime());
  }
  await assert.rejects(
    h.call("daily", {
      profileId: p.id,
      localDate: "2026-02-30",
      placeId: "colombo",
    }),
    hasCode("VALIDATION"),
  );
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.doesNotThrow(() => shiftDate("", 1));
});
test("verification gates matching; reject/resubmit, filters, saved members and interests persist", async () => {
  const h = harness();
  await h.call("createProfile", { draft: sampleDraft });
  await assert.rejects(h.call("matches", {}), hasCode("PLAN_REQUIRED"));
  await buy(h, "graha");
  await assert.rejects(h.call("matches", {}), hasCode("VERIFICATION_REQUIRED"));
  const input = {
    documentType: "NIC" as const,
    documentFixtureId: "demo-document" as const,
    selfieFixtureId: "demo-selfie" as const,
  };
  await h.call("submitVerification", { ...input, demoOutcome: "rejected" });
  assert.equal((await h.call("verification", {})).status, "pending");
  h.advance();
  assert.equal((await h.call("verification", {})).status, "rejected");
  await h.call("submitVerification", { ...input, demoOutcome: "verified" });
  h.advance();
  assert.equal((await h.call("verification", {})).status, "verified");
  const matches = await h.call("matches", {
    city: "Colombo",
    minAge: 30,
    maxAge: 35,
  });
  assert.equal(matches.length, 2);
  assert.ok(matches.every((m) => m.city === "Colombo" && m.age >= 30));
  assert.equal((await h.call("matches", { query: "architect" })).length, 1);
  const m = matches[0];
  await h.call("favorite", { matchId: m.id, saved: true });
  await h.call("favorite", { matchId: m.id, saved: true });
  assert.equal((await h.call("favorites", {})).length, 1);
  const interest = await h.call("interest", { matchId: m.id });
  assert.equal((await h.call("interest", { matchId: m.id })).id, interest.id);
  await h.call("interest", { matchId: m.id, withdraw: true });
  assert.equal((await h.call("interests", {}))[0].status, "withdrawn");
  assert.equal(decodeDatabase(JSON.stringify(h.db)).favorites[0], m.id);
});
test("legacy migration retains profiles, chosen category and questions with chart basis", () => {
  const old = {
    ...initialState,
    previewPlan: 1 as const,
    language: "si" as const,
    profiles: [
      {
        ...sampleDraft,
        id: "legacy",
        previewCreation: false,
        freeCategory: "love" as const,
      },
    ],
    activeId: "legacy",
    questions: [
      {
        id: "q",
        profileId: "legacy",
        text: "Lagna?",
        answer: "Example",
        createdAt: "2026-11-15T00:00:00Z",
      },
    ],
  };
  const db = migrateLegacy(JSON.stringify(old));
  assert.equal(db.questionCredits, 2);
  assert.equal(db.preferences.language, "si");
  assert.equal(db.profiles[0].freeCategory, "love");
  assert.equal(db.conversations[0].messages.length, 2);
  assert.ok(
    db.charts.some((c) => c.id === db.conversations[0].chartSnapshotId),
  );
  assert.deepEqual(decodeDatabase(JSON.stringify(db)), db);
  assert.throws(() => decodeDatabase("{broken"));
});
test("HTTP adapter maps path/query/body and rejects demo proofs/media", async () => {
  let url = "",
    init: RequestInit | undefined;
  const api = createHttpApi({
    baseUrl: "https://backend.example/",
    accessToken: async () => "token",
    fetchImpl: (async (u, i) => {
      url = String(u);
      init = i;
      return new Response(
        JSON.stringify({
          data: [],
          meta: {
            source: "live",
            localeUsed: "en",
            fallback: false,
            requestId: "r",
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
  });
  await api.call("daily", {
    profileId: "a/b",
    localDate: "2026-11-16",
    placeId: "colombo",
  });
  assert.equal(
    url,
    "https://backend.example/v1/profiles/a%2Fb/daily?localDate=2026-11-16&placeId=colombo",
  );
  assert.equal(init?.body, undefined);
  await api.call(
    "sendMessage",
    { conversationId: "chat", text: "Lagna?" },
    "key",
  );
  assert.deepEqual(JSON.parse(String(init!.body)), { text: "Lagna?" });
  assert.equal(
    (init?.headers as Record<string, string>)["Idempotency-Key"],
    "key",
  );
  await assert.rejects(
    api.call(
      "verifyPurchase",
      { id: "order", proof: { kind: "demo", outcome: "approved" } },
      "proof",
    ),
    hasCode("DEMO_PROOF_FORBIDDEN"),
  );
  await assert.rejects(
    api.call(
      "submitVerification",
      {
        documentType: "NIC",
        documentFixtureId: "demo-document",
        selfieFixtureId: "demo-selfie",
        demoOutcome: "verified",
      },
      "media",
    ),
    hasCode("DEMO_MEDIA_FORBIDDEN"),
  );
});

test("saved conversation validation rejects missing message fields and invalid evidence", async () => {
  const h = harness();
  const profile = await h.call("createProfile", { draft: sampleDraft });
  await h.call("createConversation", { profileId: profile.id });
  const message = {
    id: "message",
    role: "assistant",
    text: "Saved explanation",
    createdAt: "2026-11-16T00:00:00Z",
    evidenceRefs: [],
  };
  for (const invalid of [
    { ...message, id: undefined },
    { ...message, createdAt: undefined },
    { ...message, evidenceRefs: [123] },
    null,
  ]) {
    const database = structuredClone(h.db);
    (database.conversations[0].messages as unknown[]).push(invalid);
    assert.throws(
      () => decodeDatabase(JSON.stringify(database)),
      /Saved conversation data is invalid/,
    );
  }
});
