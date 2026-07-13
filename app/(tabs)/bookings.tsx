import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { parseFirstImageUrl } from "../../lib/services";
import { useAuthState } from "../../lib/auth";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import TabTopNotch from "../../components/TabTopNotch";
import LoadingCard from "../../components/LoadingCard";
import { toCategoryIcon } from "../../lib/services";

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};

type BookingItem = {
  id: string;
  title: string;
  destination: string;
  timeslot: string;
  people: string;
  serviceId: string;
  hasReview: boolean;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  category?: "rest" | "shower" | "storage" | null;
  slotStart: string;
};

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: { paddingBottom: 24 },
    pageTitle: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      marginBottom: 12,
      color: c.textPrimary,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginHorizontal: 16,
    },
    card: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: c.listBackground,
      minHeight: 160,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOpacity: 0.10,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
      overflow: "hidden",
    },
    cardExpired: {
      opacity: 0.7,
    },
    cardImageWrap: {
      width: 110,
      flexShrink: 0,
      paddingVertical: 10,
      paddingLeft: 12,
      paddingRight: 8,
    },
    cardImage: {
      flex: 1,
      borderRadius: 8,
      backgroundColor: c.surfaceSoft,
    },
    cardContent: {
      flex: 1,
      paddingVertical: 12,
      paddingRight: 12,
    },
    cardTitle: {
      fontWeight: "600",
      fontSize: 14,
      color: c.textPrimary,
      marginBottom: 4,
    },
    textExpired: {
      color: c.textMuted,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 5,
      marginBottom: 6,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    categoryBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "600",
    },
    expiredBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: c.surface,
    },
    expiredBadgeText: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    infoRows: {
      gap: 3,
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    infoText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
      flexShrink: 1,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: "auto",
    },
    btnOutline: {
      flex: 1,
      height: 32,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: c.accent,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    btnOutlineText: {
      color: c.accent,
      fontWeight: "600",
      fontSize: 12,
    },
    btnFilled: {
      flex: 1,
      height: 32,
      borderRadius: 7,
      backgroundColor: c.accent,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    btnReview: {
      backgroundColor: c.warmAccentDark,
    },
    btnFilledText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 12,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    loadingWrap: {
      paddingTop: 60,
      alignItems: "center" as const,
    },
    emptyText: {
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 24,
      fontWeight: "600",
      paddingHorizontal: 16,
    },
  });
}

export default function Bookings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuthState();
  const isFocused = useIsFocused();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderImage = require("../../assets/images/react-logo.png");
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    const sb = supabase;
    if (!sb || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await sb
        .from("bookings")
        .select(
          "id, slot_start, slot_end, people_count, service:services(id, title, location, latitude, longitude, image_url, category)"
        )
        .eq("guest_id", user.id)
        .order("slot_start", { ascending: false });

      const mapped: BookingItem[] =
        (data ?? []).map((row: any) => {
          const start = new Date(row.slot_start);
          const timeslot = `${start.getFullYear()}-${String(
            start.getMonth() + 1
          ).padStart(2, "0")}-${String(start.getDate()).padStart(
            2,
            "0"
          )} ${String(start.getHours()).padStart(2, "0")}:${String(
            start.getMinutes()
          ).padStart(2, "0")}`;
          return {
            id: row.id,
            title: row.service?.title ?? "-",
            destination: row.service?.location ?? "-",
            timeslot,
            people: String(row.people_count ?? 1),
            serviceId: row.service?.id ?? "",
            hasReview: false,
            latitude: row.service?.latitude,
            longitude: row.service?.longitude,
            imageUrl: parseFirstImageUrl(row.service?.image_url) ?? null,
            category: row.service?.category ?? null,
            slotStart: row.slot_start,
          };
        });

      const bookingIds = mapped.map((item) => item.id);
      if (bookingIds.length > 0) {
        const { data: reviews } = await sb
          .from("service_reviews")
          .select("booking_id")
          .in("booking_id", bookingIds);
        const reviewedIds = new Set((reviews ?? []).map((row: any) => row.booking_id));
        mapped.forEach((item) => {
          item.hasReview = reviewedIds.has(item.id);
        });
      }
      setBookings(mapped);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isFocused) {
      loadBookings();
    }
  }, [isFocused, loadBookings]);

  const emptyState = useMemo(() => {
    if (!user) return t("bookings.signIn");
    return t("bookings.empty");
  }, [t, user]);

  const renderItem = ({ item }: { item: BookingItem }) => {
    const isExpired = new Date(item.slotStart).getTime() < Date.now();
    const catColor = item.category
      ? (CATEGORY_COLORS[item.category] ?? colors.textSecondary)
      : null;
    const catIcon = item.category ? toCategoryIcon(item.category) : null;

    return (
      <View style={[styles.card, isExpired && styles.cardExpired]}>
        <View style={styles.cardImageWrap}>
          <Image
            source={item.imageUrl ? { uri: item.imageUrl } : placeholderImage}
            style={styles.cardImage}
            resizeMode="cover"
          />
        </View>
        <View style={styles.cardContent}>
          <Text
            style={[styles.cardTitle, isExpired && styles.textExpired]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {catColor && catIcon ? (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: isExpired ? colors.surfaceSoft : catColor },
                ]}
              >
                <MaterialCommunityIcons name={catIcon as any} size={11} color="#fff" />
                <Text style={styles.categoryBadgeText} numberOfLines={1}>
                  {t(`category.${item.category}`)}
                </Text>
              </View>
            ) : null}
            {isExpired ? (
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>{t("booking.expired")}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText} numberOfLines={1}>{item.timeslot}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText} numberOfLines={1}>{item.destination}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="account-group"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText}>{item.people}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            {isExpired ? (
              <Pressable
                style={[styles.btnFilled, styles.btnReview, item.hasReview && styles.btnDisabled]}
                onPress={() =>
                  router.push({
                    pathname: "/LeaveReview",
                    params: {
                      bookingId: item.id,
                      serviceId: item.serviceId,
                      microservice: item.title,
                      destination: item.destination,
                      timeslot: item.timeslot,
                    },
                  })
                }
                disabled={item.hasReview}
              >
                <Text
                  style={styles.btnFilledText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {item.hasReview ? t("review.alreadySubmitted") : t("review.leave")}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.btnFilled}
                onPress={() =>
                  router.push({
                    pathname: "/ManageBooking",
                    params: {
                      bookingId: item.id,
                      from: "bookings",
                      microservice: item.title,
                      destination: item.destination,
                      timeslot: item.timeslot,
                      people: item.people,
                      latitude: item.latitude != null ? String(item.latitude) : undefined,
                      longitude: item.longitude != null ? String(item.longitude) : undefined,
                    },
                  })
                }
              >
                <Text
                  style={styles.btnFilledText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {t("booking.manage")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />
      <TabTopNotch />
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 58 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.pageTitle}>{t("bookings.title")}</Text>
        }
        ListEmptyComponent={
          loading
            ? <LoadingCard />
            : <Text style={styles.emptyText}>{emptyState}</Text>
        }
        renderItem={renderItem}
      />
    </View>
  );
}