import { useEffect, useMemo, useState } from "react";
import BrandedLoader from "../../components/BrandedLoader";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { useI18n } from "../../lib/i18n";
import { createHostListing, resolveHostForUser } from "../../lib/host";
import { type Service, type ServiceAmenities } from "../../lib/services";
import { useAppDialog } from "../../components/AppDialogProvider";
import { useAuthState } from "../../lib/auth";
import { pickAndUploadListingImage } from "../../lib/listingImage";
import { type PlaceSuggestion } from "../../lib/geocoding";
import LocationPickerModal from "../../components/LocationPickerModal";

const HEADER_COLOR = "#4F9B9B";
const IMAGE_HEIGHT = 240;

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};
const CATEGORY_ICONS: Record<string, string> = {
  rest:    "bed-king",
  shower:  "shower",
  storage: "locker",
  focus:   "laptop",
  tavolo:  "silverware-fork-knife",
  charge:  "lightning-bolt",
};
const SLOT_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});
const CATEGORIES: Service["category"][] = ["rest", "shower", "storage", "focus", "tavolo", "charge"];

function parsePrice(value: string) {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeImageUrls(urls: string[]): string | null {
  if (urls.length === 0) return null;
  if (urls.length === 1) return urls[0];
  return JSON.stringify(urls);
}

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

    scroll: { flex: 1 },
    container: { paddingBottom: 40 },
    content: { paddingHorizontal: 20 },

    galleryWrap: {
      height: IMAGE_HEIGHT,
      backgroundColor: c.surfaceSoft,
      overflow: "hidden",
    },
    galleryEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    galleryEmptyText: {
      color: c.textMuted,
      fontWeight: "600",
      fontSize: 14,
    },
    galleryDots: {
      position: "absolute",
      bottom: 8, left: 0, right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 4,
    },
    galleryDot: { width: 6, height: 6, borderRadius: 3 },
    removeImageBtn: {
      position: "absolute",
      top: 10, right: 10,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 12,
      width: 26, height: 26,
      alignItems: "center", justifyContent: "center",
    },
    addMoreBtn: {
      position: "absolute",
      bottom: 10, right: 10,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 16,
      width: 32, height: 32,
      alignItems: "center", justifyContent: "center",
    },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: c.textSecondary,
      marginBottom: 10,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginVertical: 20,
    },

    input: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.textPrimary,
      fontSize: 15,
    },
    inputArea: {
      minHeight: 96,
      textAlignVertical: "top",
      paddingTop: 14,
    },

    photoActions: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 6,
    },
    photoBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: HEADER_COLOR,
      borderRadius: 12,
      paddingVertical: 13,
    },
    photoBtnDisabled: { opacity: 0.45 },
    photoBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    photoHint: { color: c.textSecondary, fontSize: 12, fontWeight: "500" },

    categoryGrid: { gap: 8 },
    categoryRow: { flexDirection: "row", gap: 8 },
    categoryChip: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: c.surfaceSoft,
      alignItems: "center",
      paddingVertical: 12,
      gap: 4,
    },
    categoryChipText: { color: c.textSecondary, fontWeight: "700", fontSize: 13 },
    categoryChipTextSelected: { color: "#fff" },

    categoryReqBox: {
      marginTop: 10,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    categoryReqText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
    },

    priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    priceInput: {
      flex: 1,
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    currencyLabel: { fontSize: 16, fontWeight: "700", color: c.textSecondary },

    locationField: { flexDirection: "row", alignItems: "center", gap: 10 },
    locationFieldText: { flex: 1, fontSize: 15, color: c.textPrimary },
    coordsHint: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "500",
      marginTop: 6,
      textAlign: "center",
    },

    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    slotHint: { fontSize: 12, lineHeight: 17, color: c.textMuted, marginTop: 8, fontStyle: "italic" },
    chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: c.surfaceSoft },
    chipSelected: { backgroundColor: c.warmAccent },
    chipText: { color: c.textSecondary, fontWeight: "700", fontSize: 13 },
    chipTextSelected: { color: "#fff" },

    cancellationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    cancellationInput: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 72,
      textAlign: "center",
      color: c.textPrimary,
      fontWeight: "700",
      fontSize: 13,
    },

    dimensionsRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
    stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingVertical: 4 },
    stepperLabel: { color: c.textSecondary, fontWeight: "600", fontSize: 13, flex: 1 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
    stepperBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceSoft, alignItems: "center", justifyContent: "center" },
    stepperValue: { fontSize: 16, fontWeight: "700", color: c.textPrimary, minWidth: 36, textAlign: "center" },
    dimensionsLabel: { color: c.textSecondary, fontWeight: "600", fontSize: 13 },
    dimensionsInput: {
      flex: 1,
      backgroundColor: c.surfaceSoft,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: c.textPrimary,
      fontSize: 13,
    },

    saveButton: {
      marginTop: 28,
      backgroundColor: c.warmAccent,
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 16,
    },
    saveButtonDisabled: { backgroundColor: c.warmAccentSoft },
    saveButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      fontSize: 16,
    },
  });
}

