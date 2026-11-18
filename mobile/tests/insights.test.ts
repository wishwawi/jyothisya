import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockApi } from "../src/api/mock";
import { decodeDatabase, freshDatabase } from "../src/api/database";
import { sampleDraft } from "../src/model";
import { ApiError, type Input, type Operation } from "../src/api/contracts";
import { requestParts } from "../src/api/routes";
import { reportHtml } from "../src/reports/html";

function harness() {
  let db = freshDatabase();
  let time = Date.parse("2026-11-18T10:00:00Z");
  let sequence = 0;
  let failWrite = false;
  const api = createMockApi(
    () => db,
    async (next) => {
      if (failWrite) throw Error("disk full");
      db = next;
    },
    { delayMs: 0, now: () => time },
  );
  const call = <K extends Operation>(
    op: K,
    input: Input<K>,
    key = `insight_${++sequence}`,
  ) => api.call(op, input, key).then((r) => r.data);
  return {
    api,
    call,
    get db() {
      return db;
    },
    setTime: (v: string) => {
      time = Date.parse(v);
    },
    failWrite: (v: boolean) => {
      failWrite = v;
    },
  };
}
const code = (value: string) => (e: unknown) =>
  e instanceof ApiError && e.code === value;
async function setup(premium = true) {
  const h = harness();
  const p = await h.call("createProfile", {
    draft: { ...sampleDraft, placeId: "kandy" },
  });
  if (premium) {
    const order = await h.call("createPurchase", { productId: "graha" });
    await h.call("verifyPurchase", {
      id: order.id,
      proof: { kind: "demo", outcome: "approved" },
    });
  }
  return { ...h, h, p };
}
const draft = {
  statement: "I will complete the course",
  criteria: "A dated course completion certificate",
  targetStart: "2026-11-20",
  targetEnd: "2026-11-21",
};

test("free access allows daily and sensitivity but enforces premium mutations and timeline", async () => {
  const { h, p } = await setup(false);
  assert.equal(
    (
      await h.call("tathkala", {
        profileId: p.id,
        localDate: "2026-11-19",
        localTime: "09:30",
        placeId: "london",
      })
    ).timezone,
    "Europe/London",
  );
  const sensitivity = await h.call("birthTimeSensitivity", {
    profileId: p.id,
    uncertaintyMinutes: 15,
  });
  assert.equal(sensitivity.basis.source, "mock");
  assert.deepEqual(
    sensitivity.samples.map((s) => s.offsetMinutes),
    [-15, 0, 15],
  );
  for (const run of [
    () =>
      h.call("timeline", {
        profileId: p.id,
        fromDate: "2020-01-01",
        toDate: "2030-01-01",
      }),
    () => h.call("createPrediction", { profileId: p.id, ...draft }),
    () => h.call("createReport", { profileId: p.id }),
  ])
    await assert.rejects(run(), code("PLAN_REQUIRED"));
  assert.equal(
    (await h.call("journal", { profileId: p.id })).summary.scorePercent,
    null,
  );
  assert.deepEqual(await h.call("reports", { profileId: p.id }), []);
});

test("insight inputs reject invalid dates, times, windows and unsupported uncertainty without writes", async () => {
  const { h, p } = await setup();
  const before = JSON.stringify(h.db);
  for (const date of ["2026-02-30", "2026-13-01", "no date", "1800-01-01"]) {
    await assert.rejects(
      h.call("tathkala", {
        profileId: p.id,
        localDate: date,
        localTime: "12:00",
        placeId: "colombo",
      }),
      code("VALIDATION"),
    );
  }
  await assert.rejects(
    h.call("tathkala", {
      profileId: p.id,
      localDate: "2026-11-18",
      localTime: "24:01",
      placeId: "colombo",
    }),
    code("VALIDATION"),
  );
  await assert.rejects(
    h.call("birthTimeSensitivity", { profileId: p.id, uncertaintyMinutes: 0 }),
    code("VALIDATION"),
  );
  await assert.rejects(
    h.call("timeline", {
      profileId: p.id,
      fromDate: "2030-01-01",
      toDate: "2020-01-01",
    }),
    code("VALIDATION"),
  );
  await assert.rejects(
    h.call("createPrediction", {
      profileId: p.id,
      ...draft,
      targetStart: "2026-11-18",
    }),
    code("VALIDATION"),
  );
  await assert.rejects(
    h.call("createPrediction", {
      profileId: p.id,
      ...draft,
      targetEnd: "2026-11-19",
    }),
    code("VALIDATION"),
  );
  await assert.rejects(
    h.call("createPrediction", { profileId: p.id, ...draft, criteria: " " }),
    code("VALIDATION"),
  );
  assert.equal(JSON.stringify(h.db), before);
});

