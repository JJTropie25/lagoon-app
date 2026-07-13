import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../../lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { parseFirstImageUrl } from "../../../lib/services";

const HEADER_COLOR = "#4F9B9B";
const GREEN  = "#2A7A3A";
const GREEN_BG = "#EBF5EC";
const TEAL   = "#4F9B9B";
const TEAL_BG = "#EAF4F4";

type Step = {
  icon: string;
  color: string;
  bg: string;
  label: string;
  sublabel?: string;
  isLast?: boolean;
  content?: React.ReactNode;
  fullWidthContent?: React.ReactNode;
};

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },

    // header
    header: {
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 12, paddingVertical: 8, gap: 8,
      backgroundColor: HEADER_COLOR,
    },
    headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 15, fontWeight: "700", fontFamily: "Baloo2_700Bold", color: "#fff" },

    // scroll content
    scroll: { paddingHorizontal: 16 },

    // service hero
    heroImage: { width: "100%", height: 170, borderRadius: 14, backgroundColor: c.border, marginBottom: 14 },
    heroName: { fontSize: 22, fontWeight: "700", fontFamily: "Baloo2_700Bold", color: c.textPrimary, marginBottom: 6 },
    heroPills: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: 4 },
    pill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: c.surfaceSoft, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    pillText: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },

    divider: { height: 1, backgroundColor: c.divider, marginVertical: 20 },

    // timeline
    timeline: { paddingLeft: 4 },
    timelineRow: { flexDirection: "row", gap: 14 },
    timelineLeft: { width: 32, alignItems: "center" },
    timelineDot: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: "center", justifyContent: "center",
    },
    timelineLine: { flex: 1, width: 2, marginTop: 4, marginBottom: 0 },
    timelineRight: { flex: 1, paddingBottom: 28 },
    stepLabel: { fontSize: 15, fontWeight: "700", fontFamily: "Baloo2_700Bold", color: c.textPrimary, marginTop: 4 },
    stepSublabel: { fontSize: 13, color: c.textSecondary, marginTop: 3, lineHeight: 18 },

    // directions button (inside timeline)
    dirBtn: {
      marginTop: 10,
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: TEAL, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 13,
      shadowColor: TEAL,
      shadowOpacity: 0.30,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    dirBtnText: { flex: 1, fontSize: 14, fontWeight: "700", color: "#fff" },

    // QR card — full-width (rendered outside timelineRight, compensate paddingLeft: 4 of timeline)
    qrCard: {
      marginTop: 12,
      marginLeft: -4,
      backgroundColor: c.listBackground,
      borderRadius: 20,
      paddingTop: 24,
      paddingBottom: 20,
      paddingHorizontal: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    qrCardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: TEAL,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 16,
    },
    qrDivider: {
      marginTop: 20,
      width: "100%",
      height: 1,
      backgroundColor: c.border,
      opacity: 0.5,
    },
    qrCardHint: {
      marginTop: 12,
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    qrPlaceholder: { color: c.textMuted, fontWeight: "600", paddingVertical: 40 },
  });
}

