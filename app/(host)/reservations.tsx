import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LoadingCard from "../../components/LoadingCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import TabTopNotch from "../../components/TabTopNotch";
import { useI18n } from "../../lib/i18n";
import { useAuthState } from "../../lib/auth";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { fetchHostReservations, resolveHostForUser, type HostReservation } from "../../lib/host";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { toCategoryIcon } from "../../lib/services";

function toSlotLabel(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
    start.getDate()
  ).padStart(2, "0")}`;
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${hhmm(start)}-${hhmm(end)}`;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: { paddingBottom: 24 },
    titleBlock: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
    },
    hostSubtitle: {
      marginTop: 4,
      color: c.textSecondary,
      fontWeight: "600",
    },
    emptyText: {
      marginTop: 36,
      textAlign: "center",
      color: c.textSecondary,
      fontWeight: "600",
      paddingHorizontal: 16,
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
      minHeight: 140,
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
    cardBody: {
      flex: 1,
      paddingVertical: 12,
      paddingRight: 12,
      overflow: "hidden",
      gap: 4,
    },
    cardTitle: {
      color: c.textPrimary,
      fontWeight: "600",
      fontSize: 14,
    },
    textExpired: {
      color: c.textMuted,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    guestBadge: {
      backgroundColor: c.surface,
      color: c.textPrimary,
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      fontSize: 11,
    },
    statusBadge: {
      fontWeight: "600",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      color: "#1C1C1C",
      fontSize: 11,
    },
    statusReserved: {
      backgroundColor: "#F5E7A6",
    },
    statusCheckedIn: {
      backgroundColor: "#BFE9D2",
      color: "#1F6E44",
    },
    statusExpired: {
      backgroundColor: "#D5E0E0",
      color: "#687878",
    },
    summaryStack: {
      gap: 3,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    summaryItem: {
      fontWeight: "600",
      color: c.textSecondary,
      fontSize: 12,
      flexShrink: 1,
    },
  });
}

export default function HostReservations() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderImage = require("../../assets/images/react-logo.png");

  const [items, setItems] = useState<HostReservation[]>([]);
  const [hostLabel, setHostLabel] = useState<string | null>(null);
  const [hasHost, setHasHost] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { host } = await resolveHostForUser(user?.id);
    setHasHost(Boolean(host));
    if (!host) {
      setHostLabel(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setHostLabel(host.display_name ?? null);
    const data = await fetchHostReservations(host.id);
    setItems(data);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const emptyText = useMemo(() => {
    if (loading) return t("host.loading");
    if (!hasHost) return t("host.notAvailable");
    return t("host.reservations.empty");
  }, [hasHost, loading, t]);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />
      <TabTopNotch hostMode />
      <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 58 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{t("host.reservations.title")}</Text>
            </View>
          }
          ListEmptyComponent={
            loading
              ? <LoadingCard topSpacing={48} />
              : <Text style={styles.emptyText}>{emptyText}</Text>
          }
          renderItem={({ item }) => {
            const isExpired = new Date(item.slot_end).getTime() < Date.now();
            const isCheckedIn = Boolean(item.checked_in_at);
            const statusLabel = isExpired
              ? t("booking.expired")
              : isCheckedIn
              ? t("host.reservation.checkedIn")
              : t("host.reservation.reserved");
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/(host)/reservation/[bookingId]",
                    params: { bookingId: item.id },
                  })
                }
              >
                <View style={styles.cardImageWrap}>
                  <Image
                    source={item.service_image_url ? { uri: item.service_image_url } : placeholderImage}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text
                    style={[styles.cardTitle, isExpired && styles.textExpired]}
                    numberOfLines={2}
                  >
                    {item.service_title}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Text style={styles.guestBadge}>{item.guest_username ?? "Guest"}</Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        isExpired
                          ? styles.statusExpired
                          : isCheckedIn
                          ? styles.statusCheckedIn
                          : styles.statusReserved,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                  <View style={styles.summaryStack}>
                    <View style={styles.summaryRow}>
                      {item.service_category ? (
                        <MaterialCommunityIcons
                          name={toCategoryIcon(item.service_category) as any}
                          size={13}
                          color={colors.textSecondary}
                        />
                      ) : null}
                      <Text style={[styles.summaryItem, isExpired && styles.textExpired]} numberOfLines={1}>
                        {toSlotLabel(item.slot_start, item.slot_end)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.summaryItem, isExpired && styles.textExpired]} numberOfLines={1}>
                        {item.service_location}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="account-group" size={13} color={colors.textSecondary} />
                      <Text style={[styles.summaryItem, isExpired && styles.textExpired]}>
                        {item.people_count}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
    </View>
  );
}