import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../lib/theme-context";
import LagoonLogo from "./LagoonLogo";

export default function LoginGate({ message }: { message?: string }) {
  const router = useRouter();
  const { colors, mode } = useTheme();
  const { width } = useWindowDimensions();
  const logoSize = Math.round(width * 0.38);
  const isDark = mode === "dark";

  return (
    <View style={styles.container}>
      <LagoonLogo
        size={logoSize}
        tile={false}
        variant="light"
        flatColor={isDark ? "rgba(226,242,242,0.18)" : "rgba(11,63,63,0.12)"}
      />
      <Text style={[styles.title, { color: isDark ? "#E2F2F2" : colors.textPrimary }]}>
        Accedi per continuare
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? "rgba(226,242,242,0.65)" : colors.textSecondary }]}>
        {message ?? "Devi essere connesso per accedere a questa sezione."}
      </Text>
      <Pressable
        style={[styles.btn, { backgroundColor: colors.warmAccent }]}
        onPress={() => router.push("/(auth)/sign-in?continue=1")}
      >
        <Text style={styles.btnText}>Accedi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 44,
    borderRadius: 10,
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
