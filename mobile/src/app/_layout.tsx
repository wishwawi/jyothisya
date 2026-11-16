import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider, useNekath } from "../store";
import { c } from "../theme";
import { Button, Txt } from "../ui";
function Content() {
  const { ready, error, retry, canEdit } = useNekath();
  const [fonts, errorFonts] = useFonts({
    Caprasimo: require("../../assets/fonts/Caprasimo.ttf"),
    Figtree: require("../../assets/fonts/Figtree.ttf"),
    Sinhala: require("../../assets/fonts/Sinhala.ttf"),
    Tamil: require("../../assets/fonts/Tamil.ttf"),
  });
  if (!ready || (!fonts && !errorFonts))
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={c.accentDark} />
      </View>
    );
  if (error && !canEdit)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          padding: 28,
          justifyContent: "center",
          gap: 20,
        }}
      >
        <Txt>{error}</Txt>
        <Button title="Retry" onPress={retry} />
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="birth" />
        <Stack.Screen name="casting" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reading" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="plans" />
      </Stack>
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <Provider>
        <Content />
      </Provider>
    </SafeAreaProvider>
  );
}
