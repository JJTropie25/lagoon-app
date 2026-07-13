import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../../lib/i18n";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";

const HEADER_COLOR = "#4F9B9B";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },

    header: {
      position: "absolute",
      top: 0, left: 0, right: 0,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: HEADER_COLOR,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 15, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
    },

    content: { paddingHorizontal: 16 },

    // Card with single selector row
    card: {
      backgroundColor: c.listBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    selectorRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    selectorFlag: { fontSize: 22 },
    selectorLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: c.textPrimary,
    },
    selectorHint: {
      fontSize: 12,
      color: c.textMuted,
      marginBottom: 6,
    },

    // Language picker modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: c.screenBackground,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 16, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    optionFlag: { fontSize: 22, width: 30 },
    optionLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
      color: c.textPrimary,
    },
    optionLabelActive: {
      fontWeight: "700",
      color: HEADER_COLOR,
    },
  });
}

export default function Language() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const headerH = insets.top + 52;

  const options = [
    { code: "en", label: t("language.english"), flag: "🇬🇧" },
    { code: "it", label: t("language.italian"), flag: "🇮🇹" },
    { code: "es", label: t("language.spanish"), flag: "🇪🇸" },
    { code: "zh", label: t("language.chinese"), flag: "🇨🇳" },
    { code: "de", label: t("language.german"), flag: "🇩🇪" },
    { code: "fr", label: t("language.french"), flag: "🇫🇷" },
    { code: "ja", label: t("language.japanese"), flag: "🇯🇵" },
  ] as const;

  const current = options.find((o) => o.code === language) ?? options[0];

  return (
    <View style={styles.screen}>

      {/* Fixed teal header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)/profile");
        }}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("language.title")}</Text>
      </View>

      <View style={[styles.content, { paddingTop: headerH + 24 }]}>
        <Text style={styles.selectorHint}>{t("language.title")}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.selectorRow} onPress={() => setOpen(true)} activeOpacity={0.7}>
            <Text style={styles.selectorFlag}>{current.flag}</Text>
            <Text style={styles.selectorLabel}>{current.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language picker bottom sheet */}
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("language.title")}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={styles.optionRow}
                  onPress={() => { setLanguage(opt.code); setOpen(false); }}
                >
                  <Text style={styles.optionFlag}>{opt.flag}</Text>
                  <Text style={[styles.optionLabel, language === opt.code && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  {language === opt.code && (
                    <MaterialCommunityIcons name="check" size={18} color={HEADER_COLOR} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
