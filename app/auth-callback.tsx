import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BrandedLoader from "../components/BrandedLoader";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import { useAuthLinkResult } from "../lib/authLinks";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.screenBackground,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 24,
    },
    message: {
      color: c.textPrimary,
      fontWeight: "600",
      textAlign: "center",
    },
    button: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 99,
      backgroundColor: c.warmAccent,
    },
    buttonText: { color: c.background, fontWeight: "700" },
  });
}

// Landing screen for auth deep links (lagoon://auth-callback). The link itself is
// processed at the app root (lib/authLinks); this screen waits for the outcome.
export default function AuthCallback() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const result = useAuthLinkResult();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (result.status === "done") {
      if (result.recovery) {
        router.replace({ pathname: "/(tabs)/profile/Edit", params: { field: "password" } });
      } else {
        router.replace("/(tabs)/guest");
      }
      return;
    }
    if (result.status === "error") {
      setMessage(result.message);
      return;
    }
    if (result.status === "processing") return;

    // No auth link arrived: fall back to whatever session we already have.
    const timer = setTimeout(async () => {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (data.session) router.replace("/(tabs)/guest");
      else setMessage("Link non valido o già utilizzato. Accedi di nuovo.");
    }, 4000);
    return () => clearTimeout(timer);
  }, [result, router]);

  return (
    <View style={styles.container}>
      {message ? (
        <>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.button} onPress={() => router.replace("/(auth)/sign-in")}>
            <Text style={styles.buttonText}>Vai al login</Text>
          </Pressable>
        </>
      ) : (
        <BrandedLoader size={64} />
      )}
    </View>
  );
}
