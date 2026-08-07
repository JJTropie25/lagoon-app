import { View, Text, StyleSheet, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LoadingCard from "../../components/LoadingCard";
import { useRouter } from "expo-router";
import LoginGate from "../../components/LoginGate";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ServiceCard from "../../components/ServiceCard";
import TabTopNotch from "../../components/TabTopNotch";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { useAuthState } from "../../lib/auth";
import { useCallback, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  addFavorite,
  fetchFavoriteIds,
  fetchFavoriteServices,
  removeFavorite,
} from "../../lib/favorites";
import { toCategoryIcon, toPriceLabel, parseFirstImageUrl } from "../../lib/services";
import { useFocusEffect } from "@react-navigation/native";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: { paddingBottom: 24 },
    title: {
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
    loadingWrap: {
      paddingTop: 60,
      alignItems: "center" as const,
    },
    emptyText: {
      color: c.textMuted,
      textAlign: "center",
      marginTop: 24,
      fontWeight: "600",
      paddingHorizontal: 16,
    },
  });
}

export default function Favorites() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderImage = require("../../assets/images/react-logo.png");
  const { user } = useAuthState();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async (isMounted: () => boolean) => {
    if (!supabase || !user) {
      if (!isMounted()) return;
      setFavoriteIds(new Set());
      setItems([]);
      setLoading(false);
      return;
    }

    if (!isMounted()) return;
    setLoading(true);
    const [ids, services] = await Promise.all([
      fetchFavoriteIds(user.id),
      fetchFavoriteServices(user.id),
    ]);
    if (!isMounted()) return;
    setFavoriteIds(ids);
    setItems(services);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const isMounted = () => mounted;
      loadFavorites(isMounted);
      return () => {
        mounted = false;
      };
    }, [loadFavorites])
  );

  const emptyText = useMemo(() => {
    if (!user) return t("favorites.signIn");
    return t("favorites.empty");
  }, [t, user]);

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
      {!user ? <LoginGate /> : <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 58 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <Text style={styles.title}>{t("favorites.title")}</Text>
          }
          ListEmptyComponent={
            loading
              ? <LoadingCard />
              : <Text style={styles.emptyText}>{emptyText}</Text>
          }
          renderItem={({ item }) => (
            <ServiceCard
              fullWidth
              horizontal
              flat
              imageSource={parseFirstImageUrl(item.image_url) ? { uri: parseFirstImageUrl(item.image_url)! } : placeholderImage}
              title={item.title}
              price={toPriceLabel(item.price_eur)}
              location={item.location}
              category={item.category}
              categoryIconName={toCategoryIcon(item.category)}
              amenities={item.amenities ?? null}
              cancellationMinutes={item.cancellation_minutes ?? null}
              serviceId={item.id}
              rating={item.rating}
              reviewCount={item.review_count ?? null}
              isFavorite={favoriteIds.has(item.id)}
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
                setItems((prev) => prev.filter((s) => next.has(s.id)));
              }}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/guest/ServiceDetails",
                  params: {
                    serviceId: item.id,
                    destination: item.location,
                    timeslot: "Anytime",
                    people: "1",
                    microservice: item.title,
                  },
                })
              }
            />
          )}
        />}
    </View>
  );
}