import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
/**
 * Builds docs/backend/openapi.json from the generated catalog and examples.
 * Schemas are inferred from the real mock responses, so run `yarn api:examples`
 * first. Inferred schemas list the fields present in the example; enums and
 * optional fields are described in docs/backend/INSIGHTS-API.md.
 */
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function schema(v: Json): Record<string, unknown> {
  if (v === null) return { nullable: true };
  if (Array.isArray(v))
    return { type: "array", items: v.length ? schema(v[0]) : {} };
  if (typeof v === "object")
    return {
      type: "object",
      required: Object.keys(v),
      properties: Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, schema(x)]),
      ),
    };
  if (typeof v === "number")
    return { type: Number.isInteger(v) ? "integer" : "number" };
  return { type: typeof v };
}
async function main() {
  const docs = resolve("..", "docs", "backend");
  const catalog = JSON.parse(
    await readFile(resolve(docs, "NEKATH-API-CATALOG.json"), "utf8"),
  );
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [op, cfg] of Object.entries<any>(catalog.operations)) {
    const ex = JSON.parse(await readFile(resolve(docs, cfg.example), "utf8"));
    const path = (cfg.path as string).replace(/:([A-Za-z]+)/g, "{$1}");
    const params = [...(cfg.path as string).matchAll(/:([A-Za-z]+)/g)].map(
      (m) => ({
        name: m[1],
        in: "path",
        required: true,
        schema: { type: "string" },
      }),
    );
    const body = ex.request.body;
    if (cfg.method === "GET" && ex.request.path.includes("?"))
      for (const [k, v] of new URLSearchParams(ex.request.path.split("?")[1]))
        params.push({
          name: k,
          in: "query",
          required: true,
          schema: { type: /^\d+$/.test(v) ? "integer" : "string" },
        });
    if (cfg.write)
      params.push({
        name: "Idempotency-Key",
        in: "header",
        required: true,
        schema: { type: "string" },
      } as never);
    (paths[path] ??= {})[cfg.method.toLowerCase()] = {
      operationId: op,
      summary: op,
      parameters: params,
      ...(body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": { schema: schema(body), example: body },
              },
            },
          }
        : {}),
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: schema(ex.response),
              example: ex.response,
            },
          },
        },
        default: {
          description: "Error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      security: [{ bearer: [] }],
    };
  }
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Nekath API (proposed v1)",
      version: "v1-proposed",
      description:
        "Generated from the frontend mock. Responses are Envelope<T>: { data, meta{requestId,source,localeUsed,fallback} }. Writes require Idempotency-Key. Auth and entitlements are not yet specified; see docs/backend/INSIGHTS-API.md.",
    },
    servers: [{ url: "/v1" }],
    paths,
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "retryable"],
              properties: {
                code: {
                  type: "string",
                  description:
                    "VALIDATION, NOT_FOUND, PLAN_REQUIRED, REVIEW_NOT_DUE, ALREADY_REVIEWED, IDEMPOTENCY_REQUIRED, IDEMPOTENCY_CONFLICT, STORAGE_FAILED, ...",
                },
                message: { type: "string" },
                retryable: { type: "boolean" },
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  await writeFile(
    resolve(docs, "openapi.json"),
    JSON.stringify(spec, null, 2) + "\n",
  );
  console.log(
    `Wrote OpenAPI with ${Object.keys(catalog.operations).length} operations.`,
  );
}
void main();