export default function BookingConfirmation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { destination, timeslot, microservice, selectedHour, bookingId, qrToken } =
    useLocalSearchParams<{
      destination?: string;
      timeslot?: string;
      microservice?: string;
      selectedHour?: string;
      bookingId?: string;
      qrToken?: string;
    }>();

  const [token, setToken] = useState<string | null>(qrToken ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [serviceTitle, setServiceTitle] = useState<string | null>(null);
  const [serviceLocation, setServiceLocation] = useState<string | null>(null);
  const [serviceLatitude, setServiceLatitude] = useState<number | null>(null);
  const [serviceLongitude, setServiceLongitude] = useState<number | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!supabase || !bookingId) return;
    supabase
      .from("bookings")
      .select("qr_token, slot_start, payment_status, service:services(title, location, image_url, latitude, longitude)")
      .eq("id", bookingId)
      .single()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data?.qr_token) setToken(data.qr_token);
        if (data?.slot_start) setSlotStart(data.slot_start);
        if (data?.payment_status) setPaymentStatus(data.payment_status);
        const svc = Array.isArray(data?.service) ? (data.service as any[])[0] : (data?.service as any);
        if (svc?.title) setServiceTitle(svc.title);
        if (svc?.location) setServiceLocation(svc.location);
        if (svc?.image_url) setImageUrl(parseFirstImageUrl(svc.image_url));
        if (svc?.latitude != null) setServiceLatitude(svc.latitude);
        if (svc?.longitude != null) setServiceLongitude(svc.longitude);
      });
    return () => { isMounted = false; };
  }, [bookingId]);

  const formattedDate = useMemo(() => {
    const src = slotStart ?? timeslot ?? selectedHour ?? null;
    if (!src) return null;
    const d = new Date(src);
    if (Number.isNaN(d.getTime())) return src;
    return d.toLocaleString("it-IT", {
      weekday: "short", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit",
    });
  }, [slotStart, timeslot, selectedHour]);

  const summaryTitle       = serviceTitle   ?? microservice ?? "-";
  const summaryDestination = serviceLocation ?? destination  ?? "-";
  const summaryTimeslot    = selectedHour   ?? timeslot     ?? formattedDate ?? "-";

  const isPaid = !paymentStatus || paymentStatus === "paid" || paymentStatus === "succeeded";
  const headerH = insets.top + 52;

  const steps: Step[] = [
    {
      icon: "check-circle",
      color: GREEN,
      bg: GREEN_BG,
      label: "Booking confermato",
      sublabel: formattedDate ?? summaryTimeslot,
    },
    {
      icon: isPaid ? "credit-card-check-outline" : "credit-card-clock-outline",
      color: isPaid ? GREEN : "#C8930A",
      bg: isPaid ? GREEN_BG : "#FEF3E2",
      label: "Pagamento",
      sublabel: isPaid ? "Confermato" : "In attesa di conferma",
    },
    {
      icon: "map-marker-radius-outline",
      color: TEAL,
      bg: TEAL_BG,
      label: "Raggiungi la struttura",
      sublabel: summaryDestination,
      content: (
        <TouchableOpacity
          style={styles.dirBtn}
          onPress={() =>
            router.push({
              pathname: "/Directions",
              params: {
                microservice: summaryTitle,
                destination: summaryDestination,
                timeslot: summaryTimeslot,
                latitude: serviceLatitude != null ? String(serviceLatitude) : undefined,
                longitude: serviceLongitude != null ? String(serviceLongitude) : undefined,
              },
            })
          }
        >
          <MaterialCommunityIcons name="navigation-variant-outline" size={18} color="#fff" />
          <Text style={styles.dirBtnText}>Indicazioni stradali</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      ),
    },
    {
      icon: "qrcode-scan",
      color: TEAL,
      bg: TEAL_BG,
      label: "Check-in",
      sublabel: "Mostra il codice QR all'ingresso",
      isLast: true,
      fullWidthContent: (
        <View style={styles.qrCard}>
          <Text style={styles.qrCardTitle}>Il tuo codice</Text>
          {token ? (
            <QRCode value={token} size={180} />
          ) : (
            <Text style={styles.qrPlaceholder}>{t("booking.qrCode")}</Text>
          )}
          <View style={styles.qrDivider} />
          <Text style={styles.qrCardHint}>Scansionato dallo staff all'ingresso</Text>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace("/(tabs)/guest")}>
          <MaterialCommunityIcons name="home-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("booking.thankYou")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 16, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Service hero */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <Text style={styles.heroName}>{summaryTitle}</Text>
        <View style={styles.heroPills}>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.pillText} numberOfLines={1}>{summaryDestination}</Text>
          </View>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.pillText}>{summaryTimeslot}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Timeline */}
        <View style={styles.timeline}>
          {steps.map((step, i) => (
            <View key={i}>
              <View style={styles.timelineRow}>
                {/* Left: dot + line */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: step.bg }]}>
                    <MaterialCommunityIcons name={step.icon as any} size={17} color={step.color} />
                  </View>
                  {!step.isLast && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.divider }]} />
                  )}
                </View>

                {/* Right: content */}
                <View style={styles.timelineRight}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  {step.sublabel ? <Text style={styles.stepSublabel}>{step.sublabel}</Text> : null}
                  {step.content ?? null}
                </View>
              </View>
              {step.fullWidthContent ?? null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
