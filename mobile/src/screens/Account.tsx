import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useAction, useQuery } from "../api/hooks";
import type { DemoProof, Product, Scenario } from "../api/contracts";
import {
  ActionState,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Languages,
  Note,
  Page,
  QueryState,
  Txt,
} from "../ui";
export function money(product: Product) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: product.currency,
    maximumFractionDigits: 0,
  }).format(product.amountMinor / 100);
}
export function Profile() {
  const { api, state } = useNekath();
  const query = useQuery("profiles", () =>
    api.call("profiles", { includeArchived: true }),
  );
  const action = useAction();
  return (
    <Page title="Profile" back>
      <QueryState query={query}>
        {(profiles) => (
          <>
            {profiles.length ? (
              profiles.map((p) => (
                <Card key={p.id}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <Txt heading size={24} style={{ flex: 1 }}>
                      {p.name}
                    </Txt>
                    {p.archived ? (
                      <Badge text="Archived" />
                    ) : state.activeId === p.id ? (
                      <Badge text="Selected" green />
                    ) : null}
                  </View>
                  <Txt muted size={13}>
                    {p.dob} · {p.time} · {p.place}
                  </Txt>
                  <Txt muted size={12}>
                    Revision {p.revision}
                  </Txt>
                  {p.archived ? (
                    <Button
                      title="Restore profile"
                      secondary
                      disabled={action.busy}
                      onPress={() =>
                        action.run((key) =>
                          api.call(
                            "archiveProfile",
                            { profileId: p.id, archived: false },
                            key,
                          ),
                        )
                      }
                    />
                  ) : (
                    <>
                      <Button
                        title="Use this profile"
                        disabled={action.busy}
                        onPress={() =>
                          action.run(
                            (key) =>
                              api.call(
                                "selectProfile",
                                { profileId: p.id },
                                key,
                              ),
                            () => router.replace("/(tabs)/home"),
                          )
                        }
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Edit details"
                            secondary
                            onPress={() =>
                              router.push({
                                pathname: "/birth",
                                params: { profileId: p.id },
                              })
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Saved charts"
                            secondary
                            onPress={() =>
                              router.push({
                                pathname: "/saved-charts",
                                params: { profileId: p.id },
                              })
                            }
                          />
                        </View>
                      </View>
                      <Button
                        title="Archive profile"
                        secondary
                        disabled={action.busy}
                        onPress={() =>
                          action.run((key) =>
                            api.call(
                              "archiveProfile",
                              { profileId: p.id, archived: true },
                              key,
                            ),
                          )
                        }
                      />
                    </>
                  )}
                </Card>
              ))
            ) : (
              <EmptyState
                title="No saved profiles"
                body="Create your first person profile free."
              />
            )}
            <ActionState action={action} />
            <Button
              title="Add another profile"
              icon="add-outline"
              onPress={() => router.push("/birth")}
            />
          </>
        )}
      </QueryState>
      <Card>
        <Txt heading size={23}>
          {state.plan === "free"
            ? "Free"
            : state.plan === "graha"
              ? "Graha"
              : "Jyotisha"}{" "}
          plan
        </Txt>
        <Txt>{state.questionCredits} question credits remaining</Txt>
        <Button
          title="Plans and question credits"
          onPress={() => router.push("/plans")}
        />
        <Button
          title="Purchase history"
          secondary
          onPress={() => router.push("/purchases")}
        />
      </Card>
      <Button
        title="Saved Matrimony profiles"
        secondary
        onPress={() => router.push("/favorites")}
      />
      <Button
        title="Language, timing location and demo controls"
        secondary
        onPress={() => router.push("/settings")}
      />
    </Page>
  );
}
export function Plans() {
  const { state, api } = useNekath();
  const query = useQuery("products", () => api.call("products", {}));
  const action = useAction();
  return (
    <Page
      title="Choose a plan"
      subtitle="One-time purchases. Profile creation and question credits are separate."
      back
    >
      <Txt muted size={13}>
        Demo prices · no real money is charged
      </Txt>
      <QueryState query={query}>
        {(products) =>
          products
            .filter((p) => p.id !== "extra_profile")
            .map((product) => {
              const owned =
                product.id === "graha"
                  ? state.plan !== "free"
                  : product.id === "jyotisha"
                    ? state.plan === "jyotisha"
                    : false;
              return (
                <Card key={product.id}>
                  <Txt heading size={28}>
                    {product.title}
                  </Txt>
                  <Txt heading size={30}>
                    {money(product)}
                  </Txt>
                  {product.description.map((item) => (
                    <Txt key={item}>✓ {item}</Txt>
                  ))}
                  <Button
                    title={
                      owned
                        ? "Included in your plan"
                        : product.id === "questions_5"
                          ? "Add 5 question credits"
                          : "Continue"
                    }
                    disabled={action.busy || owned}
                    onPress={() =>
                      action.run(
                        (key) =>
                          api.call(
                            "createPurchase",
                            { productId: product.id },
                            key,
                          ),
                        (result) =>
                          router.push({
                            pathname: "/checkout",
                            params: { id: result.data.id },
                          }),
                      )
                    }
                  />
                </Card>
              );
            })
        }
      </QueryState>
      <ActionState action={action} />
      <Txt muted size={13}>
        Current balance: {state.questionCredits} questions. Question credits are
        consumed only when an answer is saved.
      </Txt>
    </Page>
  );
}
export function Checkout() {
  const { api } = useNekath(),
    params = useLocalSearchParams<{ id: string }>();
  const query = useQuery("purchase:" + params.id, () =>
    api.call("purchase", { id: params.id }),
  );
  const [outcome, setOutcome] = useState<DemoProof["outcome"]>("approved");
  const action = useAction();
  return (
    <Page title="Checkout" back>
      <Note>
        This is a simulated purchase. No store or payment provider is contacted.
      </Note>
      <QueryState query={query}>
        {(purchase) => (
          <>
            <Card>
              <Txt heading size={27}>
                {purchase.product.title}
              </Txt>
              <Txt heading size={30}>
                {money(purchase.product)}
              </Txt>
              <Badge
                text={purchase.status.replaceAll("_", " ")}
                green={purchase.status === "fulfilled"}
              />
              {purchase.draft ? (
                <Txt>
                  New profile: {purchase.draft.name} · {purchase.draft.dob}
                </Txt>
              ) : null}
              {purchase.product.description.map((item) => (
                <Txt key={item}>{item}</Txt>
              ))}
            </Card>
            {purchase.status === "fulfilled" ? (
              <>
                <Card>
                  <Txt heading size={24}>
                    Purchase complete
                  </Txt>
                  <Txt>
                    {purchase.profileId
                      ? "Your additional profile is saved."
                      : "Your plan and credits are available."}
                  </Txt>
                </Card>
                <Button
                  title={
                    purchase.profileId ? "Open new profile" : "Continue to Home"
                  }
                  onPress={() => router.replace("/(tabs)/home")}
                />
              </>
            ) : purchase.status === "cancelled" ? (
              <>
                <EmptyState
                  title="Purchase cancelled"
                  body="No profile or credits were allocated. You can start again from Plans or Add profile."
                />
                <Button
                  title="Return to Home"
                  onPress={() => router.replace("/(tabs)/home")}
                />
              </>
            ) : (
              <>
                {purchase.failureReason ? (
                  <Note>{purchase.failureReason}</Note>
                ) : null}
                {purchase.status === "pending" ? (
                  <Note>
                    Approval is pending. Your purchase is saved; resume it here
                    or through purchase history.
                  </Note>
                ) : null}
                <Txt bold>Demo purchase outcome</Txt>
                <View
                  style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
                >
                  {(["approved", "pending", "declined"] as const).map(
                    (value) => (
                      <Chip
                        key={value}
                        title={
                          value === "approved"
                            ? "Approve"
                            : value === "pending"
                              ? "Pending"
                              : "Decline"
                        }
                        selected={outcome === value}
                        onPress={() => setOutcome(value)}
                      />
                    ),
                  )}
                </View>
                <Button
                  title={
                    purchase.status === "pending"
                      ? "Check demo approval"
                      : purchase.status === "failed"
                        ? "Retry demo purchase"
                        : "Confirm demo purchase"
                  }
                  disabled={action.busy}
                  onPress={() =>
                    action.run((key) =>
                      api.call(
                        "verifyPurchase",
                        { id: purchase.id, proof: { kind: "demo", outcome } },
                        key,
                      ),
                    )
                  }
                />
                <Button
                  title="Cancel purchase"
                  secondary
                  disabled={action.busy}
                  onPress={() =>
                    action.run((key) =>
                      api.call("cancelPurchase", { id: purchase.id }, key),
                    )
                  }
                />
              </>
            )}
            <ActionState action={action} />
          </>
        )}
      </QueryState>
    </Page>
  );
}
export function Purchases() {
  const { api } = useNekath();
  const query = useQuery("purchases", () => api.call("purchases", {}));
  return (
    <Page title="Purchase history" back>
      <QueryState query={query}>
        {(rows) =>
          rows.length ? (
            rows.map((p) => (
              <Card key={p.id}>
                <Txt heading size={23}>
                  {p.product.title}
                </Txt>
                <Txt>{money(p.product)}</Txt>
                <Badge
                  text={p.status.replaceAll("_", " ")}
                  green={p.status === "fulfilled"}
                />
                <Txt muted size={12}>
                  {new Date(p.createdAt).toLocaleString()}
                </Txt>
                <Button
                  title={
                    ["pending", "awaiting_confirmation", "failed"].includes(
                      p.status,
                    )
                      ? "Resume purchase"
                      : "View purchase"
                  }
                  secondary
                  onPress={() =>
                    router.push({ pathname: "/checkout", params: { id: p.id } })
                  }
                />
              </Card>
            ))
          ) : (
            <EmptyState
              title="No purchases yet"
              body="Your purchases and pending approvals will appear here."
            />
          )
        }
      </QueryState>
    </Page>
  );
}
export function Settings() {
  const { api, state, scenario, setScenario } = useNekath();
  const query = useQuery("settings:" + scenario, () =>
    api.call("places", { query: "" }),
  );
  const action = useAction();
  return (
    <Page title="Settings" back>
      <Txt heading size={23}>
        Language
      </Txt>
      <Languages />
      <Txt size={13} muted>
        Reading and matching text currently falls back to English when a
        reviewed translation is unavailable.
      </Txt>
      <Txt heading size={23}>
        Daily timing location
      </Txt>
      <QueryState query={query}>
        {(places) => (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {places.map((p) => (
              <Chip
                key={p.id}
                title={p.name}
                selected={state.preferences.timingPlaceId === p.id}
                onPress={() =>
                  action.run((key) =>
                    api.call("preferences", { timingPlaceId: p.id }, key),
                  )
                }
              />
            ))}
          </View>
        )}
      </QueryState>
      <ActionState action={action} />
      <Txt heading size={23}>
        Demo controls
      </Txt>
      <Txt muted>
        Exercise loading and error states without connecting a backend.
      </Txt>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(["normal", "slow", "offline", "error_once"] as Scenario[]).map(
          (mode) => (
            <Chip
              key={mode}
              title={mode.replaceAll("_", " ")}
              selected={scenario === mode}
              onPress={() => setScenario(mode)}
            />
          ),
        )}
      </View>
      <Button
        title="Refresh / test connection"
        secondary
        onPress={query.reload}
      />
      <Note>
        Switch to normal, then Retry on a failed screen. Error once affects the
        next request only. These controls are not part of a live backend.
      </Note>
      <Txt heading size={23}>
        Your data
      </Txt>
      <Txt>
        Profiles, purchases, saved chart snapshots and conversations stay on
        this device. The app uses a local demo account.
      </Txt>
    </Page>
  );
}
