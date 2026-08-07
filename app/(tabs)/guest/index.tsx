import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import ServiceCard from "../../../components/ServiceCard";
import UIDateTimeField from "../../../components/UIDateTimeField";
import TabTopNotch from "../../../components/TabTopNotch";
import LocationPickerModal from "../../../components/LocationPickerModal";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n } from "../../../lib/i18n";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import {
  fetchServices,
  toPriceLabel,
  toCategoryIcon,
  toDistanceLabel,
  parseFirstImageUrl,
  Service,
} from "../../../lib/services";
import { fetchPOIs, nearestPOI, POI } from "../../../lib/poi";
import { useAuthState } from "../../../lib/auth";
import { addFavorite, fetchFavoriteIds, removeFavorite } from "../../../lib/favorites";
import { getRecentlyViewedIds } from "../../../lib/recentlyViewed";
import { type PlaceSuggestion, searchPlaceSuggestions } from "../../../lib/geocoding";

const CATEGORY_COLORS: Record<string, { active: string }> = {
  rest:    { active: "#1A4F8A" },
  shower:  { active: "#5BB5CC" },
  storage: { active: "#C8930A" },
  focus:   { active: "#C62828" },
  tavolo:  { active: "#C2185B" },
  charge:  { active: "#2E7D32" },
};


function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: { padding: 16, paddingBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Baloo2_700Bold", marginTop: 10, marginBottom: 12, color: c.textPrimary },
    card: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 4,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    categoryGrid: { gap: 8, marginBottom: 4 },
    categoryInfoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 10,
      marginBottom: 2,
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    categoryInfoText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: "rgba(255,255,255,0.92)",
      fontStyle: "italic",
    },
    categoryRow: { flexDirection: "row", gap: 8 },
    catBtn: {
      flex: 1,
      height: 64,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    catLabel: { fontSize: 13, fontWeight: "600", color: c.textPrimary },
    divider: { height: 1, backgroundColor: c.surfaceSoft, marginVertical: 2 },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 4,
    },
    fieldText: { flex: 1, fontSize: 16, fontWeight: "600", color: c.textPrimary },
    fieldPlaceholder: { color: c.textMuted, fontWeight: "400" },
    flatField: { borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 },
    searchBtn: { marginTop: 12, padding: 16, borderRadius: 12, alignItems: "center" },
    searchBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    warning: { marginTop: 8, color: c.warmAccentDark, fontSize: 12, fontWeight: "600" },
    hList: { overflow: "visible", marginHorizontal: -16 },
    hListContent: { paddingVertical: 8, paddingHorizontal: 18 },
  });
}

// Card width (170) + marginRight (12) = total slot width used in getItemLayout
const CARD_SNAP_W = 182;

function InfiniteHList({
  data,
  renderCard,
  listStyle,
  contentStyle,
}: {
  data: Service[];
  renderCard: (item: Service) => React.ReactElement;
  listStyle?: object;
  contentStyle?: object;
}) {
  const ref = useRef<FlatList<Service>>(null);

  const tripled = useMemo(
    () => (data.length > 0 ? [...data, ...data, ...data] : []),
    [data]
  );

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (data.length === 0) return;
      const x = e.nativeEvent.contentOffset.x;
      // span = one copy's worth of cards; offsets are relative to content origin (after 18px padding)
      const span = data.length * CARD_SNAP_W;
      const lo = 18 + span;       // start of second copy
      const hi = 18 + span * 2;   // start of third copy
      if (x < lo) {
        ref.current?.scrollToOffset({ offset: x + span, animated: false });
      } else if (x >= hi) {
        ref.current?.scrollToOffset({ offset: x - span, animated: false });
      }
    },
    [data.length]
  );

  if (data.length === 0) return null;

  return (
    <FlatList
      ref={ref}
      data={tripled}
      keyExtractor={(_, idx) => String(idx)}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={listStyle}
      contentContainerStyle={contentStyle}
      initialScrollIndex={data.length}
      getItemLayout={(_, index) => ({
        length: CARD_SNAP_W,
        offset: 18 + CARD_SNAP_W * index,
        index,
      })}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
      renderItem={({ item }) => renderCard(item)}
    />
  );
}

