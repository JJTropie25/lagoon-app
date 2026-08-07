import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  BackHandler,
} from "react-native";
import LoadingCard from "../../../components/LoadingCard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import ServiceCard from "../../../components/ServiceCard";
import ResultsActionBar from "../../../components/ResultsActionBar";
// @ts-ignore – Metro resolves platform extensions (.native.tsx/.web.tsx) at build time
import ResultsMap from "../../../components/ResultsMap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analytics } from "../../../lib/analytics";
import { useI18n } from "../../../lib/i18n";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import {
  fetchServices,
  Service,
  toDistanceLabel,
  toPriceLabel,
  toCategoryIcon,
  parseFirstImageUrl,
} from "../../../lib/services";
import { fetchPOIs, nearestPOI, POI } from "../../../lib/poi";
import { useAuthState } from "../../../lib/auth";
import { addFavorite, fetchFavoriteIds, removeFavorite } from "../../../lib/favorites";

const CATEGORY_COLORS_MAP: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};

export default function SearchResults() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuthState();
  const placeholderImage = require("../../../assets/images/react-logo.png");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<
    "priceUp" | "priceDown" | "topRated" | "nearest"
  >("topRated");
  const [priceMax, setPriceMax] = useState(500);
  const [distanceMax, setDistanceMax] = useState(10);
  const [ratingMin, setRatingMin] = useState(0);
  const [filterDraft, setFilterDraft] = useState({ priceMax: 500, distanceMax: 10, ratingMin: 0 });
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const mapScrollRef = useRef<FlatList<Service>>(null);
  const CARD_WIDTH = 260;
  const CARD_GAP = 12;
  const CARD_SNAP = CARD_WIDTH + CARD_GAP;

  const { destination, destinationLat, destinationLon, timeslot, people, microservice } =
    useLocalSearchParams<{
      destination?: string;
      destinationLat?: string;
      destinationLon?: string;
      timeslot?: string;
      people?: string;
      microservice?: string;
    }>();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [pois, setPois] = useState<POI[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoadingServices(true);
    fetchServices()
      .then((data) => {
        if (!isMounted) return;
        setServices(data);
        setLoadingServices(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadingServices(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchPOIs().then(setPois).catch(() => null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    fetchFavoriteIds(user.id).then((ids) => {
      if (!isMounted) return;
      setFavoriteIds(ids);
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const normalizedCategory = useMemo(() => {
    if (!microservice) return null;
    const value = String(microservice).toLowerCase();
    if (value.includes("rest")    || value.includes(t("category.rest").toLowerCase()))    return "rest";
    if (value.includes("shower")  || value.includes(t("category.shower").toLowerCase()))  return "shower";
    if (value.includes("focus")   || value.includes(t("category.focus").toLowerCase()))   return "focus";
    if (value.includes("tavolo")  || value.includes(t("category.tavolo").toLowerCase()))  return "tavolo";
    if (value.includes("charge")  || value.includes(t("category.charge").toLowerCase()))  return "charge";
    if (value.includes("storage") || value.includes(t("category.storage").toLowerCase())) return "storage";
    return null;
  }, [microservice, t]);

  const accentColor = normalizedCategory
    ? CATEGORY_COLORS_MAP[normalizedCategory]
    : colors.textPrimary;

  const destinationCoords = useMemo(() => {
    const lat = Number(destinationLat);
    const lon = Number(destinationLon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitude: lat, longitude: lon };
    }
    return null;
  }, [destinationLat, destinationLon]);

  const distanceForService = useCallback(
    (item: Service) => {
      if (
        destinationCoords &&
        typeof item.latitude === "number" &&
        typeof item.longitude === "number"
      ) {
        return haversineMeters(
          destinationCoords.latitude,
          destinationCoords.longitude,
          item.latitude,
          item.longitude
        );
      }
      return Number.POSITIVE_INFINITY;
    },
    [destinationCoords]
  );

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

  const filteredResults = useMemo(() => {
    let items = services;
    if (normalizedCategory) {
      items = items.filter((s) => s.category === normalizedCategory);
    }

    const hasCoords = items.some(
      (s) => typeof s.latitude === "number" && typeof s.longitude === "number"
    );

    if (destination) {
      if (destinationCoords && hasCoords) {
        const radiusMeters = Math.max(1, distanceMax) * 1000;
        items = items.filter((s) => distanceForService(s) <= radiusMeters);
      } else {
        const needle = destination.toLowerCase();
        items = items.filter((s) => s.location.toLowerCase().includes(needle));
      }
    }
    items = items.filter((s) => s.price_eur <= priceMax);
    items = items.filter((s) => (s.rating ?? 0) >= ratingMin);
    if (sortBy === "priceUp") {
      items = [...items].sort((a, b) => a.price_eur - b.price_eur);
    } else if (sortBy === "priceDown") {
      items = [...items].sort((a, b) => b.price_eur - a.price_eur);
    } else if (sortBy === "topRated") {
      items = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "nearest") {
      items = [...items].sort((a, b) => distanceForService(a) - distanceForService(b));
    }
    return items;
  }, [
    services,
    normalizedCategory,
    destination,
    destinationCoords,
    distanceForService,
    priceMax,
    distanceMax,
    ratingMin,
    sortBy,
  ]);

  const resultsByIndex = useMemo(() => filteredResults, [filteredResults]);

  const closestFallback = useMemo(() => {
    if (filteredResults.length > 0) return [];
    const pool = normalizedCategory
      ? services.filter((s) => s.category === normalizedCategory)
      : services;
    if (!destinationCoords) return pool.slice(0, 5);
    const withCoords = [...pool]
      .filter((s) => typeof s.latitude === "number" && typeof s.longitude === "number")
      .sort(
        (a, b) =>
          haversineMeters(destinationCoords.latitude, destinationCoords.longitude, a.latitude as number, a.longitude as number) -
          haversineMeters(destinationCoords.latitude, destinationCoords.longitude, b.latitude as number, b.longitude as number)
      );
    const withoutCoords = pool.filter(
      (s) => typeof s.latitude !== "number" || typeof s.longitude !== "number"
    );
    return [...withCoords, ...withoutCoords].slice(0, 5);
  }, [filteredResults.length, services, normalizedCategory, destinationCoords]);

  const sortedClosestFallback = useMemo(() => {
    if (closestFallback.length === 0) return [];
    let items = closestFallback.filter(
      (s) => s.price_eur <= priceMax && (s.rating ?? 0) >= ratingMin
    );
    if (sortBy === "priceUp") items = [...items].sort((a, b) => a.price_eur - b.price_eur);
    else if (sortBy === "priceDown") items = [...items].sort((a, b) => b.price_eur - a.price_eur);
    else if (sortBy === "topRated") items = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === "nearest") items = [...items].sort((a, b) => distanceForService(a) - distanceForService(b));
    return items;
  }, [closestFallback, priceMax, ratingMin, sortBy, distanceForService]);

  const activeResultsByIndex = useMemo(
    () => (resultsByIndex.length > 0 ? resultsByIndex : sortedClosestFallback),
    [resultsByIndex, sortedClosestFallback]
  );

  const activeMapResults = useMemo(
    () =>
      activeResultsByIndex.filter(
        (s) => typeof s.latitude === "number" && typeof s.longitude === "number"
      ),
    [activeResultsByIndex]
  );

  useEffect(() => {
    if (viewMode === "map" && !selectedTitle && activeResultsByIndex.length > 0) {
      setSelectedTitle(activeResultsByIndex[0].title);
    }
  }, [activeResultsByIndex, selectedTitle, viewMode]);

  const searchTrackedRef = useRef(false);
  useEffect(() => {
    if (loadingServices || searchTrackedRef.current) return;
    searchTrackedRef.current = true;
    analytics.searchPerformed({
      microservice: normalizedCategory,
      destination: destination ?? null,
      result_count: filteredResults.length,
    });
    if (filteredResults.length === 0) {
      analytics.emptySearch({ microservice: normalizedCategory, destination: destination ?? null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingServices]);

  const { summaryDate } = useMemo(() => {
    const raw = String(timeslot ?? "").trim();
    if (!raw) return { summaryDate: "" };

    const isoLike = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?$/
    );
    if (isoLike) {
      const [, y, m, d] = isoLike;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      const locale =
        language === "it"
          ? "it-IT"
          : language === "es"
          ? "es-ES"
          : language === "zh"
          ? "zh-CN"
          : language === "de"
          ? "de-DE"
          : language === "fr"
          ? "fr-FR"
          : language === "ja"
          ? "ja-JP"
          : "en-US";
      let month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
      month = month.charAt(0).toUpperCase() + month.slice(1);
      if (!month.endsWith(".")) month += ".";
      return { summaryDate: `${Number(d)} ${month}` };
    }

    return { summaryDate: "" };
  }, [language, timeslot]);

  const isFilterActive =
    priceMax !== 500 || distanceMax !== 10 || ratingMin !== 0;

  const SummaryBar = ({ onBack }: { onBack: () => void }) => (
    <View style={styles.summaryRow}>
      <TouchableOpacity
        style={styles.summaryBackBtn}
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>
      <View style={styles.summaryLine}>
        <MaterialCommunityIcons
          name={toCategoryIcon((normalizedCategory ?? "rest") as Service["category"]) as any}
          size={15}
          color="#fff"
        />
        <Text style={styles.summaryItemBold} numberOfLines={1}>
          {microservice ?? "-"}
        </Text>
        {destination ? (
          <>
            <Text style={styles.summarySep}>·</Text>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.summaryItemMuted} numberOfLines={1}>
              {destination}
            </Text>
          </>
        ) : null}
        {summaryDate ? (
          <>
            <Text style={styles.summarySep}>·</Text>
            <MaterialCommunityIcons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.summaryItemMuted}>{summaryDate}</Text>
          </>
        ) : null}
      </View>
    </View>
  );

  const sortOptions = [
    { value: "priceUp", label: t("search.sort.priceUp") },
    { value: "priceDown", label: t("search.sort.priceDown") },
    { value: "topRated", label: t("search.sort.topRated") },
    { value: "nearest", label: t("search.sort.nearest") },
  ];

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/guest");

  useEffect(() => {
    if (viewMode !== "map") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setViewMode("list");
      return true;
    });
    return () => sub.remove();
  }, [viewMode]);

  return (
    <>
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        {viewMode === "list" ? (
          <View style={styles.listWrap}>
            <View style={[styles.listHeader, { paddingTop: insets.top + 10, backgroundColor: accentColor }]}>
              <SummaryBar onBack={goBack} />
            </View>

            <FlatList
              data={filteredResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={7}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              ListHeaderComponent={
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  <ResultsActionBar
                    actions={[
                      {
                        label: t(`search.sort.${sortBy}`),
                        onPress: () => { setSortOpen(true); setFilterOpen(false); },
                      },
                      {
                        label: t("search.filter"),
                        onPress: () => {
                          setFilterDraft({ priceMax, distanceMax, ratingMin });
                          setFilterOpen(true);
                          setSortOpen(false);
                        },
                        badge: isFilterActive,
                      },
                      {
                        label: t("search.map"),
                        onPress: () => setViewMode("map"),
                      },
                    ]}
                  />
                  {filteredResults.length > 0 && (
                    <Text style={styles.resultsCount}>
                      {t("search.resultsCount").replace("{count}", String(filteredResults.length))}
                    </Text>
                  )}
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  {loadingServices ? (
                    <LoadingCard size={56} topSpacing={32} label={t("search.loading")} />
                  ) : (
                  <Text style={styles.emptyTitle}>{t("search.noResultsTitle")}</Text>
                  )}
                  {!loadingServices && sortedClosestFallback.length > 0 && (
                    <>
                      <Text style={styles.closestTitle}>{t("search.closestTitle")}</Text>
                      {sortedClosestFallback.map((item, idx) => (
                        <View key={item.id}>
                          {idx > 0 && <View style={styles.divider} />}
                          <ServiceCard
                            fullWidth
                            horizontal
                            flat
                            containerStyle={styles.card}
                            imageStyle={styles.cardImage}
                            imageSource={parseFirstImageUrl(item.image_url) ? { uri: parseFirstImageUrl(item.image_url)! } : placeholderImage}
                            title={item.title}
                            price={toPriceLabel(item.price_eur)}
                            location={item.location}
                            category={item.category}
                            categoryIconName={toCategoryIcon(item.category)}
                            rating={item.rating}
                            reviewCount={item.review_count ?? null}
                            isFavorite={favoriteIds.has(item.id)}
                            nearTo={nearToMap.get(item.id) ?? null}
                            cancellationMinutes={item.cancellation_minutes ?? null}
                            amenities={item.amenities ?? null}
                            serviceId={item.id}
                            onToggleFavorite={async () => {
                              if (!user) return;
                              const next = new Set(favoriteIds);
                              if (next.has(item.id)) {
                                const { error } = await removeFavorite(user.id, item.id);
                                if (error) return;
                                next.delete(item.id);
                              } else {
                                const { error } = await addFavorite(user.id, item.id);
                                if (error) return;
                                next.add(item.id);
                              }
                              setFavoriteIds(next);
                            }}
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/guest/ServiceDetails",
                                params: {
                                  serviceId: item.id,
                                  destination,
                                  timeslot,
                                  people,
                                  microservice: item.title,
                                },
                              })
                            }
                          />
                        </View>
                      ))}
                    </>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <ServiceCard
                  fullWidth
                  horizontal
                  flat
                  containerStyle={styles.card}
                  imageStyle={styles.cardImage}
                  imageSource={
                    parseFirstImageUrl(item.image_url) ? { uri: parseFirstImageUrl(item.image_url)! } : placeholderImage
                  }
                  title={item.title}
                  price={toPriceLabel(item.price_eur)}
                  location={item.location}
                  category={item.category}
                  categoryIconName={toCategoryIcon(item.category)}
                  rating={item.rating}
                  reviewCount={item.review_count ?? null}
                  isFavorite={favoriteIds.has(item.id)}
                  nearTo={nearToMap.get(item.id) ?? null}
                  cancellationMinutes={item.cancellation_minutes ?? null}
                  amenities={item.amenities ?? null}
                  serviceId={item.id}
                  onToggleFavorite={async () => {
                    if (!user) return;
                    const next = new Set(favoriteIds);
                    if (next.has(item.id)) {
                      const { error } = await removeFavorite(user.id, item.id);
                      if (error) {
                        console.warn("remove favorite failed", error.message);
                        return;
                      }
                      next.delete(item.id);
                    } else {
                      const { error } = await addFavorite(user.id, item.id);
                      if (error) {
                        console.warn("add favorite failed", error.message);
                        return;
                      }
                      next.add(item.id);
                    }
                    setFavoriteIds(next);
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/guest/ServiceDetails",
                      params: {
                        serviceId: item.id,
                        destination,
                        timeslot,
                        people,
                        microservice: item.title,
                      },
                    })
                  }
                />
              )}
            />
          </View>
        ) : (
          <View style={styles.mapContainer}>
            {activeMapResults.length === 0 ? (
              <View style={styles.emptyMap}>
                <Text style={styles.emptyText}>{t("search.noResults")}</Text>
              </View>
            ) : (
              <ResultsMap
                results={activeMapResults}
                selectedTitle={selectedTitle}
                onSelect={(title: string) => {
                  const index = activeResultsByIndex.findIndex((r) => r.title === title);
                  if (index >= 0) {
                    mapScrollRef.current?.scrollToOffset({
                      offset: index * CARD_SNAP,
                      animated: true,
                    });
                  }
                  setSelectedTitle(title);
                }}
              />
            )}

            <View style={styles.mapTop}>
              <View style={[styles.mapSummaryHeader, { paddingTop: insets.top + 10, backgroundColor: accentColor }]}>
                <SummaryBar onBack={() => setViewMode("list")} />
              </View>
              <View style={styles.mapActionBarRow}>
                <ResultsActionBar
                  actions={[
                    {
                      label: t(`search.sort.${sortBy}`),
                      onPress: () => {
                        setSortOpen(true);
                        setFilterOpen(false);
                      },
                    },
                    {
                      label: t("search.filter"),
                      onPress: () => {
                        setFilterDraft({ priceMax, distanceMax, ratingMin });
                        setFilterOpen(true);
                        setSortOpen(false);
                      },
                      badge: isFilterActive,
                    },
                    {
                      label: t("search.list"),
                      onPress: () => setViewMode("list"),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.mapBottom}>
              <FlatList
                ref={mapScrollRef}
                data={activeResultsByIndex}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_SNAP}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={styles.mapCards}
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={5}
                onMomentumScrollEnd={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const index = Math.round(x / CARD_SNAP);
                  const item = activeResultsByIndex[index];
                  if (item) setSelectedTitle(item.title);
                }}
                renderItem={({ item }) => (
                  <ServiceCard
                    horizontal
                    containerStyle={styles.mapCard}
                    imageStyle={styles.mapCardImage}
                    imageSource={
                      parseFirstImageUrl(item.image_url) ? { uri: parseFirstImageUrl(item.image_url)! } : placeholderImage
                    }
                    title={item.title}
                    price={toPriceLabel(item.price_eur)}
                    location={item.location}
                    categoryIconName={toCategoryIcon(item.category)}
                    distanceLabel={toDistanceLabel(distanceForService(item))}
                    rating={item.rating}
                    reviewCount={item.review_count ?? null}
                    isFavorite={favoriteIds.has(item.id)}
                    nearTo={nearToMap.get(item.id) ?? null}
                    cancellationMinutes={item.cancellation_minutes ?? null}
                    amenities={item.amenities ?? null}
                    onToggleFavorite={async () => {
                      if (!user) return;
                      const next = new Set(favoriteIds);
                      if (next.has(item.id)) {
                        const { error } = await removeFavorite(user.id, item.id);
                        if (error) {
                          console.warn("remove favorite failed", error.message);
                          return;
                        }
                        next.delete(item.id);
                      } else {
                        const { error } = await addFavorite(user.id, item.id);
                        if (error) {
                          console.warn("add favorite failed", error.message);
                          return;
                        }
                        next.add(item.id);
                      }
                      setFavoriteIds(next);
                    }}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/guest/ServiceDetails",
                        params: {
                          serviceId: item.id,
                          destination,
                          timeslot,
                          people,
                          microservice: item.title,
                        },
                      })
                    }
                  />
                )}
              />
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Sort bottom-sheet modal */}
      <Modal
        visible={sortOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setSortOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSortOpen(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("search.sort")}</Text>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sheetItem,
                  sortBy === opt.value && { backgroundColor: accentColor + "12" },
                ]}
                onPress={() => {
                  setSortBy(opt.value as any);
                  setSortOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.sheetItemText,
                    sortBy === opt.value && { color: accentColor, fontWeight: "600" },
                  ]}
                >
                  {opt.label}
                </Text>
                {sortBy === opt.value && (
                  <MaterialCommunityIcons name="check" size={18} color={accentColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Filter bottom-sheet modal */}
      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFilterOpen(false)} />
          <View style={[styles.sheetContainer, styles.filterSheet]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("search.filter")}</Text>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>
                {t("search.maxPrice", { value: filterDraft.priceMax })}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={500}
                step={5}
                value={filterDraft.priceMax}
                onValueChange={(v) => setFilterDraft((d) => ({ ...d, priceMax: Math.round(v) }))}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={colors.surfaceSoft}
                thumbTintColor={accentColor}
              />
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>
                {t("search.maxDistance", { value: filterDraft.distanceMax })}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50}
                step={1}
                value={filterDraft.distanceMax}
                onValueChange={(v) => setFilterDraft((d) => ({ ...d, distanceMax: Math.round(v) }))}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={colors.surfaceSoft}
                thumbTintColor={accentColor}
              />
            </View>

            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>
                {t("search.minRating", { value: filterDraft.ratingMin })}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={0.5}
                value={filterDraft.ratingMin}
                onValueChange={(v) =>
                  setFilterDraft((d) => ({ ...d, ratingMin: Math.round(v * 2) / 2 }))
                }
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={colors.surfaceSoft}
                thumbTintColor={accentColor}
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setFilterDraft({ priceMax: 500, distanceMax: 10, ratingMin: 0 });
                }}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: accentColor }]}
                onPress={() => {
                  setPriceMax(filterDraft.priceMax);
                  setDistanceMax(filterDraft.distanceMax);
                  setRatingMin(filterDraft.ratingMin);
                  setFilterOpen(false);
                }}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    listWrap: { flex: 1, backgroundColor: c.listBackground },
    listHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    container: {
      paddingBottom: 24,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    summaryLine: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      overflow: "hidden",
    },
    summaryItemBold: {
      fontWeight: "600",
      color: "#fff",
      fontSize: 14,
      flexShrink: 1,
    },
    summaryItemMuted: {
      fontWeight: "600",
      color: "rgba(255,255,255,0.72)",
      fontSize: 13,
      flexShrink: 1,
    },
    summarySep: {
      color: "rgba(255,255,255,0.5)",
      fontWeight: "600",
    },
    summaryBackBtn: {
      padding: 4,
    },
    card: {
      borderRadius: 0,
    },
    cardImage: { flex: 1 },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginHorizontal: 16,
    },
    mapContainer: { flex: 1 },
    mapTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    mapSummaryHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    mapActionBarRow: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    mapBottom: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 16,
      paddingHorizontal: 16,
    },
    mapCards: { paddingRight: 16 },
    mapCard: { width: 260, marginRight: 12 },
    mapCardImage: { flex: 1 },
    resultsCount: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
      marginTop: 4,
      marginBottom: 8,
    },
    emptyWrap: {
      paddingTop: 8,
    },
    loadingWrap: {
      paddingTop: 48,
      alignItems: "center",
      gap: 14,
    },
    loadingText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSecondary,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: c.textPrimary,
      textAlign: "center",
      marginBottom: 24,
      paddingHorizontal: 16,
    },
    closestTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
      marginBottom: 4,
      paddingHorizontal: 16,
    },
    emptyText: {
      color: c.textSecondary,
      textAlign: "center",
      marginTop: 24,
      fontWeight: "600",
    },
    emptyMap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    sheetContainer: {
      backgroundColor: c.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 12,
    },
    filterSheet: {
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.surfaceSoft,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: c.textPrimary,
      marginBottom: 12,
    },
    sheetItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 2,
    },
    sheetItemText: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: "600",
    },
    sliderRow: {
      marginBottom: 12,
    },
    sliderLabel: {
      fontWeight: "600",
      color: c.textPrimary,
      marginBottom: 2,
      fontSize: 14,
    },
    slider: {
      width: "100%",
      height: 40,
    },
    filterActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    clearBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
    },
    clearBtnText: {
      color: c.textPrimary,
      fontWeight: "600",
    },
    applyBtn: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: 10,
      alignItems: "center",
    },
    applyBtnText: {
      color: "#fff",
      fontWeight: "600",
    },
  });
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLon = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}