import { useMemo, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TextInput, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import { useAuthState } from "../lib/auth";
import { submitServiceReview } from "../lib/reviews";
import { useAppDialog } from "../components/AppDialogProvider";
import { useI18n } from "../lib/i18n";

const CARD_RADIUS = 10;

function ratingWord(rating: number, t: (k: string) => string): string {
  if (rating <= 3) return t("rating.poor");
  if (rating <= 5) return t("rating.fair");
  if (rating <= 7) return t("rating.good");
  if (rating <= 9) return t("rating.veryGood");
  return t("rating.excellent");
}

function ratingColor(rating: number, c: ThemeColors): string {
  if (rating <= 3) return "#B94040";
  if (rating <= 5) return c.warmAccent;
  if (rating <= 7) return c.warmAccentDark;
  if (rating <= 9) return c.accent;
  return "#2A7A3A";
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: { padding: 16, paddingBottom: 32 },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    pageTitle: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.surface,
      marginBottom: 20,
    },
    card: {
      backgroundColor: c.cardBackground,
      borderRadius: CARD_RADIUS,
      padding: 16,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOpacity: 0.24,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 6 },
      elevation: 7,
    },
    cardTitle: {
      fontWeight: "600",
      fontSize: 15,
      color: c.textPrimary,
      marginBottom: 10,
    },
    infoRows: {
      gap: 6,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    infoText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textPrimary,
      flexShrink: 1,
    },
    sectionTitle: {
      fontWeight: "600",
      fontSize: 14,
      color: c.textPrimary,
      marginBottom: 12,
    },
    ratingDisplay: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 2,
      marginBottom: 4,
    },
    ratingNumber: {
      fontSize: 52,
      fontWeight: "700",
      lineHeight: 56,
    },
    ratingOutOf: {
      fontSize: 22,
      fontWeight: "600",
      color: c.textSecondary,
      marginBottom: 6,
    },
    ratingWord: {
      textAlign: "center",
      fontWeight: "600",
      fontSize: 14,
      marginBottom: 10,
    },
    slider: {
      width: "100%",
      height: 40,
    },
    sliderEndLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: -4,
    },
    sliderEndLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
    },
    input: {
      minHeight: 100,
      borderWidth: 1,
      borderColor: c.surfaceSoft,
      borderRadius: CARD_RADIUS,
      backgroundColor: c.surface,
      padding: 12,
      textAlignVertical: "top",
      color: c.textPrimary,
      fontWeight: "500",
      fontSize: 14,
    },
    submitBtn: {
      height: 48,
      borderRadius: CARD_RADIUS,
      backgroundColor: c.warmAccentDark,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 12,
      shadowColor: c.warmAccentDark,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 15,
    },
  });
}

export default function LeaveReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useAppDialog();
  const { t } = useI18n();
  const { user } = useAuthState();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { bookingId, serviceId, microservice, destination, timeslot } = useLocalSearchParams<{
    bookingId?: string;
    serviceId?: string;
    microservice?: string;
    destination?: string;
    timeslot?: string;
  }>();

  const [rating, setRating] = useState<number>(8);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const word = ratingWord(rating, t);
  const trackColor = ratingColor(rating, colors);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/bookings"))}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.surface} />
        </Pressable>

        <Text style={styles.pageTitle}>{t("review.title")}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{microservice ?? "-"}</Text>
          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{destination ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>{timeslot ?? "-"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("review.scoreLabel")}</Text>

          <View style={styles.ratingDisplay}>
            <Text style={[styles.ratingNumber, { color: trackColor }]}>{rating}</Text>
            <Text style={styles.ratingOutOf}>/10</Text>
          </View>
          <Text style={[styles.ratingWord, { color: trackColor }]}>{word}</Text>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={rating}
            onValueChange={(v) => setRating(Math.round(v))}
            minimumTrackTintColor={trackColor}
            maximumTrackTintColor={colors.surfaceSoft}
            thumbTintColor={trackColor}
          />

          <View style={styles.sliderEndLabels}>
            <Text style={styles.sliderEndLabel}>0</Text>
            <Text style={styles.sliderEndLabel}>10</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("review.descriptionLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("review.placeholder")}
            placeholderTextColor={colors.textSecondary}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          disabled={submitting}
          onPress={async () => {
            if (!user?.id || !bookingId || !serviceId) {
              await dialog.alert(t("review.title"), t("review.missingData"));
              return;
            }
            if (!description.trim()) {
              await dialog.alert(t("review.title"), t("review.missingDescription"));
              return;
            }
            setSubmitting(true);
            const error = await submitServiceReview({
              bookingId,
              serviceId,
              guestId: user.id,
              rating10: rating,
              description: description.trim(),
            });
            setSubmitting(false);
            if (error) {
              await dialog.alert(t("review.title"), error);
              return;
            }
            await dialog.alert(t("review.title"), t("review.sent"));
            router.replace("/(tabs)/bookings");
          }}
        >
          <Text
            style={styles.submitBtnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {submitting ? t("review.sending") : t("review.submit")}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
