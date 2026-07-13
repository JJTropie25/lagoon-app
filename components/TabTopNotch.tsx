import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthState } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import { LagoonLockup } from "./LagoonLockup";

type TabTopNotchProps = {
  hideBell?: boolean;
  hostMode?: boolean;
  transparent?: boolean;
};

function makeStyles(c: ThemeColors, isDark: boolean, transparent: boolean) {
  return StyleSheet.create({
    fixedNotch: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 48,
      backgroundColor: transparent ? "transparent" : c.screenBackground,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "flex-start",
      paddingLeft: 14,
      zIndex: 50,
      shadowColor: "#000",
      shadowOpacity: transparent ? 0 : (isDark ? 0 : 0.08),
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: transparent ? 0 : (isDark ? 0 : 4),
    },
    bellButton: {
      position: "absolute",
      right: 14,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeDot: {
      position: "absolute",
      top: 7,
      right: 7,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.warmAccent,
    },
    hostBadge: {
      marginLeft: 8,
      backgroundColor: "#E87722",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    hostBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
  });
}

export default function TabTopNotch({ hideBell, hostMode, transparent = false }: TabTopNotchProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const styles = useMemo(() => makeStyles(colors, isDark, transparent), [colors, isDark, transparent]);
  const [unreadCount, setUnreadCount] = useState(0);
  const loadCount = useCallback(async () => {
    if (!supabase || !user?.id) {
      setUnreadCount(0);
      return;
    }
    const sb = supabase;
    const { count } = await sb
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    setUnreadCount(count ?? 0);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCount().catch(() => null);
    }, [loadCount])
  );

  useEffect(() => {
    if (!supabase || !user?.id) return;
    const sb = supabase;
    loadCount().catch(() => null);

    const channel = sb
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadCount().catch(() => null)
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [user?.id, loadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadCount().catch(() => null);
      }
    });
    return () => sub.remove();
  }, [loadCount]);

  return (
    <View style={[styles.fixedNotch, { top: insets.top }]}>
      <LagoonLockup size={30} onDark={isDark} />
      {hostMode ? (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>Host mode</Text>
        </View>
      ) : null}
      {!hideBell ? (
        <Pressable
          style={styles.bellButton}
          onPress={() => router.push("/notifications")}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.textSecondary} />
          {unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}