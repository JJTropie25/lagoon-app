import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    iconWrap: { marginBottom: 12 },
    title: {
      fontSize: 24,
      fontWeight: "600",
      color: c.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 28,
      textAlign: "center",
    },
    button: {
      backgroundColor: c.textPrimary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    buttonText: {
      color: c.background,
      fontWeight: "600",
    },
  });
}

export default function CheckInConfirmed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { mode } = useLocalSearchParams<{ mode?: string }>();

  const isCheckout = mode === "checkout";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={isCheckout ? "check-all" : "check-circle"}
            size={86}
            color="#2FA46D"
          />
        </View>
        <Text style={styles.title}>
          {isCheckout ? "Prenotazione completata" : "Check-in confermato"}
        </Text>
        <Text style={styles.subtitle}>
          {isCheckout
            ? "Il servizio è stato erogato correttamente."
            : "Il guest è stato registrato con successo."}
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/(host)/reservations")}
        >
          <Text style={styles.buttonText}>Torna alle prenotazioni</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
