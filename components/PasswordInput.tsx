import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = Omit<TextInputProps, "secureTextEntry"> & { iconColor?: string };

// Password field with an eye button to show/hide what's being typed.
export default function PasswordInput({ style, iconColor = "#4F9B9B", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrapper}>
      <TextInput
        {...props}
        style={[style, styles.input]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={styles.eye}
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <MaterialCommunityIcons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={iconColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: "center" },
  input: { paddingRight: 44 },
  eye: { position: "absolute", right: 12, height: "100%", justifyContent: "center" },
});