export default function GuestHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const categories = [
    { key: "rest",    label: t("category.rest"),    icon: "bed-king"             },
    { key: "shower",  label: t("category.shower"),  icon: "shower"               },
    { key: "storage", label: t("category.storage"), icon: "locker"               },
    { key: "focus",   label: t("category.focus"),   icon: "laptop"               },
    { key: "tavolo",  label: t("category.tavolo"),  icon: "silverware-fork-knife"},
    { key: "charge",  label: t("category.charge"),  icon: "lightning-bolt"       },
  ];

  const [microservice, setMicroservice] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [searchingDestination, setSearchingDestination] = useState(false);

  const placeholderImage = require("../../../assets/images/react-logo.png");
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pois, setPois] = useState<POI[]>([]);

  const NEUTRAL_COLOR = "#0B3F3F";
  const activeCategoryKey = categories.find(c => c.label === microservice)?.key ?? null;
  const accentColor = activeCategoryKey ? CATEGORY_COLORS[activeCategoryKey].active : NEUTRAL_COLOR;
  const isColored   = Boolean(activeCategoryKey);
  const cardBg      = isColored ? accentColor : colors.cardBackground;
  const onCard      = isColored ? "#fff" : colors.textPrimary;
  const onMuted     = isColored ? "rgba(255,255,255,0.6)" : colors.textMuted;
  const onDivider   = isColored ? "rgba(255,255,255,0.2)" : colors.surfaceSoft;
  const catUnselBg  = isColored ? "rgba(255,255,255,0.15)" : colors.surfaceSoft;

  useEffect(() => {
    let mounted = true;
    setLoadingServices(true);
    fetchServices()
      .then(data => { if (mounted) { setServices(data); setLoadingServices(false); } })
      .catch(() => { if (mounted) setLoadingServices(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    fetchPOIs().then(setPois).catch(() => null);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!user) { setFavoriteIds(new Set()); return; }
    fetchFavoriteIds(user.id).then(ids => { if (mounted) setFavoriteIds(ids); });
    return () => { mounted = false; };
  }, [user]);

  useFocusEffect(
    useMemo(() => () => {
      let mounted = true;
      getRecentlyViewedIds(user?.id).then(ids => { if (mounted) setRecentIds(ids); });
      return () => { mounted = false; };
    }, [user?.id])
  );

  useEffect(() => {
    let mounted = true;
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== "granted") return;
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      })
      .then(pos => {
        if (!mounted || !pos) return;
        setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      })
      .catch(() => null);
    return () => { mounted = false; };
  }, []);


  const recentlyViewed = useMemo(() => {
    if (!services.length) return [];
    const byId = new Map(services.map(s => [s.id, s]));
    const viewed = recentIds.map(id => byId.get(id)).filter((s): s is Service => Boolean(s));
    const rest = [...services.filter(s => !recentIds.includes(s.id))].sort(() => Math.random() - 0.5);
    return [...viewed, ...rest].slice(0, 10);
  }, [recentIds, services]);

  const aroundYou = useMemo(() => {
    if (!services.length) return [];
    if (!userCoords) return [...services].sort(() => Math.random() - 0.5).slice(0, 10);
    const withCoords = services.filter(s => typeof s.latitude === "number" && typeof s.longitude === "number");
    if (!withCoords.length) return [...services].sort(() => Math.random() - 0.5).slice(0, 10);
    return [...withCoords]
      .sort((a, b) =>
        haversine(userCoords.latitude, userCoords.longitude, a.latitude as number, a.longitude as number) -
        haversine(userCoords.latitude, userCoords.longitude, b.latitude as number, b.longitude as number)
      )
      .slice(0, 10);
  }, [services, userCoords]);

  const distanceForCard = useMemo(() => {
    if (!userCoords) return null;
    return (item: Service) => {
      if (typeof item.latitude === "number" && typeof item.longitude === "number")
        return haversine(userCoords.latitude, userCoords.longitude, item.latitude, item.longitude);
      return null;
    };
  }, [userCoords]);

  const handleSelectLocation = (item: PlaceSuggestion) => {
    setDestination(item.label);
    setDestinationCoords({ latitude: item.latitude, longitude: item.longitude });
    setSearchWarning(null);
  };

  const handleSearch = async () => {
    if (!microservice || !destination.trim()) {
      setSearchWarning(t("home.searchMissingFields"));
      return;
    }
    setSearchWarning(null);
    let coords = destinationCoords;
    if (!coords && destination.trim().length >= 3) {
      setSearchingDestination(true);
      const suggestions = await searchPlaceSuggestions(destination, 1);
      setSearchingDestination(false);
      if (suggestions.length > 0)
        coords = { latitude: suggestions[0].latitude, longitude: suggestions[0].longitude };
    }
    router.push({
      pathname: "/(tabs)/guest/SearchResults",
      params: {
        destination,
        destinationLat: coords ? String(coords.latitude) : "",
        destinationLon: coords ? String(coords.longitude) : "",
        timeslot: date || "",
        people: "1",
        microservice,
      },
    });
  };

  const goToServiceDetails = (item: Service) => {
    router.push({
      pathname: "/(tabs)/guest/ServiceDetails",
      params: {
        serviceId: item.id,
        destination: item.location,
        timeslot: date || "",
        people: "1",
        microservice: item.title,
      },
    });
  };

  const toggleFavorite = async (item: Service) => {
    if (!user) return;
    const next = new Set(favoriteIds);
    if (next.has(item.id)) {
      const { error } = await removeFavorite(user.id, item.id);
      if (error) { console.warn("remove favorite failed", error.message); return; }
      next.delete(item.id);
    } else {
      const { error } = await addFavorite(user.id, item.id);
      if (error) { console.warn("add favorite failed", error.message); return; }
      next.add(item.id);
    }
    setFavoriteIds(next);
  };

  const nearToMap = useMemo(() => {
    const map = new Map<string, { name: string; distanceMeters: number }>();
    if (!pois.length) return map;
    for (const svc of services) {
      if (typeof svc.latitude === "number" && typeof svc.longitude === "number") {
        const result = nearestPOI(svc.latitude, svc.longitude, pois);
        if (result) map.set(svc.id, { name: result.name, distanceMeters: result.distanceMeters });
      }
    }
    return map;
  }, [services, pois]);

  const isSearchEnabled = Boolean(microservice) && destination.trim().length > 0;

  const renderCard = (item: Service) => (
    <ServiceCard
      onPress={() => goToServiceDetails(item)}
      title={item.title}
      price={toPriceLabel(item.price_eur)}
      location={item.location}
      category={item.category}
      categoryIconName={toCategoryIcon(item.category)}
      distanceLabel={toDistanceLabel(distanceForCard?.(item))}
      imageSource={parseFirstImageUrl(item.image_url) ? { uri: parseFirstImageUrl(item.image_url)! } : placeholderImage}
      rating={item.rating}
      reviewCount={item.review_count ?? null}
      isFavorite={favoriteIds.has(item.id)}
      onToggleFavorite={() => toggleFavorite(item)}
      isPreviouslyViewed={recentIds.includes(item.id)}
      nearTo={nearToMap.get(item.id) ?? null}
      cancellationMinutes={item.cancellation_minutes ?? null}
      amenities={item.amenities ?? null}
      serviceId={item.id}
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <TabTopNotch />

      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />
      <LocationPickerModal
        visible={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSelect={handleSelectLocation}
        accentColor={accentColor}
        showSuggested
      />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 42 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>{t("home.tagline")}</Text>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.categoryGrid}>
            {[categories.slice(0, 3), categories.slice(3, 6)].map((row, rowIdx) => (
              <View key={rowIdx} style={styles.categoryRow}>
                {row.map(cat => {
                  const selected = microservice === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catBtn,
                        selected
                          ? { backgroundColor: isColored ? "#fff" : CATEGORY_COLORS[cat.key].active }
                          : { backgroundColor: catUnselBg },
                      ]}
                      onPress={() => {
                        setMicroservice(selected ? "" : cat.label);
                        setSearchWarning(null);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={20}
                        color={selected ? (isColored ? accentColor : "#fff") : onCard}
                      />
                      <Text
                        style={[
                          styles.catLabel,
                          { color: selected ? (isColored ? accentColor : "#fff") : onCard },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {activeCategoryKey && (
            <View style={styles.categoryInfoBox}>
              <MaterialCommunityIcons name="information-outline" size={15} color="rgba(255,255,255,0.85)" style={{ marginTop: 1 }} />
              <Text style={styles.categoryInfoText} numberOfLines={4}>
                {t(`category.req.${activeCategoryKey}`)}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: onDivider }]} />

          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => setLocationModalOpen(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="map-marker" size={18} color={onCard} />
            <View style={{ flex: 1 }}>
              {!destination ? (
                <>
                  <Text style={{ fontWeight: "600", fontSize: 14, color: onCard }}>{t("home.whereLabel")}</Text>
                  <Text style={{ fontSize: 14, color: onMuted }} numberOfLines={1}>{t("home.whereHint")}</Text>
                </>
              ) : (
                <Text style={{ fontWeight: "600", fontSize: 14, color: onCard }} numberOfLines={1}>{destination}</Text>
              )}
            </View>
            {destination ? (
              <TouchableOpacity
                onPress={() => { setDestination(""); setDestinationCoords(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={16} color={onMuted} />
              </TouchableOpacity>
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={18} color={onMuted} />
            )}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: onDivider }]} />

          <View style={styles.fieldRow}>
            <UIDateTimeField
              mode="date"
              label={t("home.whenLabel")}
              placeholder={t("home.whenHint")}
              value={date}
              fieldStyle={styles.flatField}
              textColor={onCard}
              placeholderColor={onMuted}
              accentColor={accentColor}
              onChange={value => { setDate(value); setSearchWarning(null); }}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.searchBtn,
              {
                backgroundColor: isSearchEnabled ? colors.warmAccent : colors.warmAccentSoft,
              },
            ]}
            onPress={handleSearch}
            disabled={searchingDestination}
            activeOpacity={0.85}
          >
            <Text style={styles.searchBtnText}>
              {searchingDestination ? "Searching…" : t("home.search")}
            </Text>
          </TouchableOpacity>

          {searchWarning ? <Text style={[styles.warning, isColored && { color: "rgba(255,255,255,0.9)" }]}>{searchWarning}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>{t("home.recentlyViewed")}</Text>
        <InfiniteHList
          data={loadingServices ? [] : recentlyViewed}
          renderCard={renderCard}
          listStyle={styles.hList}
          contentStyle={styles.hListContent}
        />

        <Text style={styles.sectionTitle}>{t("home.aroundYou")}</Text>
        <InfiniteHList
          data={loadingServices ? [] : aroundYou}
          renderCard={renderCard}
          listStyle={styles.hList}
          contentStyle={styles.hListContent}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}