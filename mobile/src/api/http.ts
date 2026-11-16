import {
  ApiError,
  type Api,
  type Envelope,
  type Input,
  type Operation,
  type Output,
} from "./contracts";
import { requestParts } from "./routes";
/** Not enabled in the app. Supply a real backend and token provider explicitly. */
export function createHttpApi(options: {
  baseUrl: string;
  accessToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
}): Api {
  const transport = options.fetchImpl ?? fetch;
  return {
    setScenario() {
      throw new ApiError(
        "DEMO_ONLY",
        "Demo controls are unavailable on a real transport.",
      );
    },
    async call<K extends Operation>(
      op: K,
      input: Input<K>,
      key?: string,
    ): Promise<Envelope<Output<K>>> {
      if (
        op === "verifyPurchase" &&
        (input as Input<"verifyPurchase">).proof.kind === "demo"
      )
        throw new ApiError(
          "DEMO_PROOF_FORBIDDEN",
          "Demo purchase proofs cannot be sent to a real backend.",
        );
      if (op === "submitVerification")
        throw new ApiError(
          "DEMO_MEDIA_FORBIDDEN",
          "Replace sample media with a real upload and verification contract before enabling this operation.",
        );
      const request = requestParts(op, input);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await transport(
          options.baseUrl.replace(/\/$/, "") + "/v1" + request.path,
          {
            method: request.method,
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + (await options.accessToken()),
              ...(key ? { "Idempotency-Key": key } : {}),
            },
            body:
              request.body === undefined
                ? undefined
                : JSON.stringify(request.body),
            signal: controller.signal,
          },
        );
        const payload = await response.json();
        if (!response.ok)
          throw new ApiError(
            payload.error?.code ?? "HTTP_ERROR",
            payload.error?.message ?? "The request failed.",
            !!payload.error?.retryable,
            payload.error?.fields,
          );
        if (
          !payload ||
          !Object.hasOwn(payload, "data") ||
          !payload.meta ||
          payload.meta.source !== "live"
        )
          throw new ApiError(
            "INVALID_RESPONSE",
            "The server returned an unexpected response.",
          );
        return payload as Envelope<Output<K>>;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(
          "NETWORK_ERROR",
          "Unable to reach the service. Please retry.",
          true,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
