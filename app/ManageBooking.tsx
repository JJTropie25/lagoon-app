import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "../lib/auth";
import { supabase } from "../lib/supabase";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import { useAppDialog } from "../components/AppDialogProvider";
import { parseFirstImageUrl } from "../lib/services";

const HEADER_COLOR = "#4F9B9B";
const TEAL = "#4F9B9B";
const TEAL_BG = "#EAF4F4";
const GREEN = "#2A7A3A";
const GREEN_BG = "#EBF5EC";
const DANGER_COLOR = "#B94040";

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

    scroll: { paddingHorizontal: 16 },

    heroImage: {
      width: "100%", height: 170,
      borderRadius: 14,
      backgroundColor: c.border,
      marginBottom: 14,
    },
    heroName: {
      fontSize: 22, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 6,
    },
    heroPills: {
      flexDirection: "row", gap: 10,
      flexWrap: "wrap", marginBottom: 4,
    },
    pill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: c.surfaceSoft, borderRadius: 8,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    pillText: { fontSize: 13, color: c.textSecondary, fontWeight: "600" },

    divider: { height: 1, backgroundColor: c.divider, marginVertical: 20 },

    // Timeline
    timeline: { paddingLeft: 4 },
    timelineRow: { flexDirection: "row", gap: 14 },
    timelineLeft: { width: 32, alignItems: "center" },
    timelineDot: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: "center", justifyContent: "center",
    },
    timelineLine: { flex: 1, width: 2, marginTop: 4 },
    timelineRight: { flex: 1, paddingBottom: 28 },
    stepLabel: {
      fontSize: 15, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary, marginTop: 4,
    },
    stepSublabel: { fontSize: 13, color: c.textSecondary, marginTop: 3, lineHeight: 18 },

    // Directions button (inside timeline)
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

    // QR card
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

    // Fixed bottom action bar
    actionBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: c.screenBackground,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      gap: 10,
    },
    btn: {
      height: 50, borderRadius: 14,
      justifyContent: "center", alignItems: "center",
      paddingHorizontal: 12,
    },
    btnFilled: {
      backgroundColor: TEAL,
      shadowColor: TEAL,
      shadowOpacity: 0.28,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    btnReview: {
      backgroundColor: c.warmAccent,
      shadowColor: c.warmAccent,
      shadowOpacity: 0.28,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    btnDanger: {
      borderWidth: 1.5,
      borderColor: DANGER_COLOR,
      backgroundColor: "transparent",
    },
    btnText: { fontWeight: "700", fontSize: 14, color: "#fff" },
    btnTextDanger: { color: DANGER_COLOR, fontWeight: "600", fontSize: 14 },
    btnDisabled: { opacity: 0.5 },
  });
}