test("journal locks basis and target timezone, waits for the entire window, and replays exact reviews", async () => {
  const { h, p } = await setup();
  await h.call("preferences", { timingPlaceId: "london" });
  const entry = await h.call(
    "createPrediction",
    { profileId: p.id, ...draft },
    "prediction-create",
  );
  assert.equal(entry.timezone, "Europe/London");
  assert.deepEqual(
    await h.call(
      "createPrediction",
      { profileId: p.id, ...draft },
      "prediction-create",
    ),
    entry,
  );
  await h.call("updateProfile", {
    profileId: p.id,
    revision: 1,
    draft: { ...sampleDraft, time: "09:31" },
  });
  assert.equal(h.db.predictions[0].chartSnapshotId, entry.chartSnapshotId);
  await h.call("preferences", { timingPlaceId: "colombo" });
  h.setTime("2026-11-21T23:59:59Z");
  await assert.rejects(
    h.call("reviewPrediction", {
      id: entry.id,
      outcome: "hit",
      notes: "Certificate received",
    }),
    code("REVIEW_NOT_DUE"),
  );
  h.setTime("2026-11-22T00:00:00Z");
  const input = {
    id: entry.id,
    outcome: "hit" as const,
    notes: "Certificate received on November 21",
  };
  const reviewed = await h.call("reviewPrediction", input, "review-key");
  assert.deepEqual(
    await h.call("reviewPrediction", input, "review-key"),
    reviewed,
  );
  await assert.rejects(
    h.call("reviewPrediction", { ...input, outcome: "miss" }, "review-key"),
    code("IDEMPOTENCY_CONFLICT"),
  );
  await assert.rejects(
    h.call("reviewPrediction", input),
    code("ALREADY_REVIEWED"),
  );
  assert.equal(
    (await h.call("journal", { profileId: p.id })).summary.scorePercent,
    100,
  );
  assert.equal(decodeDatabase(JSON.stringify(h.db)).predictions.length, 1);
});

test("journal scores exclude unreviewed entries and report snapshots survive later edits and reviews", async () => {
  const { h, p } = await setup();
  const entries = [];
  for (let i = 0; i < 4; i++)
    entries.push(
      await h.call("createPrediction", {
        ...draft,
        profileId: p.id,
        statement: `Prediction ${i}`,
      }),
    );
  h.setTime("2026-11-23T00:00:00Z");
  await h.call("reviewPrediction", {
    id: entries[0].id,
    outcome: "hit",
    notes: "Exact result occurred",
  });
  await h.call("reviewPrediction", {
    id: entries[1].id,
    outcome: "partial",
    notes: "Only part occurred",
  });
  await h.call("reviewPrediction", {
    id: entries[2].id,
    outcome: "miss",
    notes: "Did not occur",
  });
  const journal = await h.call("journal", { profileId: p.id });
  assert.deepEqual(journal.summary, {
    total: 4,
    reviewed: 3,
    hits: 1,
    partials: 1,
    misses: 1,
    due: 1,
    scorePercent: 50,
  });
  const report = await h.call(
    "createReport",
    { profileId: p.id },
    "report-create",
  );
  await h.call("reviewPrediction", {
    id: entries[3].id,
    outcome: "miss",
    notes: "Window ended without event",
  });
  await h.call("updateProfile", {
    profileId: p.id,
    revision: 1,
    draft: { ...sampleDraft, name: "Changed name" },
  });
  assert.deepEqual(await h.call("report", { id: report.id }), report);
  assert.deepEqual(
    await h.call("createReport", { profileId: p.id }, "report-create"),
    report,
  );
  assert.equal(report.profile.name, p.name);
  assert.equal(decodeDatabase(JSON.stringify(h.db)).reports.length, 1);
});

