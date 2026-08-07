import * as Sentry from "@sentry/react-native";
import { PostHogProvider } from "posthog-react-native";
import React, { useState } from "react";
import { Stack } from "expo-router";
import { I18nProvider } from "../lib/i18n";
import { useAuthState } from "../lib/auth";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppDialogProvider } from "../components/AppDialogProvider";
import { useFonts } from "expo-font";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Baloo2_700Bold } from "@expo-google-fonts/baloo-2";
import SplashScreen from "../components/SplashScreen";
import NotificationsProvider from "../components/NotificationsProvider";
import StripeRootProvider from "../components/StripeRootProvider";
import { ThemeProvider } from "../lib/theme-context";
import { initialWindowMetrics } from "react-native-safe-area-context";
import { posthog } from "../lib/analytics";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  environment: __DEV__ ? "development" : "production",
});

// Read the real system nav bar height once at module init time (synchronous native call,
// before any SafeAreaProvider mounts). This gives the adaptive value: ~48dp for 3-button
// nav, ~24-34dp for gesture nav, 0 if no nav bar. We apply it as root paddingBottom
// WITHOUT touching the SafeAreaProvider tree — so useSafeAreaInsets().bottom stays 0
// in all child screens and SafeAreaView never double-compensates.
const NAV_BAR_HEIGHT = Platform.OS === "android"
  ? (initialWindowMetrics?.insets.bottom ?? 0)
  : 0;

function AndroidNavBarSpacer({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, paddingBottom: NAV_BAR_HEIGHT, backgroundColor: "#0B3F3F" }}>
      {children}
    </View>
  );
}

function RootLayout() {
  useAuthState();
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    Baloo2_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  // Hold a matching orange screen while fonts load — the animated splash
  // (same orange background) mounts immediately after, hiding any transition.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#e0763c" }} />;
  }

  const Content = (
    <ThemeProvider>
      <I18nProvider>
        <AppDialogProvider>
          <NotificationsProvider />
          <View style={styles.root}>
            <LinearGradient
              colors={["#0B3F3F", "#0B3F3F", "#0B3F3F"]}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                contentStyle: { backgroundColor: "#0B3F3F" },
              }}
            />
            <LinearGradient
              colors={[
                "rgba(11,63,63,0)",
                "rgba(11,63,63,0)",
                "rgba(11,63,63,0)",
              ]}
              locations={[0, 0.35, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
            />
          </View>
        </AppDialogProvider>
      </I18nProvider>
    </ThemeProvider>
  );

  const inner = (
    <>
      <AndroidNavBarSpacer>
        <StripeRootProvider>{Content}</StripeRootProvider>
      </AndroidNavBarSpacer>
      {!splashDone && (
        <SplashScreen onDone={() => setSplashDone(true)} />
      )}
    </>
  );

  return posthog ? (
    <PostHogProvider client={posthog} options={{ enableSessionReplay: true }}>
      {inner}
    </PostHogProvider>
  ) : inner;
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1 },
});