export default function HostNewListing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useI18n();
  const { user } = useAuthState();
  const dialog = useAppDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [category, setCategory] = useState<Service["category"]>("rest");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [cancellationMinutes, setCancellationMinutes] = useState("");
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enabledCategories, setEnabledCategories] = useState<Service["category"][]>(CATEGORIES);

  useEffect(() => {
    if (!user?.id) return;
    resolveHostForUser(user.id).then(({ host }) => {
      if (host?.enabled_categories?.length) {
        const cats = host.enabled_categories as Service["category"][];
        setEnabledCategories(cats);
        setCategory(prev => cats.includes(prev) ? prev : cats[0]);
      }
    });
  }, [user?.id]);

  const visibleCategories = useMemo(
    () => CATEGORIES.filter(c => enabledCategories.includes(c)),
    [enabledCategories]
  );

  const [amenTowels, setAmenTowels] = useState(false);
  const [amenHairDryer, setAmenHairDryer] = useState(false);
  const [amenSoap, setAmenSoap] = useState(false);
  const [amenOpen24h, setAmenOpen24h] = useState(false);
  const [amenDimensions, setAmenDimensions] = useState("");
  const [amenQuietLocation, setAmenQuietLocation] = useState(false);
  const [amenBlanket, setAmenBlanket] = useState(false);
  const [amenSofaOrBed, setAmenSofaOrBed] = useState<"sofa" | "bed" | null>(null);
  const [amenToiletAccess, setAmenToiletAccess] = useState(false);
  // focus
  const [amenWifi, setAmenWifi] = useState(false);
  const [amenErgonomicChair, setAmenErgonomicChair] = useState(false);
  const [amenIsolatedSpace, setAmenIsolatedSpace] = useState(false);
  const [amenAdjustableLighting, setAmenAdjustableLighting] = useState(false);
  // tavolo
  const [amenSeatsCount, setAmenSeatsCount] = useState("");
  // charge
  const [amenVoltage, setAmenVoltage] = useState("");
  const [amenOutletCount, setAmenOutletCount] = useState("");
  const [amenInternationalPlug, setAmenInternationalPlug] = useState(false);

  const canSave = useMemo(
    () => Boolean(title.trim()) && Boolean(location.trim()) && parsePrice(price) > 0 && slots.length > 0,
    [location, price, slots.length, title]
  );

  const toggleSlot = (value: string) =>
    setSlots((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value].sort());

  const buildAmenities = (): ServiceAmenities | null => {
    const a: ServiceAmenities = {};
    if (category === "rest") {
      if (amenQuietLocation) a.quiet_location = true;
      if (amenBlanket) a.blanket = true;
      if (amenSofaOrBed) a.sofa_or_bed = amenSofaOrBed;
      if (amenToiletAccess) a.toilet_access = true;
    } else if (category === "shower") {
      if (amenTowels) a.towels_included = true;
      if (amenHairDryer) a.hair_dryer = true;
      if (amenSoap) a.soap_included = true;
      if (amenToiletAccess) a.toilet_access = true;
    } else if (category === "storage") {
      if (amenDimensions.trim()) a.dimensions = amenDimensions.trim();
      if (amenOpen24h) a.open_24h = true;
    } else if (category === "focus") {
      if (amenWifi) a.wifi = true;
      if (amenErgonomicChair) a.ergonomic_chair = true;
      if (amenIsolatedSpace) a.isolated_space = true;
      if (amenAdjustableLighting) a.adjustable_lighting = true;
    } else if (category === "tavolo") {
      const seats = parseInt(amenSeatsCount, 10);
      if (!isNaN(seats) && seats > 0) a.seats_count = seats;
    } else if (category === "charge") {
      const volts = parseInt(amenVoltage, 10);
      const outlets = parseInt(amenOutletCount, 10);
      if (!isNaN(volts) && volts > 0) a.voltage = volts;
      if (!isNaN(outlets) && outlets > 0) a.outlet_count = outlets;
      if (amenInternationalPlug) a.international_plug = true;
    }
    return Object.keys(a).length > 0 ? a : null;
  };

  const onSave = async () => {
    if (!canSave) return;
    const { host } = await resolveHostForUser(user?.id);
    if (!host) {
      await dialog.alert(t("host.listings.title"), t("host.notAvailable"));
      return;
    }
    setSaving(true);
    const parsedCancellation = cancellationMinutes.trim() ? parseInt(cancellationMinutes, 10) : null;
    const { error } = await createHostListing({
      hostId: host.id,
      title: title.trim(),
      description: description.trim() || `${title.trim()} — a great spot for travelers.`,
      category,
      price_eur: parsePrice(price),
      location: location.trim(),
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
      image_url: serializeImageUrls(imageUrls),
      slotTimes: slots,
      cancellationMinutes: Number.isFinite(parsedCancellation) ? parsedCancellation : null,
      amenities: buildAmenities(),
    });
    setSaving(false);
    if (error) { await dialog.alert(t("host.listings.title"), error); return; }
    await dialog.alert(t("host.listings.title"), t("host.listings.saved"));
    router.back();
  };

  const onPickPhoto = async () => {
    if (imageUrls.length >= 5) return;
    setUploadingImage(true);
    const result = await pickAndUploadListingImage(user?.id);
    setUploadingImage(false);
    if (result.error) { await dialog.alert(t("host.field.image"), result.error); return; }
    if (result.url) setImageUrls((prev) => [...prev, result.url!].slice(0, 5));
  };

  const handleLocationSelect = (place: PlaceSuggestion) => {
    setLocation(place.label);
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
  };

  const currentCoords = useMemo(() => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? { latitude: lat, longitude: lon }
      : undefined;
  }, [latitude, longitude]);

  const headerH = insets.top + 52;

  return (
    <View style={styles.screen}>
      {/* Fixed teal header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New listing</Text>
        {saving ? <BrandedLoader size={22} color="#fff" /> : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: headerH }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero image gallery ───────────────── */}
        <View style={styles.galleryWrap}>
          {imageUrls.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  setActiveImageIdx(Math.max(0, Math.min(idx, imageUrls.length - 1)));
                }}
                scrollEventThrottle={16}
              >
                {imageUrls.map((url, i) => (
                  <View key={i} style={{ width: screenWidth, height: IMAGE_HEIGHT }}>
                    <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => { setImageUrls((prev) => prev.filter((_, j) => j !== i)); setActiveImageIdx(0); }}
                    >
                      <MaterialCommunityIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {imageUrls.length < 5 && !uploadingImage && (
                <TouchableOpacity style={styles.addMoreBtn} onPress={onPickPhoto} activeOpacity={0.75}>
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.galleryEmpty} onPress={onPickPhoto} activeOpacity={0.7} disabled={uploadingImage}>
              <MaterialCommunityIcons name="image-plus" size={40} color={colors.textMuted} />
              <Text style={styles.galleryEmptyText}>Add photos</Text>
            </TouchableOpacity>
          )}
          {imageUrls.length > 1 && (
            <View style={styles.galleryDots}>
              {imageUrls.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.galleryDot,
                    { backgroundColor: i === activeImageIdx ? "#fff" : "rgba(255,255,255,0.4)" },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={[styles.content, { paddingTop: 20 }]}>

          {/* Photo count label */}
          <Text style={styles.sectionLabel}>
            {t("host.field.image")} ({imageUrls.length}/5)
          </Text>
          {uploadingImage && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <BrandedLoader size={18} color={HEADER_COLOR} />
              <Text style={styles.photoHint}>Uploading...</Text>
            </View>
          )}
          <Text style={styles.photoHint}>
            {imageUrls.length >= 5
              ? "Maximum 5 photos reached"
              : imageUrls.length === 0
              ? "Tap the image area above to add photos"
              : `${5 - imageUrls.length} slot${5 - imageUrls.length !== 1 ? "s" : ""} remaining — tap + to add more`}
          </Text>

          <View style={styles.divider} />

          {/* Title */}
          <Text style={styles.sectionLabel}>{t("host.field.title")}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t("host.ph.title")}
            placeholderTextColor={colors.textMuted}
          />

          <View style={{ height: 14 }} />

          {/* Description */}
          <Text style={styles.sectionLabel}>{t("host.field.description")}</Text>
          <TextInput
            style={[styles.input, styles.inputArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={t("host.ph.description")}
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.divider} />

          {/* Category */}
          <Text style={styles.sectionLabel}>{t("host.field.serviceType")}</Text>
          <View style={styles.categoryGrid}>
            {[visibleCategories.slice(0, 3), visibleCategories.slice(3)].map((row, ri) => (
              <View key={ri} style={styles.categoryRow}>
                {row.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryChip,
                      category === item && { backgroundColor: CATEGORY_COLORS[item] },
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <MaterialCommunityIcons
                      name={CATEGORY_ICONS[item] as any}
                      size={20}
                      color={category === item ? "#fff" : colors.textSecondary}
                    />
                    <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextSelected]}>
                      {t(`category.${item}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <View style={[styles.categoryReqBox, { backgroundColor: CATEGORY_COLORS[category] + "22" }]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={CATEGORY_COLORS[category]}
              style={{ marginTop: 1 }}
            />
            <Text style={[styles.categoryReqText, { color: CATEGORY_COLORS[category] }]}>
              {t(`category.req.${category}`)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Price */}
          <Text style={styles.sectionLabel}>{t("host.field.price")}</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={(next) => setPrice(next.replace(",", "."))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.currencyLabel}>€ / slot</Text>
          </View>

          <View style={styles.divider} />

          {/* Location */}
          <Text style={styles.sectionLabel}>{t("host.field.location")}</Text>
          <TouchableOpacity
            style={[styles.input, styles.locationField]}
            onPress={() => setLocationModalOpen(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="map-marker"
              size={16}
              color={location ? colors.textPrimary : colors.textMuted}
            />
            <Text
              style={[styles.locationFieldText, !location && { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {location || "Search address or place name"}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {latitude && longitude ? (
            <Text style={styles.coordsHint}>
              {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
            </Text>
          ) : null}

          <View style={styles.divider} />

          {/* Time slots */}
          <Text style={styles.sectionLabel}>{t("host.field.slots")}</Text>
          <View style={styles.chipWrap}>
            {SLOT_OPTIONS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.chip, slots.includes(time) && styles.chipSelected]}
                onPress={() => toggleSlot(time)}
              >
                <Text style={[styles.chipText, slots.includes(time) && styles.chipTextSelected]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.slotHint}>{t("host.field.slotsHint")}</Text>

          <View style={styles.divider} />

          {/* Cancellation */}
          <Text style={styles.sectionLabel}>{t("host.field.cancellation")}</Text>
          <View style={styles.cancellationRow}>
            {[
              { value: 30, label: "30m" },
              { value: 60, label: "1h" },
              { value: 120, label: "2h" },
              { value: 240, label: "4h" },
            ].map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, cancellationMinutes === String(value) && styles.chipSelected]}
                onPress={() => setCancellationMinutes(cancellationMinutes === String(value) ? "" : String(value))}
              >
                <Text style={[styles.chipText, cancellationMinutes === String(value) && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.cancellationInput}
              value={cancellationMinutes}
              onChangeText={(v) => setCancellationMinutes(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.divider} />

          {/* Amenities */}
          <Text style={styles.sectionLabel}>{t("host.field.amenities")}</Text>
          <View style={styles.chipWrap}>
            {category === "rest" && (
              <>
                <TouchableOpacity style={[styles.chip, amenQuietLocation && styles.chipSelected]} onPress={() => setAmenQuietLocation((v) => !v)}>
                  <Text style={[styles.chipText, amenQuietLocation && styles.chipTextSelected]}>{t("amenity.quietLocation")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenBlanket && styles.chipSelected]} onPress={() => setAmenBlanket((v) => !v)}>
                  <Text style={[styles.chipText, amenBlanket && styles.chipTextSelected]}>{t("amenity.blanket")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenSofaOrBed === "sofa" && styles.chipSelected]} onPress={() => setAmenSofaOrBed(amenSofaOrBed === "sofa" ? null : "sofa")}>
                  <Text style={[styles.chipText, amenSofaOrBed === "sofa" && styles.chipTextSelected]}>{t("host.field.sofa")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenSofaOrBed === "bed" && styles.chipSelected]} onPress={() => setAmenSofaOrBed(amenSofaOrBed === "bed" ? null : "bed")}>
                  <Text style={[styles.chipText, amenSofaOrBed === "bed" && styles.chipTextSelected]}>{t("host.field.bed")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenToiletAccess && styles.chipSelected]} onPress={() => setAmenToiletAccess((v) => !v)}>
                  <Text style={[styles.chipText, amenToiletAccess && styles.chipTextSelected]}>{t("amenity.toiletAccess")}</Text>
                </TouchableOpacity>
              </>
            )}
            {category === "shower" && (
              <>
                <TouchableOpacity style={[styles.chip, amenTowels && styles.chipSelected]} onPress={() => setAmenTowels((v) => !v)}>
                  <Text style={[styles.chipText, amenTowels && styles.chipTextSelected]}>{t("amenity.towels")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenHairDryer && styles.chipSelected]} onPress={() => setAmenHairDryer((v) => !v)}>
                  <Text style={[styles.chipText, amenHairDryer && styles.chipTextSelected]}>{t("amenity.hairDryer")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenSoap && styles.chipSelected]} onPress={() => setAmenSoap((v) => !v)}>
                  <Text style={[styles.chipText, amenSoap && styles.chipTextSelected]}>{t("amenity.soap")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenToiletAccess && styles.chipSelected]} onPress={() => setAmenToiletAccess((v) => !v)}>
                  <Text style={[styles.chipText, amenToiletAccess && styles.chipTextSelected]}>{t("amenity.toiletAccess")}</Text>
                </TouchableOpacity>
              </>
            )}
            {category === "storage" && (
              <>
                <TouchableOpacity style={[styles.chip, amenOpen24h && styles.chipSelected]} onPress={() => setAmenOpen24h((v) => !v)}>
                  <Text style={[styles.chipText, amenOpen24h && styles.chipTextSelected]}>{t("amenity.open24h")}</Text>
                </TouchableOpacity>
                <View style={styles.dimensionsRow}>
                  <Text style={styles.dimensionsLabel}>{t("host.field.dimensions")}</Text>
                  <TextInput
                    style={styles.dimensionsInput}
                    value={amenDimensions}
                    onChangeText={setAmenDimensions}
                    placeholder={t("host.ph.dimensions")}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </>
            )}
            {category === "focus" && (
              <>
                <TouchableOpacity style={[styles.chip, amenWifi && styles.chipSelected]} onPress={() => setAmenWifi((v) => !v)}>
                  <Text style={[styles.chipText, amenWifi && styles.chipTextSelected]}>{t("amenity.wifi")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenErgonomicChair && styles.chipSelected]} onPress={() => setAmenErgonomicChair((v) => !v)}>
                  <Text style={[styles.chipText, amenErgonomicChair && styles.chipTextSelected]}>{t("amenity.ergonomicChair")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenIsolatedSpace && styles.chipSelected]} onPress={() => setAmenIsolatedSpace((v) => !v)}>
                  <Text style={[styles.chipText, amenIsolatedSpace && styles.chipTextSelected]}>{t("amenity.isolatedSpace")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.chip, amenAdjustableLighting && styles.chipSelected]} onPress={() => setAmenAdjustableLighting((v) => !v)}>
                  <Text style={[styles.chipText, amenAdjustableLighting && styles.chipTextSelected]}>{t("amenity.adjustableLighting")}</Text>
                </TouchableOpacity>
              </>
            )}
            {category === "tavolo" && (
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>{t("host.field.seatsCount")}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      const cur = parseInt(amenSeatsCount, 10) || 0;
                      setAmenSeatsCount(cur > 1 ? String(cur - 1) : cur === 1 ? "" : "");
                    }}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{amenSeatsCount || "0"}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      const cur = parseInt(amenSeatsCount, 10) || 0;
                      setAmenSeatsCount(String(cur + 1));
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {category === "charge" && (
              <>
                <View style={styles.dimensionsRow}>
                  <Text style={styles.dimensionsLabel}>{t("host.field.voltage")}</Text>
                  <TextInput
                    style={styles.dimensionsInput}
                    value={amenVoltage}
                    onChangeText={setAmenVoltage}
                    placeholder={t("host.ph.voltage")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.dimensionsRow}>
                  <Text style={styles.dimensionsLabel}>{t("host.field.outletCount")}</Text>
                  <TextInput
                    style={styles.dimensionsInput}
                    value={amenOutletCount}
                    onChangeText={setAmenOutletCount}
                    placeholder={t("host.ph.outletCount")}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <TouchableOpacity style={[styles.chip, amenInternationalPlug && styles.chipSelected]} onPress={() => setAmenInternationalPlug((v) => !v)}>
                  <Text style={[styles.chipText, amenInternationalPlug && styles.chipTextSelected]}>{t("amenity.internationalPlug")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
            onPress={onSave}
            disabled={!canSave || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t("auth.loading") : "Create listing"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LocationPickerModal
        visible={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSelect={handleLocationSelect}
        accentColor={HEADER_COLOR}
        showSuggested={false}
        initialCoords={currentCoords}
      />
    </View>
  );
}