test("insight storage migrates absent collections and rejects malformed records", async () => {
  const { h, p } = await setup();
  const old = JSON.parse(JSON.stringify(h.db));
  delete old.predictions;
  delete old.reports;
  const migrated = decodeDatabase(JSON.stringify(old));
  assert.deepEqual(migrated.predictions, []);
  assert.deepEqual(migrated.reports, []);
  await h.call("createPrediction", { profileId: p.id, ...draft });
  for (const corrupt of [
    { ...h.db, predictions: null },
    {
      ...h.db,
      predictions: [{ ...h.db.predictions[0], chartSnapshotId: "foreign" }],
    },
    {
      ...h.db,
      predictions: [{ ...h.db.predictions[0], timezone: "not/a-zone" }],
    },
    {
      ...h.db,
      predictions: [
        {
          ...h.db.predictions[0],
          review: {
            outcome: "hit",
            notes: "early",
            reviewedAt: "2026-11-18T00:00:00Z",
          },
        },
      ],
    },
    { ...h.db, reports: [{ id: "broken" }] },
  ])
    assert.throws(() => decodeDatabase(JSON.stringify(corrupt)));
});

test("failed insight writes publish nothing; other profiles cannot inherit journal entries", async () => {
  const { h, p } = await setup();
  h.failWrite(true);
  await assert.rejects(
    h.call(
      "createPrediction",
      { profileId: p.id, ...draft },
      "retry-after-disk",
    ),
    code("STORAGE_FAILED"),
  );
  assert.equal(h.db.predictions.length, 0);
  h.failWrite(false);
  await h.call(
    "createPrediction",
    { profileId: p.id, ...draft },
    "retry-after-disk",
  );
  const purchase = await h.call("createPurchase", {
    productId: "extra_profile",
    draft: { ...sampleDraft, name: "Another person" },
  });
  const fulfilled = await h.call("verifyPurchase", {
    id: purchase.id,
    proof: { kind: "demo", outcome: "approved" },
  });
  assert.equal(
    (await h.call("journal", { profileId: fulfilled.profileId! })).summary
      .total,
    0,
  );
  assert.equal((await h.call("journal", { profileId: p.id })).summary.total, 1);
});

test("timeline filters by overlapping ranges; reports escape all user text; routes preserve parameter placement", async () => {
  const { h, p } = await setup();
  const timeline = await h.call("timeline", {
    profileId: p.id,
    fromDate: "2027-01-01",
    toDate: "2027-12-31",
  });
  assert.equal(timeline.events.length, 2);
  assert.ok(
    timeline.events.every(
      (e) => e.startDate <= "2027-12-31" && e.endDate >= "2027-01-01",
    ),
  );
  await h.call("updateProfile", {
    profileId: p.id,
    revision: 1,
    draft: { ...sampleDraft, name: '<script>alert("x")</script>' },
  });
  const report = await h.call("createReport", { profileId: p.id });
  const html = reportHtml(report);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("@page"));
  assert.equal(
    requestParts("tathkala", {
      profileId: "p/1",
      localDate: "2026-11-19",
      localTime: "12:00",
      placeId: "kandy",
    }).path,
    "/profiles/p%2F1/tathkala?localDate=2026-11-19&localTime=12%3A00&placeId=kandy",
  );
  assert.deepEqual(
    requestParts("reviewPrediction", {
      id: "a/b",
      outcome: "miss",
      notes: "Nothing occurred",
    }).body,
    { outcome: "miss", notes: "Nothing occurred" },
  );
});
