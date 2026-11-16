import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useNekath } from "../store";
import type { Category, Home as HomeData } from "../api/contracts";
import { useAction, useQuery } from "../api/hooks";
import { c } from "../theme";
import {
  ActionState,
  Button,
  Card,
  Ico,
  IconName,
  Page,
  ProfileButton,
  QueryState,
  Txt,
} from "../ui";
export const categoryIcons: Record<Category, IconName> = {
  love: "heart-outline",
  career: "briefcase-outline",
  health: "pulse-outline",
  dosha: "shield-checkmark-outline",
};
export function Home() {
  const { state, api } = useNekath();
  const profileId = state.activeId ?? "";
  const query = useQuery("home:" + profileId, () =>
    api.call("home", { profileId }),
  );
  return (
    <Page>
      <QueryState query={query} label="Loading your home…">
        {(data) => <HomeContent key={data.profile.id} data={data} />}
      </QueryState>
    </Page>
  );
}
function HomeContent({ data }: { data: HomeData }) {
  const { api } = useNekath();
  const [category, setCategory] = useState<Category>("love");
  const action = useAction();
  const summary = data.summary;
  const selected = data.categories.find((c) => c.id === category)!;
  const signs = [
    {
      label: "Lagna",
      value: summary.lagna,
      sub: "Lord " + summary.lagnaLord,
      bg: c.accent,
      fg: c.ink,
      icon: "scale-outline",
    },
    {
      label: "Rashi",
      value: summary.rashi,
      sub: "Moon sign",
      bg: c.sage,
      fg: c.ink,
      icon: "ellipse-outline",
    },
    {
      label: "Nakshatra",
      value: summary.nakshatra,
      sub: "Lord " + summary.moonLord,
      bg: c.ink,
      fg: c.paper,
      icon: "sunny-outline",
    },
  ];
  const read = () => {
    if (selected.locked) {
      router.push("/plans");
      return;
    }
    void action.run(
      (key) =>
        api.call(
          "createReading",
          { profileId: data.profile.id, category },
          key,
        ),
      (response) =>
        router.push({ pathname: "/reading", params: { id: response.data.id } }),
    );
  };
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Txt muted>Welcome,</Txt>
          <Txt heading size={30}>
            {data.profile.name}
          </Txt>
        </View>
        <ProfileButton />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {signs.map((s) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              minWidth: 0,
              padding: 12,
              borderRadius: 28,
              backgroundColor: s.bg,
              gap: 14,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  s.bg === c.ink
                    ? "#474238"
                    : s.bg === c.sage
                      ? c.pale
                      : c.peach,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ico name={s.icon as IconName} color={s.fg} size={26} />
            </View>
            <View style={{ gap: 4 }}>
              <Txt color={s.fg} size={12} bold>
                {s.label}
              </Txt>
              <Txt color={s.fg} size={16} heading>
                {s.value}
              </Txt>
              <Txt color={s.fg} size={11}>
                {s.sub}
              </Txt>
            </View>
          </View>
        ))}
      </View>
      <Txt heading size={24}>
        What would you like to check?
      </Txt>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {data.categories.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: category === item.id }}
            accessibilityLabel={`${item.title}, ${item.locked ? "Plan required" : data.entitlements.readingsUnlocked ? "Available" : "Your free reading"}`}
            onPress={() => setCategory(item.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              backgroundColor: category === item.id ? "#FFF2EB" : c.paper,
              borderWidth: 2.5,
              borderColor: category === item.id ? c.accent : "transparent",
              padding: 12,
              borderRadius: 36,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor:
                  item.id === "love" || item.id === "dosha" ? c.peach : c.sage,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ico name={categoryIcons[item.id]} size={21} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt bold>{item.title}</Txt>
              <Txt muted size={12}>
                {item.locked ? "Plan required" : item.description}
              </Txt>
            </View>
            <Ico
              name={
                item.locked
                  ? "lock-closed-outline"
                  : category === item.id
                    ? "radio-button-on"
                    : "radio-button-off"
              }
              color={category === item.id ? c.accent : c.muted}
            />
          </Pressable>
        ))}
      </View>
      <Card>
        <Txt heading size={22}>
          {selected.title}
        </Txt>
        <Txt>{selected.description}</Txt>
        <ActionState action={action} />
        <Button
          title={selected.locked ? "Choose a plan" : "Read full reading"}
          disabled={action.busy}
          onPress={read}
        />
        <Button
          title="View charts"
          secondary
          onPress={() => router.push("/(tabs)/charts")}
        />
      </Card>
      <Card style={{ backgroundColor: c.sage }}>
        <Txt heading size={23}>
          Your day, in context
        </Txt>
        <Txt>
          Read today’s themes and helpful or cautionary periods for your
          location.
        </Txt>
        <Button
          title="Open Daily"
          secondary
          onPress={() => router.push("/(tabs)/daily")}
        />
      </Card>
      <Button
        title="Add a new profile"
        icon="add-outline"
        secondary
        onPress={() => router.push("/birth")}
      />
      <Txt size={13} muted>
        {data.entitlements.questionCredits} question credits ·{" "}
        {data.entitlements.plan === "free"
          ? "Free plan"
          : data.entitlements.plan === "graha"
            ? "Graha"
            : "Jyotisha"}
      </Txt>
    </>
  );
}
