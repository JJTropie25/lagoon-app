import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import LoadingCard from "../../../components/LoadingCard";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { useAuthState } from "../../../lib/auth";
import { addFavorite, fetchFavoriteIds, removeFavorite } from "../../../lib/favorites";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { type Service, type ServiceAmenities, toCategoryIcon } from "../../../lib/services";
import { addRecentlyViewedId } from "../../../lib/recentlyViewed";
import { useAppDialog } from "../../../components/AppDialogProvider";
import { fetchServiceReviews, type ServiceReview } from "../../../lib/reviews";

const IMAGE_HEIGHT = 280;

const CATEGORY_COLORS_SD: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};

function parseImageUrls(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith("[")) { try { return JSON.parse(imageUrl); } catch { return [imageUrl]; } }
  return [imageUrl];
}

function toRatingWord(rating: number, t: (k: string) => string): string {
  if (rating <= 3) return t("rating.poor");
  if (rating <= 5) return t("rating.fair");
  if (rating <= 7) return t("rating.good");
  if (rating <= 9) return t("rating.veryGood");
  return t("rating.excellent");
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },

    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    headerBg: {
      ...StyleSheet.absoluteFillObject,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    headerBtnOnImage: {
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    headerSummaryRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      overflow: "hidden",
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
      flexShrink: 1,
    },

    imageWrap: {
      height: IMAGE_HEIGHT,
      backgroundColor: c.surfaceSoft,
      overflow: "hidden",
    },
    imageFill: {
      width: "100%",
      height: "100%",
    },
    imageGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 110,
    },
    imagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    content: {
      backgroundColor: c.screenBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: -20,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
    },

    serviceName: {
      fontSize: 22,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 8,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    categoryBadgeText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },

    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    ratingBadge: {
      backgroundColor: c.textPrimary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    ratingText: {
      color: c.cardBackground,
      fontSize: 12,
      fontWeight: "600",
    },
    ratingTextWord: {
      color: c.cardBackground,
      fontSize: 11,
      fontWeight: "600",
      opacity: 0.8,
    },
    reviewCountText: {
      color: c.textMuted,
      fontSize: 13,
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    locationText: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 14,
    },
    mapBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.accent,
    },
    mapBtnText: {
      color: c.accent,
      fontSize: 12,
      fontWeight: "600",
    },

    infoText: {
      color: c.textSecondary,
      lineHeight: 20,
      fontWeight: "500",
      marginBottom: 12,
    },
    amenitiesWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    amenityChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    amenityChipText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },

    sectionLabel: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 2,
    },
    dateLabel: {
      fontSize: 13,
      color: c.textMuted,
      marginBottom: 4,
    },
    dayPanel: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 14,
      padding: 14,
    },
    dayPanelLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textMuted,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 12,
    },
    daySlots: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    dayNoSlots: {
      fontSize: 12,
      color: c.textMuted,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: 8,
      width: "100%",
    },
    timeChip: {
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: c.cardBackground,
      borderWidth: 1.5,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    timeChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
      textAlign: "center",
    },

    reviewCard: {
      backgroundColor: c.cardBackground,
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
    },
    reviewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
      alignItems: "center",
    },
    reviewAuthor: {
      fontWeight: "600",
      color: c.textPrimary,
    },
    reviewRating: {
      fontWeight: "600",
      color: c.textPrimary,
    },
    reviewText: {
      color: c.textSecondary,
      lineHeight: 19,
    },
    replyBlock: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    replyLabel: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: c.textMuted,
      marginBottom: 4,
    },
    replyText: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },

    legalNotice: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: "#EDF7FF",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
      alignItems: "flex-start",
    },
    legalNoticeDark: {
      backgroundColor: "#0A2A3F",
    },
    legalNoticeText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: "#1A4F8A",
    },
    legalNoticeTextDark: {
      color: "#7EC8E3",
    },
    legalNoticeTavolo: {
      backgroundColor: "#FFF0F5",
    },
    legalNoticeTavoloDark: {
      backgroundColor: "#3A0A20",
    },
    legalNoticeTextTavolo: {
      color: "#880E4F",
    },
    legalNoticeTextTavoloDark: {
      color: "#F48FB1",
    },

    pageDots: {
      position: "absolute",
      bottom: 10,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 5,
      pointerEvents: "none",
    } as any,
    pageDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    pageDotActive: {
      width: 14,
      backgroundColor: "#fff",
    },

    bookBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: c.screenBackground,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    bookBarInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 16,
    },
    priceBlock: {
      alignItems: "flex-end",
    },
    priceValue: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.warmAccent,
      lineHeight: 24,
    },
    priceLabel: {
      fontSize: 11,
      color: c.textSecondary,
    },
    bookButton: {
      paddingHorizontal: 22,
      paddingVertical: 14,
      backgroundColor: c.warmAccent,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: c.warmAccent,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
      elevation: 4,
    },
    bookButtonDisabled: {
      backgroundColor: c.warmAccentSoft,
      shadowOpacity: 0,
      elevation: 0,
    },
    bookText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
    },
  });
}

