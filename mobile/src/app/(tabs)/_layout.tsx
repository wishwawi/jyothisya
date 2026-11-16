import React from "react";
import { Pressable, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNekath } from "../../store";
import { Ico, IconName, Txt, useLabels } from "../../ui";
import { c } from "../../theme";
const icons: Record<string, IconName> = {
  home: "home-outline",
  charts: "grid-outline",
  ask: "chatbubble-outline",
  daily: "sunny-outline",
  matrimony: "people-outline",
};
type BarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];
function Bar({ state, emitter, navigateToTab }: BarProps) {
  const insets = useSafeAreaInsets(),
    t = useLabels();
  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          padding: 7,
          borderRadius: 40,
          backgroundColor: c.ink,
        }}
      >
        {state.routes.map((route, index) => {
          const selected = state.index === index;
          const label =
            t[route.name as "home" | "charts" | "ask" | "daily" | "matrimony"];
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              onPress={() => {
                const e = emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!e.defaultPrevented) navigateToTab(route.key);
              }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 58,
                paddingVertical: 8,
                paddingHorizontal: 2,
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                backgroundColor: selected ? c.accent : "transparent",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ico
                name={icons[route.name]}
                color={selected ? c.ink : c.surface}
                size={23}
              />
              <Txt
                size={11}
                bold
                color={selected ? c.ink : c.surface}
                style={{ textAlign: "center" }}
              >
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export default function Layout() {
  const { state } = useNekath();
  if (!state.activeId) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
      }}
      tabBar={(props) => <Bar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="charts" />
      <Tabs.Screen name="ask" />
      <Tabs.Screen name="daily" />
      <Tabs.Screen name="matrimony" />
    </Tabs>
  );
}
