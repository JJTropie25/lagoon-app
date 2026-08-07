import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Action = {
  label: string;
  onPress?: () => void;
  badge?: boolean;
};

export default function ResultsActionBar({ actions }: { actions: Action[] }) {
  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={styles.button}
          onPress={action.onPress}
        >
          <Text
            style={styles.buttonText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {action.label}
          </Text>
          {action.badge ? <View style={styles.badge} /> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  button: {
    flex: 1,
    height: 36,
    marginHorizontal: 4,
    paddingHorizontal: 6,
    backgroundColor: "#4F9B9B",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#4F9B9B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