export default function ServiceDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useI18n();
  const { user } = useAuthState();
  const dialog = useAppDialog();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { destination, timeslot, people, microservice, serviceId } =
    useLocalSearchParams<{
      destination?: string;
      timeslot?: string;
      people?: string;
      microservice?: string;
      serviceId?: string;
    }>();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerOpaque, setHeaderOpaque] = useState(false);

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [IMAGE_HEIGHT - 60, IMAGE_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [IMAGE_HEIGHT - 20, IMAGE_HEIGHT + 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const [slots, setSlots] = useState<{ id: string; time: string; start: string; end: string }[]>([]);
  const [loadingService, setLoadingService] = useState(true);
  const [, setLoadingSlots] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [serviceTitle, setServiceTitle] = useState<string | null>(null);
  const [serviceLocation, setServiceLocation] = useState<string | null>(null);
  const [serviceDescription, setServiceDescription] = useState<string | null>(null);
  const [serviceCategory, setServiceCategory] = useState<string | null>(null);
  const [serviceAmenities, setServiceAmenities] = useState<ServiceAmenities | null>(null);
  const [serviceLatitude, setServiceLatitude] = useState<number | null>(null);
  const [serviceLongitude, setServiceLongitude] = useState<number | null>(null);
  const [servicePrice, setServicePrice] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!serviceId || !supabase) { setLoadingSlots(false); return; }
    const sb = supabase;
    setLoadingSlots(true);
    (async () => {
      try {
        const nowIso = new Date().toISOString();
        const [{ data: slotData }, bookedSlotStarts] = await Promise.all([
          sb
            .from("service_slots")
            .select("id, slot_start, slot_end")
            .eq("service_id", serviceId)
            .gte("slot_start", nowIso)
            .order("slot_start", { ascending: true }),
          // Try the public booked_slot_times view first; fall back to own bookings via RLS
          (sb as any)
            .from("booked_slot_times")
            .select("slot_start")
            .eq("service_id", serviceId)
            .gte("slot_start", nowIso)
            .then((r: any) => (r.data ?? []) as { slot_start: string }[])
            .catch(() =>
              sb
                .from("bookings")
                .select("slot_start")
                .eq("service_id", serviceId)
                .not("status", "in", '("cancelled_by_guest","cancelled_by_host")')
                .gte("slot_start", nowIso)
                .then((r: any) => r.data ?? [])
                .catch(() => [] as { slot_start: string }[])
            ),
        ]);
        if (!isMounted) return;
        const booked = new Set<string>((bookedSlotStarts as { slot_start: string }[]).map((b) => b.slot_start));
        const mapped = (slotData ?? [])
          .filter((row) => !booked.has(row.slot_start))
          .map((row) => {
            const start = new Date(row.slot_start);
            const time = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
            return { id: row.id, time, start: row.slot_start, end: row.slot_end };
          });
        setSlots(mapped);
        setLoadingSlots(false);
      } catch {
        if (isMounted) setLoadingSlots(false);
      }
    })();
    return () => { isMounted = false; };
  }, [serviceId]);

  useEffect(() => {
    let isMounted = true;
    if (!serviceId || !supabase) { setLoadingService(false); return; }
    setLoadingService(true);
    supabase
      .from("services")
      .select("title, location, image_url, description, category, amenities, latitude, longitude, price_eur")
      .eq("id", serviceId)
      .single()
      .then(({ data }) => {
        if (!isMounted) return;
        setImageUrls(parseImageUrls(data?.image_url));
        setServiceTitle(data?.title ?? null);
        setServiceLocation(data?.location ?? null);
        setServiceDescription(data?.description ?? null);
        setServiceCategory(data?.category ?? null);
        setServiceAmenities((data?.amenities as ServiceAmenities) ?? null);
        setServiceLatitude(data?.latitude ?? null);
        setServiceLongitude(data?.longitude ?? null);
        setServicePrice(data?.price_eur ?? null);
        setLoadingService(false);
      });
    return () => { isMounted = false; };
  }, [serviceId]);

  useEffect(() => {
    let isMounted = true;
    if (!user || !serviceId) { setIsFavorite(false); return; }
    fetchFavoriteIds(user.id).then((ids) => {
      if (!isMounted) return;
      setIsFavorite(ids.has(serviceId));
    });
    return () => { isMounted = false; };
  }, [serviceId, user]);

  useEffect(() => {
    if (!serviceId) return;
    addRecentlyViewedId(serviceId, user?.id);
  }, [serviceId, user?.id]);

  useFocusEffect(
    useMemo(
      () => () => {
        let mounted = true;
        if (!serviceId) { setReviews([]); return () => { mounted = false; }; }
        fetchServiceReviews(serviceId).then((data) => {
          if (!mounted) return;
          setReviews(data);
        });
        return () => { mounted = false; };
      },
      [serviceId]
    )
  );

  const toggleFavorite = async () => {
    if (!user || !serviceId) {
      await dialog.alert(t("favorites.title"), t("favorites.signIn"));
      return;
    }
    if (isFavorite) {
      const { error } = await removeFavorite(user.id, serviceId);
      if (error) { await dialog.alert(t("favorites.title"), error.message); return; }
      setIsFavorite(false);
    } else {
      const { error } = await addFavorite(user.id, serviceId);
      if (error) { await dialog.alert(t("favorites.title"), error.message); return; }
      setIsFavorite(true);
    }
  };

  const summaryTitle = serviceTitle ?? microservice ?? "-";
  const summaryLocation = serviceLocation ?? destination ?? "-";

  const normalizedCategory = useMemo(() => {
    const ALL_CATS = ["rest", "shower", "storage", "focus", "tavolo", "charge"];
    if (serviceCategory && ALL_CATS.includes(serviceCategory)) {
      return serviceCategory as Service["category"];
    }
    const value = String(microservice ?? "").toLowerCase();
    if (value.includes("rest")    || value.includes(t("category.rest").toLowerCase()))    return "rest";
    if (value.includes("shower")  || value.includes(t("category.shower").toLowerCase()))  return "shower";
    if (value.includes("focus")   || value.includes(t("category.focus").toLowerCase()))   return "focus";
    if (value.includes("tavolo")  || value.includes(t("category.tavolo").toLowerCase()))  return "tavolo";
    if (value.includes("charge")  || value.includes(t("category.charge").toLowerCase()))  return "charge";
    if (value.includes("storage") || value.includes(t("category.storage").toLowerCase())) return "storage";
    return null;
  }, [serviceCategory, microservice, t]);

  const requestedDate = useMemo(() => {
    const raw = String(timeslot ?? "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }, [timeslot]);

  const formattedDate = useMemo(() => {
    if (!requestedDate) return null;
    return requestedDate.toLocaleDateString(undefined, {
      day: "numeric", month: "long", year: "numeric",
    });
  }, [requestedDate]);

  const PANEL_GAP = 10;
  const PANEL_PADDING = 14;
  // ScrollView will be full-width (no parent clipping); contentPaddingH=16; peek≈20px
  const panelWidth = screenWidth - 16 - PANEL_GAP - 20;
  const chipWidth = Math.floor((panelWidth - PANEL_PADDING * 2 - 8 * 3) / 4);

  const groupedDays = useMemo(() => {
    const slotsByDay = new Map<string, string[]>();
    for (const slot of slots) {
      const d = new Date(slot.start);
      const key = d.toDateString();
      if (!slotsByDay.has(key)) slotsByDay.set(key, []);
      const list = slotsByDay.get(key)!;
      if (!list.includes(slot.time)) list.push(slot.time);
    }
    const base = requestedDate ? new Date(requestedDate.getTime()) : new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getTime());
      d.setDate(d.getDate() + i);
      const key = d.toDateString();
      return {
        dateKey: key,
        dayLabel: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
        hours: slotsByDay.get(key) ?? [],
      };
    });
  }, [slots, requestedDate]);

  const avgRating10 = useMemo(() => {
    if (!reviews.length) return null;
    return reviews.reduce((s, r) => s + r.rating_10, 0) / reviews.length;
  }, [reviews]);

  const ratingLabel = avgRating10 != null ? `${avgRating10.toFixed(1)}/10` : null;
  const ratingWord = avgRating10 != null ? toRatingWord(avgRating10, t) : null;

  const amenityItems = useMemo(() => {
    if (!serviceAmenities) return [];
    const items: { icon: string; text: string }[] = [];
    if (serviceAmenities.towels_included) items.push({ icon: "hanger", text: t("amenity.towels") });
    if (serviceAmenities.hair_dryer) items.push({ icon: "hair-dryer", text: t("amenity.hairDryer") });
    if (serviceAmenities.soap_included) items.push({ icon: "bottle-tonic-outline", text: t("amenity.soap") });
    if (serviceAmenities.open_24h) items.push({ icon: "hours-24", text: t("amenity.open24h") });
    if (serviceAmenities.dimensions) items.push({ icon: "cube-outline", text: t("amenity.dimensions").replace("{value}", serviceAmenities.dimensions) });
    if (serviceAmenities.quiet_location) items.push({ icon: "volume-off", text: t("amenity.quietLocation") });
    if (serviceAmenities.blanket) items.push({ icon: "weather-night", text: t("amenity.blanket") });
    if (serviceAmenities.sofa_or_bed) items.push({ icon: serviceAmenities.sofa_or_bed === "bed" ? "bed-king" : "sofa", text: t("amenity.sofaBed") });
    if (serviceAmenities.toilet_access) items.push({ icon: "toilet", text: t("amenity.toiletAccess") });
    if (serviceAmenities.wifi) items.push({ icon: "wifi", text: t("amenity.wifi") });
    if (serviceAmenities.ergonomic_chair) items.push({ icon: "chair-rolling", text: t("amenity.ergonomicChair") });
    if (serviceAmenities.isolated_space) items.push({ icon: "shield-home-outline", text: t("amenity.isolatedSpace") });
    if (serviceAmenities.adjustable_lighting) items.push({ icon: "brightness-6", text: t("amenity.adjustableLighting") });
    if (serviceAmenities.seats_count) items.push({ icon: "table-chair", text: t("amenity.seatsCount").replace("{count}", String(serviceAmenities.seats_count)) });
    if (serviceAmenities.voltage) items.push({ icon: "lightning-bolt", text: t("amenity.voltage").replace("{value}", String(serviceAmenities.voltage)) });
    if (serviceAmenities.outlet_count) items.push({ icon: "power-socket-eu", text: t("amenity.outletCount").replace("{count}", String(serviceAmenities.outlet_count)) });
    if (serviceAmenities.international_plug) items.push({ icon: "power-plug-outline", text: t("amenity.internationalPlug") });
    return items;
  }, [serviceAmenities, t]);

  const toggleSlot = (dateKey: string, h: string) => {
    const key = `${dateKey}__${h}`;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openMap = () => {
    const firstHour = Array.from(selectedSlots)[0]?.split('__')[1] ?? null;
    router.push({
      pathname: "/Directions",
      params: {
        microservice: summaryTitle,
        destination: summaryLocation,
        latitude: serviceLatitude != null ? String(serviceLatitude) : undefined,
        longitude: serviceLongitude != null ? String(serviceLongitude) : undefined,
        timeslot: firstHour ?? timeslot ?? "",
        people: people ?? "1",
        category: normalizedCategory ?? "",
      },
    });
  };

  const handleBooking = async () => {
    if (!user) { router.push("/(auth)/sign-in?continue=1"); return; }
    if (!serviceId || selectedSlots.size === 0) return;
    router.push({
      pathname: "/(tabs)/guest/Payment",
      params: {
        serviceId,
        slotsParam: Array.from(selectedSlots).join(','),
        destination: serviceLocation ?? destination ?? "",
        people,
        microservice: serviceTitle ?? microservice ?? "",
        category: normalizedCategory ?? "",
      },
    });
  };

  const catColor = normalizedCategory ? CATEGORY_COLORS_SD[normalizedCategory] : null;
  const catIcon = normalizedCategory ? toCategoryIcon(normalizedCategory) : null;

  if (loadingService) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <LoadingCard size={80} topSpacing={0} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>

      {/* Floating header — absolute, always on top */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            styles.headerBg,
            { opacity: headerBgOpacity, backgroundColor: catColor ?? colors.textPrimary },
          ]}
        />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[styles.headerBtn, !headerOpaque && styles.headerBtnOnImage]}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/guest")}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          <Animated.View style={[styles.headerSummaryRow, { opacity: titleOpacity }]}>
            {catIcon && (
              <MaterialCommunityIcons name={catIcon as any} size={14} color="#fff" />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {summaryTitle}
            </Text>
          </Animated.View>

          <TouchableOpacity
            style={[styles.headerBtn, !headerOpaque && styles.headerBtnOnImage]}
            onPress={toggleFavorite}
          >
            <MaterialCommunityIcons
              name={isFavorite ? "star" : "star-outline"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main scroll — images + content scroll together, bookBar stays fixed below */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (e: any) => {
              setHeaderOpaque(e.nativeEvent.contentOffset.y >= IMAGE_HEIGHT - 60);
            },
          }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {/* Image gallery — first item inside scroll so it scrolls away naturally */}
        <View style={styles.imageWrap}>
          {imageUrls.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                setActiveImageIdx(idx);
              }}
            >
              {imageUrls.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={{ width: screenWidth, height: IMAGE_HEIGHT }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-outline" size={52} color={colors.textMuted} />
            </View>
          )}
          {imageUrls.length > 1 && (
            <View style={styles.pageDots}>
              {imageUrls.map((_, i) => (
                <View key={i} style={[styles.pageDot, i === activeImageIdx && styles.pageDotActive]} />
              ))}
            </View>
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent"]}
            style={styles.imageGradient}
          />
        </View>

        {/* Content card — marginTop:-20 creates the rounded overlap with the image */}
        <View style={styles.content}>

          {/* Section 1: name + category */}
          <View style={styles.section}>
            <Text style={styles.serviceName}>{summaryTitle}</Text>
            {catColor && catIcon && (
              <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
                <MaterialCommunityIcons name={catIcon as any} size={13} color="#fff" />
                <Text style={styles.categoryBadgeText}>
                  {normalizedCategory ? t(`category.${normalizedCategory}`) : ""}
                </Text>
              </View>
            )}
            {(normalizedCategory === "shower" || normalizedCategory === "rest") && (
              <View style={[styles.legalNotice, mode === "dark" && styles.legalNoticeDark]}>
                <MaterialCommunityIcons name="shield-check-outline" size={16} color={mode === "dark" ? "#7EC8E3" : "#1A4F8A"} style={{ marginTop: 1 }} />
                <Text style={[styles.legalNoticeText, mode === "dark" && styles.legalNoticeTextDark]}>
                  Servizio erogato da struttura ricettiva autorizzata. All'arrivo è obbligatorio esibire un documento d'identità valido per la registrazione di legge (TULPS).
                </Text>
              </View>
            )}
            {normalizedCategory === "tavolo" && (
              <View style={[styles.legalNotice, styles.legalNoticeTavolo, mode === "dark" && styles.legalNoticeTavoloDark]}>
                <MaterialCommunityIcons name="information-outline" size={16} color={mode === "dark" ? "#F48FB1" : "#880E4F"} style={{ marginTop: 1 }} />
                <Text style={[styles.legalNoticeText, styles.legalNoticeTextTavolo, mode === "dark" && styles.legalNoticeTextTavoloDark]}>
                  Spazio neutro destinato alla sosta e al consumo di pasti propri. La qualità e l'igiene del cibo portato da fuori sono sotto la responsabilità dell'utente.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Section 2: rating + location + description + amenities */}
          <View style={styles.section}>
            {ratingLabel && (
              <View style={styles.ratingRow}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>{ratingLabel}</Text>
                  {ratingWord && (
                    <Text style={styles.ratingTextWord}>{"· " + ratingWord}</Text>
                  )}
                </View>
                {reviews.length > 0 && (
                  <Text style={styles.reviewCountText}>
                    {t("card.reviewCount").replace("{count}", String(reviews.length))}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={2}>{summaryLocation}</Text>
              {serviceLatitude != null && serviceLongitude != null && (
                <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
                  <MaterialCommunityIcons name="map-outline" size={13} color={colors.accent} />
                  <Text style={styles.mapBtnText}>Mappa</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.infoText}>
              {serviceDescription ??
                t("service.descriptionFallback", {
                  title: summaryTitle,
                  location: summaryLocation,
                })}
            </Text>

            {amenityItems.length > 0 && (
              <View style={styles.amenitiesWrap}>
                {amenityItems.map((item, i) => (
                  <View key={i} style={styles.amenityChip}>
                    <MaterialCommunityIcons name={item.icon as any} size={13} color={colors.textSecondary} />
                    <Text style={styles.amenityChipText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Section 3 label — inside section for padding */}
          <View style={[styles.section, { paddingBottom: 0 }]}>
            <Text style={styles.sectionLabel}>{t("service.availableTimes")}</Text>
          </View>
          {/* Day-panel calendar — direct child of content so no parent clips the horizontal scroll */}
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={panelWidth + PANEL_GAP}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 16, gap: PANEL_GAP, paddingVertical: 12 }}
          >
            {groupedDays.map(({ dateKey, dayLabel, hours }) => (
              <View key={dateKey} style={[styles.dayPanel, { width: panelWidth }]}>
                <Text style={styles.dayPanelLabel}>{dayLabel}</Text>
                <View style={styles.daySlots}>
                  {hours.length === 0 ? (
                    <Text style={styles.dayNoSlots}>{t("slot.noAvailable")}</Text>
                  ) : hours.map((h) => {
                    const slotKey = `${dateKey}__${h}`;
                    const isSelected = selectedSlots.has(slotKey);
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.timeChip,
                          { width: chipWidth },
                          isSelected && {
                            borderColor: catColor ?? colors.accent,
                            backgroundColor: catColor ?? colors.accent,
                          },
                        ]}
                        onPress={() => toggleSlot(dateKey, h)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            isSelected && { color: "#fff", fontWeight: "700" },
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {reviews.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t("service.reviews")}</Text>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                      <Text style={styles.reviewRating}>{review.rating_10}/10</Text>
                    </View>
                    <Text style={styles.reviewText}>{review.description}</Text>
                    {review.host_reply ? (
                      <View style={styles.replyBlock}>
                        <Text style={styles.replyLabel}>Host response</Text>
                        <Text style={styles.replyText}>{review.host_reply}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          )}

        </View>
      </Animated.ScrollView>

      {/* Fixed book bar: price left + button right */}
      <View style={[styles.bookBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bookBarInner}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceValue}>
              {servicePrice != null
                ? selectedSlots.size > 0
                  ? `€${(servicePrice * selectedSlots.size).toFixed(2)}`
                  : `€${servicePrice.toFixed(2)}`
                : "—"}
            </Text>
            <Text style={styles.priceLabel}>
              {selectedSlots.size > 1
                ? `${selectedSlots.size} slot × €${servicePrice?.toFixed(2)}`
                : "/ slot"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookButton, selectedSlots.size === 0 && styles.bookButtonDisabled]}
            disabled={selectedSlots.size === 0}
            onPress={handleBooking}
          >
            <Text style={styles.bookText}>{t("service.bookNow")}</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}
