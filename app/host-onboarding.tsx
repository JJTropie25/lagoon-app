import { View, Text, StyleSheet, Pressable } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthState } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.screenBackground,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 12,
    },
    title: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: "600",
    },
    body: {
      color: c.textPrimary,
      textAlign: "center",
    },
    button: {
      marginTop: 12,
      backgroundColor: c.warmAccent,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 10,
    },
    buttonText: {
      color: c.background,
      fontWeight: "600",
    },
  });
}

export default function HostOnboarding() {
  const router = useRouter();
  const { user } = useAuthState();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [status, setStatus] = useState<"loading" | "active" | "inactive">("loading");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase || !user) {
        setStatus("inactive");
        return;
      }
      const { data } = await supabase
        .from("hosts")
        .select("stripe_onboarding_complete")
        .eq("guest_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      setStatus(data?.stripe_onboarding_complete ? "active" : "inactive");
    };
    load().catch(() => setStatus("inactive"));
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payments onboarding</Text>
      <Text style={styles.body}>
        {status === "loading"
          ? "Checking your Stripe status..."
          : status === "active"
          ? "Your payouts are active. You can now accept bookings."
          : "Your payouts are not active yet. Please complete the onboarding steps."}
      </Text>
      <Pressable style={styles.button} onPress={() => router.replace("/(host)/profile")}>
        <Text style={styles.buttonText}>Back to profile</Text>
      </Pressable>
    </View>
  );
}