export default function ManageBooking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const dialog = useAppDialog();
  const {
    destination, timeslot, people, microservice, from, bookingId, qrToken,
    latitude: latParam, longitude: lngParam,
  } = useLocalSearchParams<{
    destination?: string;
    timeslot?: string;
    people?: string;
    microservice?: string;
    from?: string;
    bookingId?: string;
    qrToken?: string;
    latitude?: string;
    longitude?: string;
  }>();

  const [token, setToken] = useState<string | null>(qrToken ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hostPhone, setHostPhone] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [serviceLatitude, setServiceLatitude] = useState<number | null>(null);
  const [serviceLongitude, setServiceLongitude] = useState<number | null>(null);
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function waitForSession(timeoutMs = 3000) {
    if (!supabase) return null;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const { data } = await supabase.auth.getSession();
        const session = (data as any)?.session ?? null;
        if (session?.user) return session.user;
      } catch {
        // ignore and retry
      }
      await sleep(250);
    }
    return null;
  }

  useEffect(() => {
    let isMounted = true;
    if (!supabase || !bookingId) return;
    supabase
      .from("bookings")
      .select("qr_token, slot_start, service_id, payment_status, service:services(image_url, latitude, longitude)")
      .eq("id", bookingId)
      .single()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data?.qr_token) setToken(data.qr_token);
        setSlotStart(data?.slot_start ?? null);
        setServiceId(data?.service_id ?? null);
        setPaymentStatus(data?.payment_status ?? null);
        const svc = Array.isArray(data?.service) ? (data.service as any[])[0] : (data?.service as any);
        if (svc?.image_url) setImageUrl(parseFirstImageUrl(svc.image_url));
        if (svc?.latitude != null) setServiceLatitude(svc.latitude);
        if (svc?.longitude != null) setServiceLongitude(svc.longitude);
      });
    return () => { isMounted = false; };
  }, [bookingId]);

  useEffect(() => {
    let isMounted = true;
    if (!supabase || !bookingId) return;
    supabase
      .from("service_reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted) return;
        setHasReview(Boolean(data?.id));
      });
    return () => { isMounted = false; };
  }, [bookingId]);

  useEffect(() => {
    let isMounted = true;
    if (!supabase || !bookingId) return;
    const loadHostPhone = async () => {
      const sb = supabase;
      if (!sb) return;
      const { data: bookingRow } = await sb
        .from("bookings")
        .select("service_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (!isMounted || !bookingRow?.service_id) return;
      const { data: serviceRow } = await sb
        .from("services")
        .select("host_id")
        .eq("id", bookingRow.service_id)
        .maybeSingle();
      if (!isMounted || !serviceRow?.host_id) return;
      const { data: hostRow } = await sb
        .from("hosts")
        .select("guest_id, phone_country_code, phone_number")
        .eq("id", serviceRow.host_id)
        .maybeSingle();
      if (!isMounted) return;
      if (hostRow?.phone_number) {
        const compact = `${hostRow.phone_country_code ?? ""}${hostRow.phone_number}`.replace(/[^\d+]/g, "");
        if (compact) { setHostPhone(compact); return; }
      }
      if (!hostRow?.guest_id) return;
      const { data: profileRow } = await sb
        .from("profiles")
        .select("phone_country_code, phone_number")
        .eq("id", hostRow.guest_id)
        .maybeSingle();
      if (!isMounted) return;
      if (profileRow?.phone_number) {
        const compact = `${profileRow.phone_country_code ?? ""}${profileRow.phone_number}`.replace(/[^\d+]/g, "");
        setHostPhone(compact || null);
      } else {
        setHostPhone(null);
      }
    };
    loadHostPhone();
    return () => { isMounted = false; };
  }, [bookingId]);

  const isExpired = slotStart ? new Date(slotStart).getTime() < Date.now() : false;
  const isPaid = !paymentStatus || paymentStatus === "paid" || paymentStatus === "succeeded";
  const headerH = insets.top + 52;

  const formattedDate = useMemo(() => {
    const src = slotStart ?? timeslot ?? null;
    if (!src) return null;
    const d = new Date(src);
    if (Number.isNaN(d.getTime())) return src;
    return d.toLocaleString("it-IT", {
      weekday: "short", day: "numeric", month: "long",
      hour: "2-digit", minute: "2-digit",
    });
  }, [slotStart, timeslot]);

  const dirLat = serviceLatitude != null ? String(serviceLatitude) : (latParam ?? undefined);
  const dirLng = serviceLongitude != null ? String(serviceLongitude) : (lngParam ?? undefined);

  const steps: Step[] = useMemo(() => [
    {
      icon: "check-circle",
      color: GREEN,
      bg: GREEN_BG,
      label: "Booking confermato",
      sublabel: formattedDate ?? timeslot ?? "-",
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
      sublabel: destination ?? "-",
      content: !isExpired ? (
        <Pressable
          style={styles.dirBtn}
          onPress={() =>
            router.push({
              pathname: "/Directions",
              params: {
                microservice: microservice,
                destination: destination,
                timeslot: timeslot,
                latitude: dirLat,
                longitude: dirLng,
              },
            })
          }
        >
          <MaterialCommunityIcons name="navigation-variant-outline" size={18} color="#fff" />
          <Text style={styles.dirBtnText}>Indicazioni stradali</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      ) : undefined,
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
          <Text style={styles.qrCardTitle}>{t("booking.accessQr")}</Text>
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [formattedDate, timeslot, isPaid, destination, isExpired, token, dirLat, dirLng, microservice, styles]);

  const handleBack = () => {
    if (from === "bookings") {
      router.replace("/(tabs)/bookings");
    } else {
      router.back();
    }
  };

  const handleCancel = async () => {
    if (!bookingId || !supabase) {
      await dialog.alert(t("booking.cancel"), "Unable to cancel this booking.");
      return;
    }
    const confirmed = await dialog.confirm({
      title: t("booking.cancel"),
      message: t("booking.cancelConfirm"),
      cancelText: t("booking.cancelNo"),
      confirmText: t("booking.cancelYes"),
      confirmVariant: "danger",
    });
    if (!confirmed) return;
    setCanceling(true);
    try {
      const sessionUser = user ?? (await waitForSession(3000));
      const activeUserId = sessionUser?.id ?? null;
      if (!activeUserId) {
        setCanceling(false);
        await dialog.alert(t("booking.cancel"), t("bookings.signIn") || "Please sign in to cancel bookings.");
        return;
      }
      const idToUse = bookingId && /^[0-9]+$/.test(String(bookingId)) ? Number(bookingId) : bookingId;
      const { data: fetchData, error: fetchErr } = await supabase
        .from("bookings")
        .select("guest_id")
        .eq("id", idToUse as any)
        .maybeSingle();
      if (fetchErr) { setCanceling(false); await dialog.alert(t("booking.cancel"), fetchErr.message); return; }
      if (!fetchData || fetchData.guest_id !== activeUserId) {
        setCanceling(false);
        await dialog.alert(t("booking.cancel"), t("booking.cancelNotAllowed") || "You are not allowed to cancel this booking.");
        return;
      }
      const { data, error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", idToUse as any)
        .eq("guest_id", activeUserId)
        .select("*");
      if (error) { setCanceling(false); await dialog.alert(t("booking.cancel"), error.message); return; }
      if (Array.isArray(data) && data.length > 0) { setCanceling(false); router.replace("/(tabs)/bookings"); return; }
      const { data: verify, error: verifyErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", idToUse as any)
        .maybeSingle();
      setCanceling(false);
      if (verifyErr) { await dialog.alert(t("booking.cancel"), verifyErr.message); return; }
      if (verify?.id) {
        await dialog.alert(t("booking.cancel"), t("booking.cancelFailed") || `Unable to delete booking ${String(idToUse)}.`);
        return;
      }
      router.replace("/(tabs)/bookings");
    } catch (e: any) {
      setCanceling(false);
      await dialog.alert(t("booking.cancel"), e?.message || String(e));
    }
  };

  const handleContact = async () => {
    if (!hostPhone) {
      await dialog.alert(t("booking.contact"), "Host phone is not available.");
      return;
    }
    const url = `tel:${hostPhone}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      await dialog.alert(t("booking.contact"), "Unable to open phone dialer.");
      return;
    }
    await Linking.openURL(url);
  };

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
        <Pressable style={styles.headerBtn} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("booking.manageTitle")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <Text style={styles.heroName}>{microservice ?? "-"}</Text>
        <View style={styles.heroPills}>
          {destination ? (
            <View style={styles.pill}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.pillText} numberOfLines={1}>{destination}</Text>
            </View>
          ) : null}
          {timeslot ? (
            <View style={styles.pill}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.pillText}>{timeslot}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Timeline */}
        <View style={styles.timeline}>
          {steps.map((step, i) => (
            <View key={i}>
              <View style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: step.bg }]}>
                    <MaterialCommunityIcons name={step.icon as any} size={17} color={step.color} />
                  </View>
                  {!step.isLast && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.divider }]} />
                  )}
                </View>
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

      {/* Fixed action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        {isExpired ? (
          <Pressable
            style={[styles.btn, styles.btnReview, hasReview && styles.btnDisabled]}
            onPress={() => {
              if (!bookingId || !serviceId) return;
              router.push({
                pathname: "/LeaveReview",
                params: { bookingId, serviceId, microservice, destination, timeslot },
              });
            }}
            disabled={hasReview}
          >
            <Text style={styles.btnText}>
              {hasReview ? t("review.alreadySubmitted") : t("review.leave")}
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={[styles.btn, styles.btnFilled]} onPress={handleContact}>
              <Text style={styles.btnText}>{t("booking.contact")}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnDanger, canceling && styles.btnDisabled]}
              onPress={handleCancel}
              disabled={canceling}
            >
              <Text style={styles.btnTextDanger}>{t("booking.cancel")}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
