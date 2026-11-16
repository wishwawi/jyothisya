import React from "react";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TextStyle,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import data from "./reference.json";
import { useNekath } from "./store";
import { c } from "./theme";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Txt({
  children,
  size = 16,
  muted = false,
  heading = false,
  bold = false,
  color,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  heading?: boolean;
  bold?: boolean;
  color?: string;
  style?: TextStyle;
}) {
  const { state } = useNekath();
  const font =
    state.preferences.language === "si"
      ? "Sinhala"
      : state.preferences.language === "ta"
        ? "Tamil"
        : heading
          ? "Caprasimo"
          : "Figtree";
  return (
    <Text
      style={[
        {
          fontFamily: font,
          fontWeight: heading ? "400" : bold ? "700" : "400",
          fontSize: size,
          lineHeight: size * (heading ? 1.2 : 1.45),
          color: color ?? (muted ? c.muted : c.ink),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Ico({
  name,
  size = 22,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} accessible={false} />;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        padding: 15,
        borderRadius: 30,
        backgroundColor: secondary ? c.surface : c.accent,
        borderWidth: secondary ? 1 : 0,
        borderColor: c.line,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Ico name={icon} /> : null}
      <Txt bold size={16} style={{ textAlign: "center", flexShrink: 1 }}>
        {title}
      </Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        { backgroundColor: c.paper, padding: 18, borderRadius: 28, gap: 12 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Chip({
  title,
  onPress,
  selected = false,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 17,
        paddingVertical: 12,
        minHeight: 48,
        borderRadius: 28,
        backgroundColor: selected ? c.ink : c.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Txt color={selected ? c.bg : c.ink} bold size={14}>
        {title}
      </Txt>
    </Pressable>
  );
}
export function Languages() {
  const { state, api } = useNekath();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {(
        [
          ["si", "සිංහල"],
          ["ta", "தமிழ்"],
          ["en", "English"],
        ] as const
      ).map(([id, label]) => (
        <Chip
          key={id}
          title={label}
          selected={state.preferences.language === id}
          onPress={() =>
            actAsync(() =>
              api.call(
                "preferences",
                { language: id },
                "language_" + Date.now(),
              ),
            )
          }
        />
      ))}
    </View>
  );
}
export function Badge({
  text,
  green = false,
}: {
  text: string;
  green?: boolean;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 18,
        backgroundColor: green ? c.sage : c.peach,
      }}
    >
      <Txt size={12} bold color={green ? c.olive : c.accentDark}>
        {text}
      </Txt>
    </View>
  );
}
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 9,
        padding: 14,
        borderRadius: 18,
        backgroundColor: c.surface,
      }}
    >
      <Ico name="information-circle-outline" size={19} color={c.muted} />
      <Txt size={13} muted style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}
export function Page({
  children,
  title,
  subtitle,
  back = false,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  const { error, retry } = useNekath();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 12,
          paddingBottom: 45,
          gap: 16,
        }}
      >
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
            style={{ width: 48, height: 48, justifyContent: "center" }}
          >
            <Ico name="arrow-back" />
          </Pressable>
        ) : null}
        <Badge text="Demo data" green />
        {error ? (
          <Pressable accessibilityRole="button" onPress={retry}>
            <Note>{error} · Retry</Note>
          </Pressable>
        ) : null}
        {title ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt heading size={32}>
                {title}
              </Txt>
              {subtitle ? (
                <Txt muted size={14}>
                  {subtitle}
                </Txt>
              ) : null}
            </View>
            {action}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
}) {
  const { state } = useNekath();
  return (
    <View style={{ gap: 7, flex: 1 }}>
      <Txt size={14} bold>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        autoCorrect={false}
        multiline={multiline}
        keyboardType={numeric ? "numbers-and-punctuation" : "default"}
        style={{
          fontFamily:
            state.preferences.language === "si"
              ? "Sinhala"
              : state.preferences.language === "ta"
                ? "Tamil"
                : "Figtree",
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.paper,
          borderRadius: multiline ? 24 : 30,
          minHeight: multiline ? 120 : 52,
          paddingHorizontal: 18,
          paddingVertical: 14,
          fontSize: 16,
          color: c.ink,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
export function Rule() {
  return (
    <View
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }}
    />
  );
}
export function useLabels() {
  const { state } = useNekath();
  return data.labels[state.preferences.language];
}
export function ProfileButton() {
  const { state } = useNekath();
  const p = state.profiles.find((p) => p.id === state.activeId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      onPress={() => router.push("/profile")}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: c.green,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt heading size={22} color={c.paper}>
        {p?.name[0] ?? "N"}
      </Txt>
    </Pressable>
  );
}

export function actAsync(fn: () => Promise<unknown>) {
  void fn().catch((e) =>
    Alert.alert("Nekath", e instanceof Error ? e.message : "Please retry."),
  );
}
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ paddingVertical: 30, gap: 14, alignItems: "center" }}
    >
      <ActivityIndicator color={c.accentDark} />
      <Txt muted>{label}</Txt>
    </View>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <Card>
      <Txt color={c.error}>{error.message}</Txt>
      <Button title="Retry" onPress={retry} secondary />
    </Card>
  );
}
export function ActionState({
  action,
}: {
  action: { busy: boolean; error: Error | null; retry: () => void };
}) {
  return action.error ? (
    <ErrorState error={action.error} retry={action.retry} />
  ) : action.busy ? (
    <LoadingState label="Saving…" />
  ) : null;
}
export function QueryState<T>({
  query,
  children,
  label,
}: {
  query: { loading: boolean; error?: Error; data?: T; reload: () => void };
  children: (data: T) => React.ReactNode;
  label?: string;
}) {
  if (query.loading) return <LoadingState label={label} />;
  if (query.error)
    return <ErrorState error={query.error} retry={query.reload} />;
  if (query.data === undefined) return <Note>No data is available.</Note>;
  return <>{children(query.data)}</>;
}
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Txt heading size={24}>
        {title}
      </Txt>
      <Txt muted>{body}</Txt>
    </Card>
  );
}
