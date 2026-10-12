import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";

type Props = {
  mapRef?: unknown;
  destinationCoords?: unknown;
  origin?: unknown;
  route?: unknown;
  microservice?: string;
  destination?: string;
  title: string;
  body: string;
  back: string;
  onBack: () => void;
};

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    webFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
    },
    webTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: c.textPrimary,
    },
    webText: {
      color: c.textPrimary,
      textAlign: "center",
    },
    webButton: {
      marginTop: 8,
      backgroundColor: c.textPrimary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
    },
    webButtonText: {
      color: c.background,
      fontWeight: "600",
    },
  });
}

export default function DirectionsMapWeb({ title, body, back, onBack }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.webFallback}>
      <Text style={styles.webTitle}>{title}</Text>
      <Text style={styles.webText}>{body}</Text>
      <TouchableOpacity style={styles.webButton} onPress={onBack}>
        <Text style={styles.webButtonText}>{back}</Text>
      </TouchableOpacity>
    </View>
  );
}