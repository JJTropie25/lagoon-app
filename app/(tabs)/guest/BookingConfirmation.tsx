import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
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
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      backgroundColor: TEAL_BG, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      borderWidth: 1, borderColor: TEAL + "44",
    },
    dirBtnText: { fontSize: 14, fontWeight: "700", color: TEAL },

    // QR card
    qrCard: {
      marginTop: 12,
      backgroundColor: c.listBackground,
      borderRadius: 18,
      padding: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.10,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    qrCardHint: {
      marginTop: 16,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "center",
      fontWeight: "600",
    },
    qrPlaceholder: { color: c.textMuted, fontWeight: "600", paddingVertical: 40 },
  });
}

export default function BookingConfirmation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { colors } = useTheme();
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
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!supabase || !bookingId) return;
    supabase
      .from("bookings")
      .select("qr_token, slot_start, payment_status, service:services(title, location, image_url)")
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
              params: { microservice: summaryTitle, destination: summaryDestination, timeslot: summaryTimeslot },
            })
          }
        >
          <Text style={styles.dirBtnText}>Indicazioni stradali</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={TEAL} />
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
      content: (
        <View style={styles.qrCard}>
          {token ? (
            <QRCode value={token} size={190} />
          ) : (
            <Text style={styles.qrPlaceholder}>{t("booking.qrCode")}</Text>
          )}
          <Text style={styles.qrCardHint}>Scansionato dallo staff all'ingresso</Text>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.screen}>
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
            <View key={i} style={styles.timelineRow}>
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
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
