import type { Operation } from "./contracts";
export const routes: Record<
  Operation,
  { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; write?: boolean }
> = {
  tathkala: { method: "GET", path: "/profiles/:profileId/tathkala" },
  timeline: { method: "GET", path: "/profiles/:profileId/timeline" },
  birthTimeSensitivity: {
    method: "GET",
    path: "/profiles/:profileId/birth-time-sensitivity",
  },
  journal: { method: "GET", path: "/profiles/:profileId/predictions" },
  createPrediction: {
    method: "POST",
    path: "/profiles/:profileId/predictions",
    write: true,
  },
  reviewPrediction: {
    method: "POST",
    path: "/predictions/:id/review",
    write: true,
  },
  reports: { method: "GET", path: "/profiles/:profileId/reports" },
  createReport: {
    method: "POST",
    path: "/profiles/:profileId/reports",
    write: true,
  },
  report: { method: "GET", path: "/reports/:id" },
  bootstrap: { method: "GET", path: "/bootstrap" },
  places: { method: "GET", path: "/places" },
  preferences: { method: "PATCH", path: "/me/preferences", write: true },
  profiles: { method: "GET", path: "/profiles" },
  createProfile: { method: "POST", path: "/profiles", write: true },
  updateProfile: { method: "PATCH", path: "/profiles/:profileId", write: true },
  selectProfile: { method: "POST", path: "/me/active-profile", write: true },
  archiveProfile: {
    method: "PATCH",
    path: "/profiles/:profileId/archive",
    write: true,
  },
  home: { method: "GET", path: "/profiles/:profileId/home" },
  chart: { method: "GET", path: "/profiles/:profileId/charts/:kind" },
  saveChart: {
    method: "POST",
    path: "/profiles/:profileId/saved-charts",
    write: true,
  },
  savedCharts: { method: "GET", path: "/profiles/:profileId/saved-charts" },
  removeSavedChart: {
    method: "DELETE",
    path: "/saved-charts/:id",
    write: true,
  },
  createReading: { method: "POST", path: "/readings", write: true },
  reading: { method: "GET", path: "/readings/:id" },
  products: { method: "GET", path: "/billing/products" },
  createPurchase: { method: "POST", path: "/purchases", write: true },
  purchase: { method: "GET", path: "/purchases/:id" },
  purchases: { method: "GET", path: "/purchases" },
  verifyPurchase: {
    method: "POST",
    path: "/purchases/:id/verify",
    write: true,
  },
  cancelPurchase: {
    method: "POST",
    path: "/purchases/:id/cancel",
    write: true,
  },
  conversations: { method: "GET", path: "/profiles/:profileId/conversations" },
  createConversation: { method: "POST", path: "/conversations", write: true },
  conversation: { method: "GET", path: "/conversations/:id" },
  sendMessage: {
    method: "POST",
    path: "/conversations/:conversationId/messages",
    write: true,
  },
  daily: { method: "GET", path: "/profiles/:profileId/daily" },
  verification: { method: "GET", path: "/me/verification" },
  submitVerification: { method: "POST", path: "/me/verification", write: true },
  matches: { method: "GET", path: "/matches" },
  match: { method: "GET", path: "/matches/:id" },
  favorite: { method: "POST", path: "/favorites", write: true },
  favorites: { method: "GET", path: "/favorites" },
  interest: { method: "POST", path: "/interests", write: true },
  interests: { method: "GET", path: "/interests" },
};
export function requestParts(operation: Operation, input: object) {
  const cfg = routes[operation];
  const rest = { ...input } as Record<string, unknown>;
  const path = cfg.path.replace(/:([A-Za-z]+)/g, (_, name: string) => {
    const value = rest[name];
    delete rest[name];
    return encodeURIComponent(String(value));
  });
  const query =
    cfg.method === "GET"
      ? Object.entries(rest)
          .filter(([, v]) => v !== undefined)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
          )
          .join("&")
      : "";
  return {
    ...cfg,
    path: path + (query ? "?" + query : ""),
    body: cfg.method === "GET" ? undefined : rest,
  };
}
