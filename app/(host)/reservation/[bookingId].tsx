import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { supabase } from "../../../lib/supabase";
import { useI18n } from "../../../lib/i18n";
import { useAppDialog } from "../../../components/AppDialogProvider";
import { toCategoryIcon, parseFirstImageUrl } from "../../../lib/services";

const HEADER_COLOR = "#4F9B9B";

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};

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
    content: { paddingHorizontal: 20, paddingBottom: 32 },

    // Hero image
    heroImage: {
      width: "100%",
      height: 200,
      borderRadius: 16,
      backgroundColor: c.surfaceSoft,
      marginBottom: 20,
    },

    // Service title block
    serviceTitle: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 4,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 16,
    },
    locationText: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: "600",
      flex: 1,
    },

    // Status badge
    statusRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    categoryBadgeText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
    },
    statusBadge: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },

    divider: { height: 1, backgroundColor: c.divider, marginBottom: 20 },

    // Info rows
    infoSection: { gap: 14, marginBottom: 24 },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    infoIconWrap: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surfaceSoft,
      alignItems: "center", justifyContent: "center",
    },
    infoText: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textPrimary,
      marginTop: 1,
    },

    // Bottom actions
    actions: { gap: 12 },
    btnPrimary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: HEADER_COLOR,
      paddingVertical: 15,
      borderRadius: 12,
    },
    btnPrimaryText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
      fontFamily: "Baloo2_700Bold",
    },
    btnSecondary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: c.warmAccent,
      paddingVertical: 15,
      borderRadius: 12,
    },
    btnSecondaryText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
      fontFamily: "Baloo2_700Bold",
    },
    btnDisabled: { opacity: 0.5 },
  });
}

export default function HostReservationDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const dialog = useAppDialog();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeholderImage = require("../../../assets/images/react-logo.png");

  const [serviceTitle, setServiceTitle] = useState<string>("-");
  const [serviceLocation, setServiceLocation] = useState<string>("-");
  const [serviceImage, setServiceImage] = useState<string | null>(null);
  const [serviceCategory, setServiceCategory] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [slotEnd, setSlotEnd] = useState<string | null>(null);
  const [people, setPeople] = useState(1);
  const [guestUsername, setGuestUsername] = useState<string | null>(null);
  const [guestPhone, setGuestPhone] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!supabase || !bookingId) return;
    (async () => {
      const sb = supabase;
      if (!sb) return;
      const { data: booking } = await sb
        .from("bookings")
        .select("guest_id, people_count, slot_start, slot_end, qr_token, checked_in_at, service:services(title, location, image_url, category)")
        .eq("id", bookingId)
        .maybeSingle();
      if (!mounted || !booking) return;

      setPeople(booking.people_count ?? 1);
      setSlotStart(booking.slot_start ?? null);
      setSlotEnd(booking.slot_end ?? null);
      setQrToken(booking.qr_token ?? null);
      setCheckedInAt(booking.checked_in_at ?? null);

      const svc = Array.isArray(booking.service) ? booking.service[0] : booking.service;
      setServiceTitle(svc?.title ?? "-");
      setServiceLocation(svc?.location ?? "-");
      setServiceImage(parseFirstImageUrl(svc?.image_url) ?? null);
      setServiceCategory(svc?.category ?? null);

      if (booking.guest_id) {
        const { data: profile } = await sb
          .from("profiles")
          .select("phone_country_code, phone_number, username")
          .eq("id", booking.guest_id)
          .maybeSingle();
        if (!mounted) return;
        setGuestUsername(profile?.username ?? null);
        if (profile?.phone_number) {
          setGuestPhone(`${profile.phone_country_code ?? ""}${profile.phone_number}`.replace(/[^\d+]/g, ""));
        }
      }
    })();
    return () => { mounted = false; };
  }, [bookingId]);

  const isExpired = slotEnd ? new Date(slotEnd).getTime() < Date.now() : false;
  const isCheckedIn = Boolean(checkedInAt);

  const statusLabel = isExpired
    ? t("booking.expired")
    : isCheckedIn
    ? t("host.reservation.checkedIn")
    : t("host.reservation.reserved");

  const statusBg = isExpired ? "#D5E0E0" : isCheckedIn ? "#BFE9D2" : "#F5E7A6";
  const statusColor = isExpired ? "#687878" : isCheckedIn ? "#1F6E44" : "#7A6010";

  const catColor = serviceCategory ? (CATEGORY_COLORS[serviceCategory] ?? HEADER_COLOR) : HEADER_COLOR;
  const catIcon = serviceCategory ? toCategoryIcon(serviceCategory as any) : null;

  const slotLabel = (() => {
    if (!slotStart) return "-";
    const s = new Date(slotStart);
    const e = slotEnd ? new Date(slotEnd) : null;
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
    const time = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
    const endTime = e ? `–${pad(e.getHours())}:${pad(e.getMinutes())}` : "";
    return `${date}  ${time}${endTime}`;
  })();

  const headerH = insets.top + 52;

  return (
    <View style={styles.screen}>
      {/* Fixed teal header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(host)/reservations"))}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservation</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: headerH + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <Image
          source={serviceImage ? { uri: serviceImage } : placeholderImage}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Service name + location */}
        <Text style={styles.serviceTitle} numberOfLines={2}>{serviceTitle}</Text>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.locationText} numberOfLines={1}>{serviceLocation}</Text>
        </View>

        {/* Status badges */}
        <View style={styles.statusRow}>
          {catIcon ? (
            <View style={[styles.categoryBadge, { backgroundColor: catColor }]}>
              <MaterialCommunityIcons name={catIcon as any} size={13} color="#fff" />
              <Text style={styles.categoryBadgeText}>{t(`category.${serviceCategory}`)}</Text>
            </View>
          ) : null}
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Info rows */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Time slot</Text>
              <Text style={styles.infoValue}>{slotLabel}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="account-group" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>{t("home.people")}</Text>
              <Text style={styles.infoValue}>{people}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Guest</Text>
              <Text style={styles.infoValue}>{guestUsername ?? "—"}</Text>
            </View>
          </View>

          {guestPhone ? (
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <MaterialCommunityIcons name="phone-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{guestPhone}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnPrimary, !guestPhone && styles.btnDisabled]}
            disabled={!guestPhone}
            onPress={async () => {
              if (!guestPhone) {
                await dialog.alert("Contact guest", "Guest phone is not available.");
                return;
              }
              const url = `tel:${guestPhone}`;
              const ok = await Linking.canOpenURL(url);
              if (!ok) { await dialog.alert("Contact guest", "Unable to open phone dialer."); return; }
              await Linking.openURL(url);
            }}
          >
            <MaterialCommunityIcons name="phone" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>Contact guest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() =>
              router.push({
                pathname: "/(host)/scan-qr",
                params: { bookingId, expectedToken: qrToken ?? "" },
              })
            }
          >
            <MaterialCommunityIcons name="qrcode-scan" size={18} color="#fff" />
            <Text style={styles.btnSecondaryText}>Scan QR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
