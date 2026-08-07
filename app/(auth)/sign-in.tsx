import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markLoginPrompted } from "../../lib/loginPrompt";
import { supabase } from "../../lib/supabase";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { useAppDialog } from "../../components/AppDialogProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0B3F3F",
      paddingHorizontal: 24,
      paddingTop: 80,
      overflow: "hidden",
    },
    glowTop: {
      position: "absolute",
      top: -80,
      right: -40,
      width: 220,
      height: 220,
      borderTopLeftRadius: 120,
      borderTopRightRadius: 80,
      borderBottomLeftRadius: 90,
      borderBottomRightRadius: 130,
      backgroundColor: "rgba(255,255,255,0.16)",
      transform: [{ rotate: "18deg" }],
    },
    glowBottom: {
      position: "absolute",
      bottom: -100,
      left: -50,
      width: 260,
      height: 260,
      borderTopLeftRadius: 150,
      borderTopRightRadius: 95,
      borderBottomLeftRadius: 110,
      borderBottomRightRadius: 170,
      backgroundColor: "rgba(255,255,255,0.10)",
      transform: [{ rotate: "-14deg" }],
    },
    closeBtn: {
      position: "absolute",
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    title: { fontSize: 24, fontWeight: "700", fontFamily: "Baloo2_700Bold", color: "#E2F2F2" },
    subtitle: { marginTop: 8, fontSize: 16, fontWeight: "600", color: "#E2F2F2" },
    socialRow: { marginTop: 20, gap: 10 },
    socialButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: "rgba(226,242,242,0.92)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    socialText: { color: "#0F4E4E", fontWeight: "600" },
    orText: { marginTop: 16, color: "#E2F2F2", fontWeight: "600" },
    form: { marginTop: 20, gap: 12 },
    input: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: "rgba(226,242,242,0.96)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.5)",
      color: "#0F4E4E",
      fontSize: 16,
      fontWeight: "600",
    },
    primaryButton: {
      backgroundColor: c.warmAccent,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 8,
      shadowColor: c.warmAccent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryButtonText: { color: c.background, fontSize: 16, fontWeight: "600" },
    disabled: { opacity: 0.7 },
    footer: { marginTop: 24, flexDirection: "row", alignItems: "center", gap: 6 },
    footerText: { color: "#E2F2F2" },
    link: { color: "#E2F2F2", fontWeight: "600" },
    secondaryAction: { alignSelf: "flex-start", marginTop: 4 },
  });
}

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { continue: continueParam } = useLocalSearchParams<{ continue?: string }>();
  const isContinue = continueParam === "1";
  const { t } = useI18n();
  const dialog = useAppDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | "apple" | null>(null);
  const showApple = Platform.OS === "ios";

  const dismiss = async () => {
    await markLoginPrompted();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/guest");
  };

  const goAfterLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/guest");
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goAfterLogin();
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goAfterLogin();
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async () => {
    if (!supabase) {
      await dialog.alert(t("auth.signInTitle"), "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { await dialog.alert(t("auth.signInTitle"), error.message); return; }
    goAfterLogin();
  };

  const handleForgotPassword = async () => {
    if (!supabase) {
      await dialog.alert(t("auth.signInTitle"), "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      await dialog.alert(t("auth.resetPasswordTitle"), t("auth.resetPasswordEnterEmail"));
      return;
    }
    setResettingPassword(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    setResettingPassword(false);
    if (error) { await dialog.alert(t("auth.resetPasswordTitle"), error.message); return; }
    await dialog.alert(t("auth.resetPasswordTitle"), t("auth.resetPasswordSent"));
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    if (!supabase) {
      await dialog.alert(t("auth.signInTitle"), "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    try {
      setOauthLoading(provider);
      const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri || (Constants.manifest as any)?.debuggerHost;
      const isExpoGo = Constants.appOwnership === "expo";
      let redirectTo = Linking.createURL("/auth-callback");
      if (isExpoGo) {
        if (redirectTo.startsWith("http") || redirectTo.includes("localhost") || redirectTo.includes("127.0.0.1")) {
          if (!hostUri) { await dialog.alert(t("auth.signInTitle"), "Missing Expo host URI. Reopen Expo Go and try again."); return; }
          redirectTo = `exp://${hostUri}/--/auth-callback`;
        } else if (!redirectTo.includes("/--/")) {
          const [scheme, rest] = redirectTo.split("://");
          const host = rest?.split("/")[0];
          if (scheme && host) redirectTo = `${scheme}://${host}/--/auth-callback`;
        }
      }
      console.log("OAuth redirectTo", redirectTo);
      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) await dialog.alert(t("auth.signInTitle"), error.message);
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
      if (error) { await dialog.alert(t("auth.signInTitle"), error.message); return; }
      if (!data?.url) { await dialog.alert(t("auth.signInTitle"), "Missing OAuth URL."); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !result.url) return;
      const parsed = Linking.parse(result.url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : undefined;
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) { await dialog.alert(t("auth.signInTitle"), exchangeError.message); return; }
        goAfterLogin();
        return;
      }
      const hash = result.url.split("#")[1] ?? "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: setError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (setError) { await dialog.alert(t("auth.signInTitle"), setError.message); return; }
        goAfterLogin();
      }
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Dismiss button — visible whenever the screen can be closed */}
      <Pressable style={[styles.closeBtn, { top: insets.top + 12 }]} onPress={dismiss}>
        <MaterialCommunityIcons name="close" size={22} color="rgba(226,242,242,0.75)" />
      </Pressable>

      <Text style={styles.title}>
        {isContinue ? "Accedi per continuare" : t("auth.signInTitle")}
      </Text>
      <Text style={styles.subtitle}>
        {isContinue ? "Devi essere connesso per usare questa funzione." : t("auth.signInSubtitle")}
      </Text>

      <View style={styles.socialRow}>
        {showApple ? (
          <Pressable style={[styles.socialButton, oauthLoading === "apple" && styles.disabled]} onPress={() => handleOAuth("apple")} disabled={oauthLoading === "apple"}>
            <MaterialCommunityIcons name="apple" size={18} color={colors.textPrimary} />
            <Text style={styles.socialText}>{t("auth.continueWithApple")}</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.socialButton, oauthLoading === "google" && styles.disabled]} onPress={() => handleOAuth("google")} disabled={oauthLoading === "google"}>
          <MaterialCommunityIcons name="google" size={18} color={colors.textPrimary} />
          <Text style={styles.socialText}>{t("auth.continueWithGoogle")}</Text>
        </Pressable>
        <Pressable style={[styles.socialButton, oauthLoading === "facebook" && styles.disabled]} onPress={() => handleOAuth("facebook")} disabled={oauthLoading === "facebook"}>
          <MaterialCommunityIcons name="facebook" size={18} color={colors.textPrimary} />
          <Text style={styles.socialText}>{t("auth.continueWithFacebook")}</Text>
        </Pressable>
      </View>

      <Text style={styles.orText}>{t("auth.orContinue")}</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder={t("auth.email")}
          placeholderTextColor="#4F9B9B"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={t("auth.password")}
          placeholderTextColor="#4F9B9B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={[styles.primaryButton, loading && styles.disabled]} onPress={handleSignIn} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? t("auth.loading") : t("auth.signInAction")}</Text>
        </Pressable>
        <Pressable onPress={handleForgotPassword} disabled={resettingPassword} style={styles.secondaryAction}>
          <Text style={styles.link}>{resettingPassword ? t("auth.loading") : t("auth.forgotPasswordAction")}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("auth.noAccount")}</Text>
        <Pressable onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={styles.link}>{t("auth.signUpAction")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
