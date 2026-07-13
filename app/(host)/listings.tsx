import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LoadingCard from "../../components/LoadingCard";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import TabTopNotch from "../../components/TabTopNotch";
import ServiceCard from "../../components/ServiceCard";
import { useI18n } from "../../lib/i18n";
import { useAuthState } from "../../lib/auth";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { deleteHostListing, fetchHostListings, resolveHostForUser } from "../../lib/host";
import { toCategoryIcon, toDistanceLabel, toPriceLabel, parseFirstImageUrl, type Service } from "../../lib/services";
import { useAppDialog } from "../../components/AppDialogProvider";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    container: { paddingBottom: 24 },
    headerBlock: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
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
    addButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.warmAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    hostSubtitle: {
      marginTop: 4,
      color: c.textSecondary,
      fontWeight: "600",
      paddingHorizontal: 16,
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
    actionRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    actionButton: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 9,
      alignItems: "center",
    },
    editButton: {
      backgroundColor: c.warmSurface,
      borderWidth: 1,
      borderColor: c.warmAccentSoft,
    },
    deleteButton: {
      backgroundColor: c.listBackground,
      borderWidth: 1,
      borderColor: "#A53B3B",
    },
    editButtonText: {
      color: c.warmAccentDark,
      fontWeight: "600",
      fontSize: 13,
    },
    deleteButtonText: {
      color: "#A53B3B",
      fontWeight: "600",
      fontSize: 13,
    },
  });
}

export default function HostListings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const dialog = useAppDialog();
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderImage = require("../../assets/images/react-logo.png");

  const [listings, setListings] = useState<Service[]>([]);
  const [hostLabel, setHostLabel] = useState<string | null>(null);
  const [hasHost, setHasHost] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { host } = await resolveHostForUser(user?.id);
    setHasHost(Boolean(host));
    if (!host) {
      setListings([]);
      setHostLabel(null);
      setLoading(false);
      return;
    }
    setHostLabel(host.display_name ?? null);
    const data = await fetchHostListings(host.id);
    setListings(data);
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
    return t("host.listings.empty");
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
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 58 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={
            <>
              <View style={styles.headerBlock}>
                <Text style={styles.title}>{t("host.listings.title")}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    if (!hasHost) {
                      dialog.alert(t("host.listings.title"), t("host.notAvailable"));
                      return;
                    }
                    router.push("/(host)/new-listing");
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            loading
              ? <LoadingCard topSpacing={48} />
              : <Text style={styles.emptyText}>{emptyText}</Text>
          }
          renderItem={({ item }) => (
            <View>
              <ServiceCard
                fullWidth
                horizontal
                flat
                imageSource={parseFirstImageUrl(item.image_url) ? { uri: parseFirstImageUrl(item.image_url)! } : placeholderImage}
                title={item.title}
                price={toPriceLabel(item.price_eur)}
                location={item.location}
                categoryIconName={toCategoryIcon(item.category)}
                distanceLabel={
                  typeof item.distance_meters === "number"
                    ? toDistanceLabel(item.distance_meters)
                    : undefined
                }
                rating={item.rating}
                onPress={() =>
                  router.push({
                    pathname: "/(host)/edit-listing",
                    params: { serviceId: item.id },
                  })
                }
              />
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() =>
                    router.push({
                      pathname: "/(host)/edit-listing",
                      params: { serviceId: item.id },
                    })
                  }
                >
                  <Text style={styles.editButtonText}>{t("host.action.edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={async () => {
                    const confirmed = await dialog.confirm({
                      title: t("host.action.delete"),
                      message: t("host.listings.deleteConfirm"),
                      confirmText: t("host.action.delete"),
                      cancelText: t("host.action.cancel"),
                    });
                    if (!confirmed) return;
                    const errorMessage = await deleteHostListing(item.id);
                    if (errorMessage) {
                      await dialog.alert(t("host.action.delete"), errorMessage);
                      return;
                    }
                    await loadData();
                  }}
                >
                  <Text style={styles.deleteButtonText}>{t("host.action.delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
    </View>
  );
}