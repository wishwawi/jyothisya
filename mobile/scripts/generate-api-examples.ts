import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { freshDatabase } from "../src/api/database";
import { createMockApi } from "../src/api/mock";
import { routes, requestParts } from "../src/api/routes";
import { sampleDraft } from "../src/model";
import type { Input, Operation } from "../src/api/contracts";
async function main() {
  let db = freshDatabase(),
    i = 0,
    time = Date.parse("2026-11-16T00:00:00Z");
  const api = createMockApi(
    () => db,
    async (next) => {
      db = next;
    },
    { delayMs: 0, now: () => time },
  );
  const root = resolve("..", "docs", "backend", "nekath-api-examples");
  await mkdir(root, { recursive: true });
  const catalog: Record<string, unknown> = {};
  async function capture<K extends Operation>(op: K, input: Input<K>) {
    const key = "example_" + ++i,
      response = await api.call(op, input, key),
      request = requestParts(op, input);
    const example = {
      operation: op,
      request: {
        method: request.method,
        path: "/v1" + request.path,
        headers: {
          Authorization: "Bearer <access-token>",
          ...(request.write ? { "Idempotency-Key": key } : {}),
        },
        ...(request.body === undefined ? {} : { body: request.body }),
      },
      response,
    };
    await writeFile(
      resolve(root, op + ".json"),
      JSON.stringify(example, null, 2) + "\n",
    );
    catalog[op] = { ...routes[op], example: `nekath-api-examples/${op}.json` };
    return response.data;
  }
  await capture("bootstrap", {});
  await capture("places", { query: "Kandy" });
  await capture("preferences", { language: "en", timingPlaceId: "colombo" });
  const p = await capture("createProfile", {
    draft: { ...sampleDraft, placeId: "kandy" },
  });
  await capture("profiles", { includeArchived: true });
  await capture("selectProfile", { profileId: p.id });
  await capture("home", { profileId: p.id });
  const chart = await capture("chart", { profileId: p.id, kind: "rasi" });
  const saved = await capture("saveChart", {
    profileId: p.id,
    snapshotId: chart.id,
    title: "Original birth chart",
  });
  await capture("savedCharts", { profileId: p.id });
  await capture("removeSavedChart", { id: saved.id });
  const reading = await capture("createReading", {
    profileId: p.id,
    category: "love",
  });
  await capture("reading", { id: reading.id });
  await capture("products", {});
  const order = await capture("createPurchase", { productId: "graha" });
  await capture("purchase", { id: order.id });
  await capture("verifyPurchase", {
    id: order.id,
    proof: { kind: "demo", outcome: "approved" },
  });
  const cancelled = await api.call(
    "createPurchase",
    { productId: "questions_5" },
    "cancel-example",
  );
  await capture("cancelPurchase", { id: cancelled.data.id });
  await capture("purchases", {});
  const chat = await capture("createConversation", {
    profileId: p.id,
    chartSnapshotId: chart.id,
  });
  await capture("sendMessage", {
    conversationId: chat.id,
    text: "What does Lagna mean?",
  });
  await capture("conversation", { id: chat.id });
  await capture("conversations", { profileId: p.id });
  await capture("daily", {
    profileId: p.id,
    localDate: "2026-11-16",
    placeId: "colombo",
  });
  await capture("submitVerification", {
    documentType: "NIC",
    documentFixtureId: "demo-document",
    selfieFixtureId: "demo-selfie",
    demoOutcome: "verified",
  });
  time += 3000;
  await capture("verification", {});
  const matches = await capture("matches", {
    city: "Colombo",
    minAge: 30,
    maxAge: 35,
  });
  await capture("match", { id: matches[0].id });
  await capture("favorite", { matchId: matches[0].id, saved: true });
  await capture("favorites", {});
  await capture("interest", { matchId: matches[0].id });
  await capture("interests", {});
  await capture("updateProfile", {
    profileId: p.id,
    revision: p.revision,
    draft: { ...sampleDraft, name: "Nimali Updated", placeId: "kandy" },
  });
  await capture("archiveProfile", { profileId: p.id, archived: true });
  if (Object.keys(catalog).length !== Object.keys(routes).length)
    throw Error("Missing operation examples");
  await writeFile(
    resolve(root, "..", "NEKATH-API-CATALOG.json"),
    JSON.stringify(
      { version: "v1-proposed", transport: "mock-only", operations: catalog },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Wrote ${Object.keys(catalog).length} request/response examples.`,
  );
}
void main();
