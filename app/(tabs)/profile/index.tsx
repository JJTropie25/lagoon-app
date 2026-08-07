import { View, Text, StyleSheet, Image, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { useAuthState } from "../../../lib/auth";
import { useCallback, useMemo, useState } from "react";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { useAppDialog } from "../../../components/AppDialogProvider";
import { useFocusEffect } from "@react-navigation/native";
import { ensureHostForUser, resolveHostForUser } from "../../../lib/host";
import TabTopNotch from "../../../components/TabTopNotch";

const TEAL = "#4F9B9B";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },

    // Gradient header
    headerSection: {
      paddingHorizontal: 20,
      paddingBottom: 28,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 2.5,
      borderColor: "rgba(255,255,255,0.6)",
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    profileInfo: { flex: 1 },
    username: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
      marginBottom: 6,
    },
    manageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    manageText: {
      fontSize: 13,
      color: "rgba(255,255,255,0.88)",
      fontWeight: "600",
    },
    signInBtn: {
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: "center",
    },
    signInText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },

    // List
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      gap: 14,
      backgroundColor: "transparent",
    },
    listRowLabel: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: "500",
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
    },

    // Theme toggle (inline)
    themeToggle: {
      flexDirection: "row",
      backgroundColor: c.surfaceSoft,
      borderRadius: 8,
      padding: 2,
    },
    themeOption: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 6,
    },
    themeOptionActive: {
      backgroundColor: TEAL,
    },
    themeOptionText: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: "600",
    },
    themeOptionTextActive: {
      color: "#fff",
      fontWeight: "700",
    },

    // Bottom section
    bottomSection: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    hostButton: {
      backgroundColor: c.warmAccent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    hostButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
    },
    guestHint: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "center",
      lineHeight: 19,
    },
  });
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const dialog = useAppDialog();
  const { user } = useAuthState();
  const { colors, mode, setMode } = useTheme();
  const gradientColors = mode === "dark"
    ? ["#051F1F", "#0B3F3F"] as const
    : ["#A5D3D3", "#4F9B9B"] as const;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasHostMode, setHasHostMode] = useState(false);
  const [becomingHost, setBecomingHost] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      if (!supabase || !user) {
        setAvatarUrl(null);
        setHasHostMode(false);
        return () => { isMounted = false; };
      }
      resolveHostForUser(user.id).then(({ host }) => {
        if (!isMounted) return;
        setHasHostMode(Boolean(host));
      });
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!isMounted) return;
          setAvatarUrl(data?.avatar_url ?? null);
        });
      return () => { isMounted = false; };
    }, [user])
  );

  const handleHost = async () => {
    if (!user) { router.push("/(auth)/sign-in?continue=1"); return; }
    if (!hasHostMode) {
      setBecomingHost(true);
      const displayName = user.user_metadata?.username ?? user.email ?? "Host";
      const { error } = await ensureHostForUser(user.id, displayName);
      setBecomingHost(false);
      if (error) { await dialog.alert(t("edit.switchHostMode"), error); return; }
      setHasHostMode(true);
    }
    router.replace("/(host)/listings");
  };

  const displayName = user?.user_metadata?.username
    ? `@${user.user_metadata.username}`
    : user?.email ?? "@guest";

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />
      <TabTopNotch transparent />

      {/* Gradient header */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerSection, { paddingTop: insets.top + 72 }]}
      >
        {user ? (
          <View style={styles.profileRow}>
            <Image
              source={
                avatarUrl ? { uri: avatarUrl } : require("../../../assets/images/icon.png")
              }
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{displayName}</Text>
              <Pressable
                style={styles.manageRow}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/profile/Edit",
                    params: { returnTo: "guest" },
                  })
                }
              >
                <Text style={styles.manageText}>Manage my account</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color="rgba(255,255,255,0.88)"
                />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.signInBtn} onPress={() => router.push("/(auth)/sign-in")}>
            <Text style={styles.signInText}>{t("auth.signInAction")}</Text>
          </Pressable>
        )}
      </LinearGradient>

      {/* Scrollable list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>

        {/* Payment Methods */}
        <Pressable
          style={styles.listRow}
          onPress={() => user ? router.push("/(tabs)/profile/Payments") : router.push("/(auth)/sign-in?continue=1")}
        >
          <MaterialCommunityIcons name="credit-card-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>Payment Methods</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />

        {/* Language */}
        <Pressable style={styles.listRow} onPress={() => router.push("/(tabs)/profile/Language")}>
          <MaterialCommunityIcons name="translate" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>{t("profile.changeLanguage")}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />

        {/* Theme */}
        <View style={styles.listRow}>
          <MaterialCommunityIcons name="palette-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>{t("profile.appearance")}</Text>
          <View style={styles.themeToggle}>
            <Pressable
              style={[styles.themeOption, mode === "light" && styles.themeOptionActive]}
              onPress={() => setMode("light")}
            >
              <Text style={[styles.themeOptionText, mode === "light" && styles.themeOptionTextActive]}>
                {t("profile.themeLight")}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.themeOption, mode === "dark" && styles.themeOptionActive]}
              onPress={() => setMode("dark")}
            >
              <Text style={[styles.themeOptionText, mode === "dark" && styles.themeOptionTextActive]}>
                {t("profile.themeDark")}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Terms & Conditions */}
        <Pressable
          style={styles.listRow}
          onPress={() => router.push("/(tabs)/profile/TermsAndConditions")}
        >
          <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>Terms & Conditions</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />

        {/* Help */}
        <Pressable
          style={styles.listRow}
          onPress={() => router.push("/(tabs)/profile/Help")}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>Help</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>

      </ScrollView>

      <View style={[styles.bottomSection, { paddingBottom: 16 }]}>
        {user ? (
          <Pressable
            style={[styles.hostButton, becomingHost && { opacity: 0.6 }]}
            onPress={handleHost}
            disabled={becomingHost}
          >
            <Text style={styles.hostButtonText}>
              {becomingHost ? "…" : t("edit.switchHostMode")}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.guestHint}>
            Sign in to book as a guest and publish listings as a host.
          </Text>
        )}
      </View>

    </View>
  );
}
