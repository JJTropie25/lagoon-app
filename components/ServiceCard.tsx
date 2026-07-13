import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import { ServiceAmenities } from "../lib/services";
import { toDistanceLabel } from "../lib/services";
import { useI18n } from "../lib/i18n";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageSourcePropType,
  Pressable,
  ViewStyle,
  ImageStyle,
} from "react-native";
import { memo, useMemo } from "react";

const CARD_RADIUS = 10;

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};

type NearToData = { name: string; distanceMeters: number };

type ServiceCardProps = {
  title: string;
  price: string;
  location: string;
  imageSource: ImageSourcePropType;
  meta?: string;
  category?: "rest" | "shower" | "storage";
  categoryIconName?: string;
  distanceLabel?: string;
  rating?: number | null;
  fullWidth?: boolean;
  horizontal?: boolean;
  flat?: boolean;
  onPress?: () => void;
  containerStyle?: ViewStyle;
  imageStyle?: ImageStyle;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isPreviouslyViewed?: boolean;
  nearTo?: NearToData | null;
  cancellationMinutes?: number | null;
  amenities?: ServiceAmenities | null;
  serviceId?: string;
  reviewCount?: number | null;
};

function toRatingWord(rating: number, t: (k: string) => string): string {
  if (rating <= 3) return t("rating.poor");
  if (rating <= 5) return t("rating.fair");
  if (rating <= 7) return t("rating.good");
  if (rating <= 9) return t("rating.veryGood");
  return t("rating.excellent");
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    const j = (h >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type Pill = { icon: string; text: string };

function buildPills(
  isPreviouslyViewed: boolean | undefined,
  nearTo: NearToData | null | undefined,
  cancellationMinutes: number | null | undefined,
  amenities: ServiceAmenities | null | undefined,
  t: (k: string) => string,
  seed: string
): Pill[] {
  const fixed: Pill[] = [];
  const rest: Pill[] = [];

  if (isPreviouslyViewed)
    fixed.push({ icon: "clock-outline", text: t("card.previouslyViewed") });

  if (nearTo) {
    const dist = toDistanceLabel(nearTo.distanceMeters) ?? "";
    rest.push({
      icon: "map-marker-outline",
      text: t("card.nearTo").replace("{distance}", dist).replace("{name}", nearTo.name),
    });
  }
  if (cancellationMinutes != null)
    rest.push({ icon: "calendar-remove-outline", text: t("card.cancellation").replace("{minutes}", String(cancellationMinutes)) });

  if (amenities) {
    if (amenities.towels_included)  rest.push({ icon: "hanger",               text: t("amenity.towels") });
    if (amenities.hair_dryer)       rest.push({ icon: "hair-dryer",            text: t("amenity.hairDryer") });
    if (amenities.soap_included)    rest.push({ icon: "bottle-tonic-outline",  text: t("amenity.soap") });
    if (amenities.open_24h)         rest.push({ icon: "hours-24",              text: t("amenity.open24h") });
    if (amenities.dimensions)       rest.push({ icon: "cube-outline",          text: t("amenity.dimensions").replace("{value}", amenities.dimensions) });
    if (amenities.quiet_location)   rest.push({ icon: "volume-off",            text: t("amenity.quietLocation") });
    if (amenities.blanket)          rest.push({ icon: "weather-night",         text: t("amenity.blanket") });
    if (amenities.sofa_or_bed)      rest.push({ icon: amenities.sofa_or_bed === "bed" ? "bed-king" : "sofa", text: t("amenity.sofaBed") });
    if (amenities.toilet_access)    rest.push({ icon: "toilet",                text: t("amenity.toiletAccess") });
  }

  return [...fixed, ...seededShuffle(rest, seed)];
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      position: "relative",
      width: 170,
      backgroundColor: c.cardBackground,
      borderRadius: CARD_RADIUS,
      marginRight: 12,
      overflow: "visible",
      shadowColor: "#000",
      shadowOpacity: 0.24,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 6 },
      elevation: 7,
    },
    cardFull: {
      width: "100%",
      marginRight: 0,
    },
    cardHorizontal: {
      flexDirection: "row",
      alignItems: "stretch",
      height: 200,
    },
    cardFlat: {
      borderRadius: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      backgroundColor: c.listBackground,
    },
    imageWrap: {
      position: "relative",
      width: "100%",
    },
    imageWrapHorizontal: {
      width: 132,
      flexShrink: 0,
      alignSelf: "stretch",
    },
    imageWrapHorizontalFlat: {
      paddingVertical: 10,
      paddingLeft: 12,
      paddingRight: 8,
    },
    image: {
      width: "100%",
      backgroundColor: c.surfaceSoft,
    },
    imageVertical: {
      height: 145,
      borderTopLeftRadius: CARD_RADIUS,
      borderTopRightRadius: CARD_RADIUS,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    imageHorizontal: {
      flex: 1,
      height: undefined,
      borderTopLeftRadius: CARD_RADIUS,
      borderBottomLeftRadius: CARD_RADIUS,
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
    imageHorizontalFlat: {
      flex: 1,
      height: undefined,
      borderRadius: 8,
    },
    favoriteButton: {
      position: "absolute",
      top: 7,
      right: 7,
      padding: 2,
      shadowColor: "#4F9B9B",
      shadowOpacity: 0.9,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
    },
    content: {
      flex: 1,
      padding: 10,
    },
    contentHorizontal: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      overflow: "hidden",
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: c.textPrimary,
      marginBottom: 4,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    ratingBadge: {
      backgroundColor: c.textPrimary,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    ratingText: {
      color: c.cardBackground,
      fontSize: 10,
      fontWeight: "600",
    },
    ratingTextWord: {
      color: c.cardBackground,
      fontSize: 10,
      fontWeight: "600",
      opacity: 0.8,
    },
    reviewCountText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: "600",
    },
    categoryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 4,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    categoryBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "600",
    },
    distanceText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: "600",
      marginLeft: 4,
    },
    meta: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    pillsRow: {
      flexDirection: "column",
      gap: 3,
      marginTop: 4,
      marginBottom: 4,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    pillText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: "600",
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
      marginTop: "auto",
    },
    location: {
      fontSize: 12,
      color: c.textSecondary,
      flex: 1,
    },
    price: {
      fontSize: 17,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.accent,
      flexShrink: 0,
    },
  });
}

