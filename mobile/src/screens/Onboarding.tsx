import React, { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { router, Redirect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { c } from "../theme";
import { useNekath } from "../store";
import { emptyDraft, sampleDraft } from "../model";
import type { BirthDraft } from "../api/contracts";
import { useAction, useQuery } from "../api/hooks";
import {
  ActionState,
  Badge,
  Button,
  Chip,
  Field,
  Languages,
  LoadingState,
  Note,
  Page,
  QueryState,
  Txt,
  useLabels,
} from "../ui";
export function Welcome() {
  const t = useLabels(),
    { state } = useNekath();
  const { height } = useWindowDimensions();
  if (state.activeId) return <Redirect href="/(tabs)/home" />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 390,
          height: 390,
          borderRadius: 195,
          backgroundColor: c.peach,
          right: -110,
          top: -40,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 285,
            height: 285,
            borderWidth: 3,
            borderStyle: "dotted",
            borderColor: c.accentDark,
            borderRadius: 150,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 175,
              height: 175,
              borderRadius: 90,
              backgroundColor: c.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: c.sage,
              }}
            />
          </View>
        </View>
        {Array.from({ length: 12 }, (_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              width: 17,
              height: 17,
              borderRadius: 9,
              backgroundColor: c.green,
              left: 186 + Math.sin((i * Math.PI) / 6) * 142,
              top: 186 - Math.cos((i * Math.PI) / 6) * 142,
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1, minHeight: height < 650 ? 180 : 270 }} />
      <View style={{ padding: 28, gap: 18, paddingBottom: 32 }}>
        <Badge text="Demo data" green />
        <Languages />
        <View style={{ gap: 10 }}>
          <Txt heading size={46}>
            {t.appName}
          </Txt>
          <Txt size={19}>{t.tagline}</Txt>
        </View>
        <Button title={t.begin} onPress={() => router.push("/birth")} />
        {state.profiles.length ? (
          <Button
            title="Restore a saved profile"
            secondary
            onPress={() => router.push("/profile")}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
export function Birth() {
  const { state, api } = useNekath(),
    params = useLocalSearchParams<{ profileId?: string }>(),
    t = useLabels();
  const profile = state.profiles.find((p) => p.id === params.profileId);
  const [draft, setDraft] = useState<BirthDraft>(() =>
    profile
      ? {
          name: profile.name,
          dob: profile.dob,
          time: profile.time,
          place: profile.place,
          isExample: profile.isExample,
          placeId: profile.placeId,
        }
      : { ...emptyDraft },
  );
  const action = useAction();
  const places = useQuery("places:" + draft.place, () =>
    api.call("places", { query: draft.place }),
  );
  const set = (key: "name" | "dob" | "time" | "place", value: string) => {
    setDraft((d) => ({
      ...d,
      [key]: value,
      isExample: false,
      ...(key === "place" ? { placeId: undefined } : {}),
    }));
    action.clear();
  };
  if (params.profileId && !profile)
    return (
      <Page title="Profile not found" back>
        <Note>Return to Profile and choose a saved person.</Note>
      </Page>
    );
  const submit = () =>
    action.run(
      async (key) => {
        if (profile) {
          const response = await api.call(
            "updateProfile",
            { profileId: profile.id, revision: profile.revision, draft },
            key,
          );
          await api.call(
            "selectProfile",
            { profileId: response.data.id },
            key + ":select",
          );
          return { profileId: response.data.id };
        }
        if (state.freeProfileClaimed) {
          const response = await api.call(
            "createPurchase",
            { productId: "extra_profile", draft },
            key,
          );
          return { purchaseId: response.data.id };
        }
        const response = await api.call("createProfile", { draft }, key);
        return { profileId: response.data.id };
      },
      (result) => {
        if ("purchaseId" in result)
          router.push({
            pathname: "/checkout",
            params: { id: result.purchaseId },
          });
        else router.replace("/casting");
      },
    );
  return (
    <Page
      title={profile ? "Edit birth details" : t.enter}
      subtitle={
        profile
          ? "Saving creates a new chart revision. Saved snapshots keep their original basis."
          : "Keep a person’s details and charts together."
      }
      back
    >
      <Field
        label={t.name}
        value={draft.name}
        onChange={(v) => set("name", v)}
        placeholder={t.namePh}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Field
          label={t.dob}
          value={draft.dob}
          onChange={(v) => set("dob", v)}
          placeholder="YYYY-MM-DD"
          numeric
        />
        <Field
          label={t.time}
          value={draft.time}
          onChange={(v) => set("time", v)}
          placeholder="HH:MM"
          numeric
        />
      </View>
      <Field
        label={t.place}
        value={draft.place}
        onChange={(v) => set("place", v)}
        placeholder="Search a city"
      />
      {!draft.placeId ? (
        <QueryState query={places} label="Finding places…">
          {(rows) => (
            <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
              {rows.length ? (
                rows.map((p) => (
                  <Chip
                    key={p.id}
                    title={`${p.name}, ${p.country}`}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        place: p.name + ", " + p.country,
                        placeId: p.id,
                      }))
                    }
                  />
                ))
              ) : (
                <Txt muted>
                  No places found. Try Colombo, Kandy, London or Melbourne.
                </Txt>
              )}
            </View>
          )}
        </QueryState>
      ) : (
        <Txt size={13} color={c.olive}>
          Location selected
        </Txt>
      )}
      <ActionState action={action} />
      <Button
        title={
          profile
            ? "Save new revision"
            : state.freeProfileClaimed
              ? "Continue to profile purchase"
              : "Create my chart · Free"
        }
        disabled={action.busy}
        onPress={submit}
      />
      <Button
        title={t.sample}
        secondary
        onPress={() => setDraft({ ...sampleDraft, placeId: "kandy" })}
      />
      {state.freeProfileClaimed && !profile ? (
        <Txt muted size={13}>
          Each additional person requires a creation purchase. Saving chart
          views does not create another person.
        </Txt>
      ) : null}
    </Page>
  );
}
export function Casting() {
  const { state, api } = useNekath();
  const profileId = state.activeId;
  const query = useQuery("casting:" + profileId, () =>
    api.call("chart", { profileId: profileId ?? "", kind: "rasi" }),
  );
  useEffect(() => {
    if (query.data) router.replace("/(tabs)/home");
  }, [query.data]);
  return (
    <Page title="Preparing your charts">
      <QueryState query={query} label="Loading chart data…">
        {() => <LoadingState label="Opening your chart…" />}
      </QueryState>
      <Txt muted>Chart data is supplied by the demo service.</Txt>
    </Page>
  );
}
