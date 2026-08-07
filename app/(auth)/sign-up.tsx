import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
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

const PREFIX_OPTIONS = ["+39", "+33", "+34", "+44", "+49", "+1"];

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
    phoneLabel: { color: "#E2F2F2", fontSize: 14, fontWeight: "600", marginTop: 2 },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    prefixButton: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === "web" ? 13 : 12,
      backgroundColor: "rgba(226,242,242,0.96)",
      width: 88,
      alignItems: "center",
    },
    prefixButtonText: { color: c.textPrimary, fontWeight: "600" },
    phoneInput: { flex: 1 },
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: "rgba(226,242,242,0.96)",
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    prefixItem: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: c.surface,
    },
    prefixItemActive: { backgroundColor: c.surfaceSoft },
    prefixItemText: { color: c.textPrimary, fontWeight: "600" },
  });
}

export default function SignUp() {
  const router = useRouter();
  const { t } = useI18n();
  const dialog = useAppDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+39");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | "apple" | null>(null);
  const showApple = Platform.OS === "ios";

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/(tabs)/guest");
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/(tabs)/guest");
    });
    return () => { authListener?.subscription?.unsubscribe(); };
  }, [router]);

  const handleSignUp = async () => {
    if (!supabase) {
      await dialog.alert(t("auth.signUpTitle"), "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    if (!phonePrefix || !phoneNumber.trim()) {
      await dialog.alert(t("auth.signUpTitle"), t("edit.phoneRequired"));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
          phone_country_code: phonePrefix,
          phone_number: phoneNumber.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") && msg.includes("registered")) {
        await dialog.alert(t("auth.signUpTitle"), t("auth.emailAlreadyRegistered"));
        return;
      }
      await dialog.alert(t("auth.signUpTitle"), error.message);
      return;
    }
    if (data?.user?.id) {
      await supabase.from("profiles").upsert(
        { id: data.user.id, phone_country_code: phonePrefix, phone_number: phoneNumber.trim() },
        { onConflict: "id" }
      );
    }
    await dialog.alert(t("auth.checkEmail"), t("auth.checkEmailDetail"));
    router.replace("/(auth)/sign-in");
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    if (!supabase) {
      await dialog.alert(t("auth.signUpTitle"), "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    try {
      setOauthLoading(provider);
      const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri || (Constants.manifest as any)?.debuggerHost;
      const isExpoGo = Constants.appOwnership === "expo";
      let redirectTo = Linking.createURL("/auth-callback");
      if (isExpoGo) {
        if (redirectTo.startsWith("http") || redirectTo.includes("localhost") || redirectTo.includes("127.0.0.1")) {
          if (!hostUri) { await dialog.alert(t("auth.signUpTitle"), "Missing Expo host URI. Reopen Expo Go and try again."); return; }
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
        if (error) await dialog.alert(t("auth.signUpTitle"), error.message);
        return;
      }
      const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
      if (error) { await dialog.alert(t("auth.signUpTitle"), error.message); return; }
      if (!data?.url) { await dialog.alert(t("auth.signUpTitle"), "Missing OAuth URL."); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success" || !result.url) return;
      const parsed = Linking.parse(result.url);
      const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : undefined;
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) { await dialog.alert(t("auth.signUpTitle"), exchangeError.message); return; }
        router.replace("/(tabs)/guest");
        return;
      }
      const hash = result.url.split("#")[1] ?? "";
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: setError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (setError) { await dialog.alert(t("auth.signUpTitle"), setError.message); return; }
        router.replace("/(tabs)/guest");
      }
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Text style={styles.title}>{t("auth.signUpTitle")}</Text>
      <Text style={styles.subtitle}>{t("auth.signUpSubtitle")}</Text>

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
        <TextInput style={styles.input} placeholder={t("auth.username")} placeholderTextColor="#4F9B9B" autoCapitalize="none" value={username} onChangeText={setUsername} />
        <TextInput style={styles.input} placeholder={t("auth.email")} placeholderTextColor="#4F9B9B" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder={t("auth.password")} placeholderTextColor="#4F9B9B" secureTextEntry value={password} onChangeText={setPassword} />
        <Text style={styles.phoneLabel}>{t("edit.phoneNumber")}</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity style={styles.prefixButton} onPress={() => setPrefixOpen(true)}>
            <Text style={styles.prefixButtonText}>{phonePrefix}</Text>
          </TouchableOpacity>
          <TextInput style={[styles.input, styles.phoneInput]} placeholder="3331234567" placeholderTextColor="#4F9B9B" keyboardType="phone-pad" value={phoneNumber} onChangeText={(value) => setPhoneNumber(value.replace(/[^\d]/g, ""))} />
        </View>
        <Pressable style={[styles.primaryButton, loading && styles.disabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? t("auth.loading") : t("auth.signUpAction")}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("auth.haveAccount")}</Text>
        <Pressable onPress={() => router.push("/(auth)/sign-in")}>
          <Text style={styles.link}>{t("auth.signInAction")}</Text>
        </Pressable>
      </View>

      <Modal transparent visible={prefixOpen} animationType="fade" onRequestClose={() => setPrefixOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPrefixOpen(false)} />
          <View style={styles.modalCard}>
            {PREFIX_OPTIONS.map((prefix) => (
              <TouchableOpacity
                key={prefix}
                style={[styles.prefixItem, phonePrefix === prefix && styles.prefixItemActive]}
                onPress={() => { setPhonePrefix(prefix); setPrefixOpen(false); }}
              >
                <Text style={styles.prefixItemText}>{prefix}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}