function ServiceCard({
  title,
  price,
  location,
  imageSource,
  meta,
  category,
  categoryIconName,
  distanceLabel,
  rating,
  fullWidth,
  horizontal,
  flat,
  onPress,
  containerStyle,
  imageStyle,
  isFavorite,
  onToggleFavorite,
  isPreviouslyViewed,
  nearTo,
  cancellationMinutes,
  amenities,
  serviceId = "",
  reviewCount,
}: ServiceCardProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Container = onPress ? Pressable : View;

  const ratingLabel =
    typeof rating === "number" && Number.isFinite(rating)
      ? `${rating.toFixed(1)}/10`
      : null;
  const ratingWord =
    typeof rating === "number" && Number.isFinite(rating)
      ? toRatingWord(rating, t)
      : null;

  const showCategoryRow = Boolean(category && categoryIconName);
  const catColor = category ? (CATEGORY_COLORS[category] ?? colors.textSecondary) : colors.textSecondary;

  const allPills = buildPills(isPreviouslyViewed, nearTo, cancellationMinutes, amenities, t, serviceId);
  const displayPills = horizontal ? allPills.slice(0, 3) : [];

  return (
    <Container
      style={[
        styles.card,
        fullWidth && styles.cardFull,
        horizontal && styles.cardHorizontal,
        flat && styles.cardFlat,
        containerStyle,
      ]}
      onPress={onPress}
    >
      <View style={[styles.imageWrap, horizontal && styles.imageWrapHorizontal, horizontal && flat && styles.imageWrapHorizontalFlat]}>
        <Image
          source={imageSource}
          style={[
            styles.image,
            horizontal
              ? flat
                ? styles.imageHorizontalFlat
                : styles.imageHorizontal
              : styles.imageVertical,
            imageStyle,
          ]}
          resizeMode="cover"
        />
        {onToggleFavorite && (
          <Pressable style={styles.favoriteButton} onPress={onToggleFavorite}>
            <MaterialCommunityIcons
              name={isFavorite ? "star" : "star-outline"}
              size={20}
              color="#fff"
            />
          </Pressable>
        )}
      </View>

      <View style={[styles.content, horizontal && styles.contentHorizontal]}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        {ratingLabel && (
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{ratingLabel}</Text>
              {horizontal && ratingWord && (
                <Text style={styles.ratingTextWord}>{"· " + ratingWord}</Text>
              )}
            </View>
            {reviewCount != null && reviewCount > 0 && (
              <Text style={styles.reviewCountText}>
                {t("card.reviewCount").replace("{count}", String(reviewCount))}
              </Text>
            )}
          </View>
        )}

        {showCategoryRow && (
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
              <MaterialCommunityIcons
                name={categoryIconName as any}
                size={11}
                color="#fff"
              />
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {category ? t(`category.${category}`) : ""}
              </Text>
            </View>
            {distanceLabel ? (
              <Text style={styles.distanceText}>{distanceLabel}</Text>
            ) : null}
          </View>
        )}

        {meta && !showCategoryRow ? <Text style={styles.meta}>{meta}</Text> : null}

        {displayPills.length > 0 && (
          <View style={styles.pillsRow}>
            {displayPills.map((p, i) => (
              <View key={i} style={styles.pill}>
                <MaterialCommunityIcons
                  name={p.icon as any}
                  size={11}
                  color={colors.textSecondary}
                />
                <Text style={styles.pillText} numberOfLines={1}>{p.text}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.location} numberOfLines={1}>{location}</Text>
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
    </Container>
  );
}

export default memo(ServiceCard);