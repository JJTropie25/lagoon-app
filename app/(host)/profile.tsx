import { Image, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { useAuthState } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import TabTopNotch from "../../components/TabTopNotch";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

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

    // Payments row
    paymentStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    paymentStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    paymentStatusText: {
      fontSize: 13,
      fontWeight: "600",
      flexShrink: 1,
    },
    // Theme toggle
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
    themeOptionActive: { backgroundColor: TEAL },
    themeOptionText: { fontSize: 12, color: c.textSecondary, fontWeight: "600" },
    themeOptionTextActive: { color: "#fff", fontWeight: "700" },

    // Bottom section
    bottomSection: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    switchBtn: {
      backgroundColor: c.warmAccent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    switchBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
    },
  });
}

export default function HostProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuthState();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hostStatus, setHostStatus] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      if (!supabase || !user) {
        setAvatarUrl(null);
        return () => { isMounted = false; };
      }
      supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!isMounted) return;
          setAvatarUrl(data?.avatar_url ?? null);
        });
      supabase
        .from("hosts")
        .select("id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled")
        .eq("guest_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!isMounted) return;
          setHostStatus(data ?? null);
        });
      return () => { isMounted = false; };
    }, [user])
  );

  const displayName = user?.user_metadata?.username
    ? `@${user.user_metadata.username}`
    : user?.email ?? "@host";

  const paymentsActive = hostStatus?.stripe_onboarding_complete;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />
      <TabTopNotch hostMode transparent />

      {/* Gradient header */}
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#4F9B9B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerSection, { paddingTop: insets.top + 72 }]}
      >
        <View style={styles.profileRow}>
          <Image
            source={avatarUrl ? { uri: avatarUrl } : require("../../assets/images/icon.png")}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{displayName}</Text>
            <Pressable
              style={styles.manageRow}
              onPress={() =>
                router.push({
                  pathname: "/(host)/edit-profile" as any,
                  params: { returnTo: "host" },
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
      </LinearGradient>

      {/* Scrollable list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>

        {/* Payments */}
        <Pressable style={styles.listRow} onPress={() => router.push("/(host)/payments" as any)}>
          <MaterialCommunityIcons
            name="bank-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.listRowLabel}>{t("payments.title")}</Text>
          {paymentsActive ? (
            <View style={styles.paymentStatus}>
              <View style={[styles.paymentStatusDot, { backgroundColor: "#2A7A3A" }]} />
              <Text style={[styles.paymentStatusText, { color: "#2A7A3A" }]} numberOfLines={1}>
                Active
              </Text>
            </View>
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          )}
        </Pressable>
        <View style={styles.divider} />

        {/* Language */}
        <Pressable style={styles.listRow} onPress={() => router.push("/(host)/language-settings" as any)}>
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
          onPress={() => router.push("/(host)/terms" as any)}
        >
          <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>Terms & Conditions</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />

        {/* Help */}
        <Pressable
          style={styles.listRow}
          onPress={() => router.push("/(host)/help" as any)}
        >
          <MaterialCommunityIcons name="help-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.listRowLabel}>Help</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>

      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.switchBtn} onPress={() => router.replace("/(tabs)/guest")}>
          <Text style={styles.switchBtnText}>{t("host.profile.switchGuest")}</Text>
        </Pressable>
      </View>

    </View>
  );
}
