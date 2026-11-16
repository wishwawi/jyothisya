import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useNekath } from "../store";
import { useAction, useQuery } from "../api/hooks";
import { localDate, shiftDate } from "../dates";
import { c } from "../theme";
import {
  ActionState,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Ico,
  Note,
  Page,
  ProfileButton,
  QueryState,
  Txt,
} from "../ui";
export function Daily() {
  const { state, api } = useNekath();
  const places = useQuery("daily-places", () =>
    api.call("places", { query: "" }),
  );
  const place = places.data?.find(
    (p) => p.id === state.preferences.timingPlaceId,
  );
  const [date, setDate] = useState(() => localDate("Asia/Colombo"));
  const action = useAction();
  const query = useQuery(
    `daily:${state.activeId}:${date}:${state.preferences.timingPlaceId}`,
    () =>
      api.call("daily", {
        profileId: state.activeId ?? "",
        localDate: date,
        placeId: state.preferences.timingPlaceId,
      }),
  );
  return (
    <Page
      title="Daily"
      subtitle={state.profiles.find((p) => p.id === state.activeId)?.name}
      action={<ProfileButton />}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Previous day"
            secondary
            onPress={() => setDate(shiftDate(date, -1))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Today"
            secondary
            onPress={() =>
              setDate(localDate(place?.timezone ?? "Asia/Colombo"))
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Next day"
            secondary
            onPress={() => setDate(shiftDate(date, 1))}
          />
        </View>
      </View>
      <Field
        label="Reading date"
        value={date}
        onChange={setDate}
        placeholder="YYYY-MM-DD"
        numeric
      />
      <QueryState query={places}>
        {(rows) => (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {rows.map((p) => (
              <Chip
                key={p.id}
                title={p.name}
                selected={p.id === state.preferences.timingPlaceId}
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
      <QueryState query={query} label="Loading daily reading…">
        {(daily) => (
          <>
            <Txt size={13} muted>
              {daily.localDate} · {daily.place.name} · {daily.place.timezone}
            </Txt>
            <Badge
              text={
                daily.assessment === "supportive"
                  ? "Supportive themes"
                  : "Mixed factors"
              }
              green={daily.assessment === "supportive"}
            />
            <Txt heading size={27}>
              {daily.headline}
            </Txt>
            <Txt>{daily.body}</Txt>
            <Card style={{ backgroundColor: c.sage }}>
              <Txt heading size={22}>
                Your life period
              </Txt>
              <Txt>
                {daily.lifePeriod.main} / {daily.lifePeriod.sub}
              </Txt>
              <Txt size={13}>Dasha · main and subperiod</Txt>
            </Card>
            <Txt heading size={23}>
              Daily calendar
            </Txt>
            <Card>
              {daily.panchanga.map((f) => (
                <View key={f.term} style={{ gap: 3 }}>
                  <Txt bold>
                    {f.name} · {f.term}
                  </Txt>
                  <Txt muted>{f.value}</Txt>
                </View>
              ))}
            </Card>
            <Txt heading size={23}>
              Helpful and caution periods
            </Txt>
            {daily.intervals.map((interval) => (
              <Card
                key={interval.id}
                style={{
                  backgroundColor:
                    interval.assessment === "supportive" ? c.pale : c.peach,
                }}
              >
                <Badge
                  text={
                    interval.assessment === "supportive"
                      ? "Helpful factors"
                      : "Use care"
                  }
                  green={interval.assessment === "supportive"}
                />
                <Txt heading size={23}>
                  {new Intl.DateTimeFormat("en", {
                    timeZone: daily.place.timezone,
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(interval.startAt))}{" "}
                  –{" "}
                  {new Intl.DateTimeFormat("en", {
                    timeZone: daily.place.timezone,
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(interval.endAt))}
                </Txt>
                <Txt bold>{interval.activity}</Txt>
                {interval.factors.map((f) => (
                  <View key={f.term} style={{ gap: 4 }}>
                    <Txt bold size={14}>
                      {f.term}
                    </Txt>
                    <Txt size={14}>{f.meaning}</Txt>
                  </View>
                ))}
              </Card>
            ))}
            <Button
              title="View natal chart basis"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/chart-detail",
                  params: {
                    profileId: daily.profileId,
                    snapshotId: daily.chartSnapshotId,
                  },
                })
              }
            />
            <Button
              title="Refresh daily reading"
              secondary
              onPress={query.reload}
            />
          </>
        )}
      </QueryState>
    </Page>
  );
}
export function Matrimony() {
  const { state, api } = useNekath();
  const verification = useQuery("verification", () =>
    api.call("verification", {}),
  );
  useEffect(() => {
    if (verification.data?.status !== "pending") return;
    const timer = setInterval(verification.reload, 1000);
    return () => clearInterval(timer);
  }, [verification.data?.status, verification.reload]);
  if (state.plan === "free")
    return (
      <Page title="Matrimony" action={<ProfileButton />}>
        <Card>
          <Ico name="people-outline" size={44} color={c.olive} />
          <Txt heading size={27}>
            A thoughtful way to meet.
          </Txt>
          <Txt>
            Choose a plan and complete verification to explore member profiles.
          </Txt>
          <Button title="See plans" onPress={() => router.push("/plans")} />
        </Card>
      </Page>
    );
  return (
    <Page title="Matrimony" action={<ProfileButton />}>
      <QueryState query={verification} label="Checking verification…">
        {(v) =>
          v.status === "verified" ? (
            <MatchBrowser />
          ) : (
            <Card>
              <Badge text={v.status.replaceAll("_", " ")} green={false} />
              <Txt heading size={25}>
                {v.status === "pending"
                  ? "Your review is in progress"
                  : v.status === "rejected"
                    ? "Your document needs another look"
                    : "Verify your profile"}
              </Txt>
              <Txt>
                {v.reason ??
                  (v.status === "pending"
                    ? "We’ll update this screen when the demo review completes."
                    : "Verification helps keep the matching experience accountable. Use sample document and selfie data in this demo.")}
              </Txt>
              {v.status === "pending" ? (
                <Button
                  title="Check review status"
                  secondary
                  onPress={verification.reload}
                />
              ) : (
                <Button
                  title={
                    v.status === "rejected"
                      ? "Resubmit verification"
                      : "Start verification"
                  }
                  onPress={() => router.push("/verification")}
                />
              )}
            </Card>
          )
        }
      </QueryState>
    </Page>
  );
}
function MatchBrowser() {
  const { api } = useNekath();
  const [city, setCity] = useState(""),
    [age, setAge] = useState("Any age"),
    [search, setSearch] = useState("");
  const places = useQuery("match-places", () =>
    api.call("places", { query: "" }),
  );
  const query = useQuery(`matches:${city}:${age}:${search}`, () =>
    api.call("matches", {
      query: search,
      city: city || undefined,
      minAge: age === "25–29" ? 25 : age === "30–35" ? 30 : undefined,
      maxAge: age === "25–29" ? 29 : age === "30–35" ? 35 : undefined,
    }),
  );
  return (
    <>
      <Badge text="Verified demo account" green />
      <Button
        title="Saved profiles and interests"
        secondary
        icon="heart-outline"
        onPress={() => router.push("/favorites")}
      />
      <Field
        label="Find a member"
        value={search}
        onChange={setSearch}
        placeholder="Name or occupation"
      />
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {["Any age", "25–29", "30–35"].map((v) => (
          <Chip
            key={v}
            title={v}
            selected={age === v}
            onPress={() => setAge(v)}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Chip title="All cities" selected={!city} onPress={() => setCity("")} />
        {places.data
          ?.filter((p) => p.id !== "jaffna")
          .map((p) => (
            <Chip
              key={p.id}
              title={p.name}
              selected={city === p.name}
              onPress={() => setCity(p.name)}
            />
          ))}
      </View>
      <QueryState query={query} label="Finding members…">
        {(rows) =>
          rows.length ? (
            rows.map((m) => (
              <Card key={m.id}>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      backgroundColor: c.sage,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Txt heading size={28}>
                      {m.initials}
                    </Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt heading size={25}>
                      {m.name}, {m.age}
                    </Txt>
                    <Txt muted>{m.city}</Txt>
                  </View>
                </View>
                <Txt>{m.occupation}</Txt>
                <Txt size={14}>{m.interests.join(" · ")}</Txt>
                <Button
                  title="View profile"
                  onPress={() =>
                    router.push({ pathname: "/match", params: { id: m.id } })
                  }
                />
              </Card>
            ))
          ) : (
            <EmptyState
              title="No members in this view"
              body="Try another city, age range or search."
            />
          )
        }
      </QueryState>
      <Txt muted size={12}>
        All member profiles are synthetic demo data.
      </Txt>
    </>
  );
}
export function Verification() {
  const { api } = useNekath();
  const [step, setStep] = useState(0),
    [documentType, setDocumentType] = useState<"NIC" | "Passport">("NIC"),
    [document, setDocument] = useState(false),
    [selfie, setSelfie] = useState(false),
    [outcome, setOutcome] = useState<"verified" | "rejected">("verified");
  const action = useAction();
  return (
    <Page title="Verify your profile" back>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["Document", "Selfie", "Review"].map((v, i) => (
          <View
            key={v}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 20,
              backgroundColor: step >= i ? c.sage : c.surface,
            }}
          >
            <Txt bold size={13} style={{ textAlign: "center" }}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
      <Note>
        Only sample media is used. No real ID, camera image or selfie is
        uploaded.
      </Note>
      {step === 0 ? (
        <Card>
          <Txt heading size={25}>
            Choose your document
          </Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["NIC", "Passport"] as const).map((t) => (
              <Chip
                key={t}
                title={t}
                selected={documentType === t}
                onPress={() => {
                  setDocumentType(t);
                  setDocument(false);
                }}
              />
            ))}
          </View>
          <Button
            title={
              document
                ? `${documentType} sample selected`
                : "Use sample document"
            }
            secondary
            icon="document-outline"
            onPress={() => setDocument(true)}
          />
        </Card>
      ) : step === 1 ? (
        <Card>
          <Txt heading size={25}>
            Add your selfie
          </Txt>
          <View
            style={{
              alignSelf: "center",
              width: 140,
              height: 160,
              borderRadius: 70,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: c.green,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ico
              name={selfie ? "checkmark-circle-outline" : "person-outline"}
              size={60}
              color={c.olive}
            />
          </View>
          <Button
            title={selfie ? "Selfie sample selected" : "Use sample selfie"}
            secondary
            onPress={() => setSelfie(true)}
          />
        </Card>
      ) : (
        <Card>
          <Txt heading size={25}>
            Review your details
          </Txt>
          <Txt>{documentType} sample · selected</Txt>
          <Txt>Selfie sample · selected</Txt>
          <Txt bold>Demo review outcome</Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip
              title="Approve"
              selected={outcome === "verified"}
              onPress={() => setOutcome("verified")}
            />
            <Chip
              title="Needs resubmission"
              selected={outcome === "rejected"}
              onPress={() => setOutcome("rejected")}
            />
          </View>
        </Card>
      )}
      <ActionState action={action} />
      {step < 2 ? (
        <Button
          title="Continue"
          disabled={step === 0 ? !document : !selfie}
          onPress={() => setStep(step + 1)}
        />
      ) : (
        <Button
          title="Submit demo verification"
          disabled={action.busy}
          onPress={() =>
            action.run(
              (key) =>
                api.call(
                  "submitVerification",
                  {
                    documentType,
                    documentFixtureId: "demo-document",
                    selfieFixtureId: "demo-selfie",
                    demoOutcome: outcome,
                  },
                  key,
                ),
              () => router.back(),
            )
          }
        />
      )}
      {step > 0 ? (
        <Button
          title="Previous step"
          secondary
          onPress={() => setStep(step - 1)}
        />
      ) : null}
    </Page>
  );
}
export function MatchDetail() {
  const { api, state } = useNekath(),
    params = useLocalSearchParams<{ id: string }>();
  const query = useQuery("match:" + params.id, () =>
    api.call("match", { id: params.id }),
  );
  const action = useAction();
  const saved = state.favorites.includes(params.id),
    interest = state.interests.find((i) => i.matchId === params.id);
  return (
    <Page title="Member profile" back>
      <QueryState query={query}>
        {(m) => (
          <>
            <View
              style={{
                alignSelf: "center",
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: c.sage,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Txt heading size={42}>
                {m.initials}
              </Txt>
            </View>
            <Txt heading size={30}>
              {m.name}, {m.age}
            </Txt>
            <Txt>
              {m.occupation} · {m.city}
            </Txt>
            <Txt>{m.about}</Txt>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {m.interests.map((v) => (
                <Badge key={v} text={v} green />
              ))}
            </View>
            <Button
              title={saved ? "Remove from saved" : "Save profile"}
              secondary
              icon={saved ? "heart" : "heart-outline"}
              disabled={action.busy}
              onPress={() =>
                action.run((key) =>
                  api.call("favorite", { matchId: m.id, saved: !saved }, key),
                )
              }
            />
            <Button
              title={
                interest?.status === "sent"
                  ? "Withdraw interest"
                  : "Send demo interest"
              }
              disabled={action.busy}
              onPress={() =>
                action.run((key) =>
                  api.call(
                    "interest",
                    { matchId: m.id, withdraw: interest?.status === "sent" },
                    key,
                  ),
                )
              }
            />
            {interest ? (
              <Badge
                text={
                  interest.status === "sent"
                    ? "Interest sent"
                    : "Interest withdrawn"
                }
                green
              />
            ) : null}
            <ActionState action={action} />
            <Txt heading size={24}>
              Compatibility overview
            </Txt>
            <Txt muted size={13}>
              {m.compatibility.method}
            </Txt>
            {m.compatibility.checks.map((check) => (
              <Card key={check.name}>
                <Txt bold>
                  {check.name} · {check.result}
                </Txt>
                <Txt>{check.meaning}</Txt>
              </Card>
            ))}
            <Txt muted size={13}>
              These are sample matching checks, not a relationship decision.
            </Txt>
          </>
        )}
      </QueryState>
    </Page>
  );
}
export function Favorites() {
  const { api } = useNekath();
  const query = useQuery("favorites", () => api.call("favorites", {}));
  const interests = useQuery("interests", () => api.call("interests", {}));
  return (
    <Page title="Saved profiles and interests" back>
      <QueryState query={query}>
        {(rows) =>
          rows.length ? (
            rows.map((m) => (
              <Card key={m.id}>
                <Txt heading size={25}>
                  {m.name}, {m.age}
                </Txt>
                <Txt>
                  {m.city} · {m.occupation}
                </Txt>
                <Button
                  title="View profile"
                  secondary
                  onPress={() =>
                    router.push({ pathname: "/match", params: { id: m.id } })
                  }
                />
              </Card>
            ))
          ) : (
            <EmptyState
              title="No saved members"
              body="Save a profile from Matrimony to find it here."
            />
          )
        }
      </QueryState>
      <Txt heading size={24}>
        Your interests
      </Txt>
      <QueryState query={interests}>
        {(rows) =>
          rows.length ? (
            rows.map((i) => (
              <Card key={i.id}>
                <Txt>
                  {i.matchId.replace("m_", "")} · {i.status}
                </Txt>
                <Button
                  title="View member"
                  secondary
                  onPress={() =>
                    router.push({
                      pathname: "/match",
                      params: { id: i.matchId },
                    })
                  }
                />
              </Card>
            ))
          ) : (
            <Txt muted>No interests sent yet.</Txt>
          )
        }
      </QueryState>
    </Page>
  );
}
