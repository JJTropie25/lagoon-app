import { useEffect, useMemo, useState } from "react";
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
import { useAuthState } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { useAppDialog } from "../../../components/AppDialogProvider";
import { createPaymentIntent } from "../../../lib/stripe";
import { useStripeClient } from "../../../lib/useStripeClient";

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};
const DEFAULT_HEADER_COLOR = "#4F9B9B";

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

    content: { paddingHorizontal: 16, paddingBottom: 32 },

    // Service summary card
    serviceImage: {
      width: "100%", height: 160,
      borderRadius: 14,
      backgroundColor: c.surfaceSoft,
      marginBottom: 14,
    },
    summaryCard: {
      backgroundColor: c.listBackground,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    serviceName: {
      fontSize: 20, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: "row", alignItems: "center",
      gap: 8, marginBottom: 8,
    },
    infoText: { color: c.textSecondary, fontSize: 14, flex: 1 },

    // Price card
    priceCard: {
      backgroundColor: c.warmSurface,
      borderRadius: 18,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    priceLabel: { fontSize: 14, fontWeight: "600", color: c.warmAccentDark },
    priceBreakdown: { fontSize: 12, color: c.warmAccentDark, opacity: 0.7, marginTop: 2 },
    priceValue: {
      fontSize: 30, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.warmAccent,
    },

    // Method section
    sectionLabel: {
      fontSize: 16, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 12,
    },
    methodRow: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: c.listBackground,
      marginBottom: 10,
      gap: 12,
      borderWidth: 1.5,
      borderColor: "transparent",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    methodRowSelected: {
      backgroundColor: c.warmSurface,
      borderColor: c.warmAccent,
    },
    methodText: { flex: 1 },
    methodLabel: { fontWeight: "600", color: c.textPrimary, fontSize: 14 },
    methodHint: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    radio: {
      width: 20, height: 20, borderRadius: 10,
      borderWidth: 2, borderColor: c.border,
      alignItems: "center", justifyContent: "center",
    },
    radioSelected: { borderColor: c.warmAccent },
    radioDot: {
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: c.warmAccent,
    },

    bookBar: {
      paddingHorizontal: 16, paddingTop: 12,
      backgroundColor: c.screenBackground,
      borderTopWidth: 1, borderTopColor: c.divider,
    },
    payButton: {
      padding: 16, backgroundColor: c.warmAccent,
      borderRadius: 14, alignItems: "center",
      shadowColor: c.warmAccent,
      shadowOpacity: 0.30,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    payButtonDisabled: {
      backgroundColor: c.warmAccentSoft,
      shadowOpacity: 0,
      elevation: 0,
    },
    payButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  });
}

export default function Payment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuthState();
  const dialog = useAppDialog();
  const stripe = useStripeClient();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    serviceId,
    slotsParam,
    destination,
    people,
    microservice,
    category,
  } = useLocalSearchParams<{
    serviceId?: string;
    slotsParam?: string;
    destination?: string;
    people?: string;
    microservice?: string;
    category?: string;
  }>();

  const parsedSlots = useMemo(() => {
    if (!slotsParam) return [];
    return slotsParam.split(',').map(key => {
      const sepIdx = key.indexOf('__');
      const dateKey = key.slice(0, sepIdx);
      const hour = key.slice(sepIdx + 2);
      const [hh, mm] = hour.split(':').map(Number);
      const d = new Date(dateKey);
      d.setHours(hh, mm, 0, 0);
      return {
        start: d.toISOString(),
        end: new Date(d.getTime() + 30 * 60 * 1000).toISOString(),
        hour,
      };
    });
  }, [slotsParam]);

  const headerColor = (category && CATEGORY_COLORS[category]) ?? DEFAULT_HEADER_COLOR;

  const [method, setMethod] = useState<"card" | "cash">("cash");
  const [processing, setProcessing] = useState(false);
  const [priceEur, setPriceEur] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [serviceImageUrl, setServiceImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!supabase || !serviceId) return;
    setLoadingPrice(true);
    const sb = supabase;
    (async () => {
      try {
        const { data } = await sb
          .from("services")
          .select("price_eur, image_url")
          .eq("id", serviceId)
          .maybeSingle();
        if (!mounted) return;
        setPriceEur(Number(data?.price_eur ?? 0));
        if (data?.image_url) {
          const raw: string = data.image_url;
          if (raw.startsWith("[")) {
            try { setServiceImageUrl(JSON.parse(raw)[0] ?? null); } catch { setServiceImageUrl(raw); }
          } else {
            setServiceImageUrl(raw);
          }
        }
      } finally {
        if (mounted) setLoadingPrice(false);
      }
    })();
    return () => { mounted = false; };
  }, [serviceId]);

  const handlePay = async () => {
    if (!supabase) {
      await dialog.alert(t("payment.title"), t("payment.supabaseMissing"));
      return;
    }
    if (!user) { router.replace("/(auth)/sign-in"); return; }
    if (!serviceId || parsedSlots.length === 0) {
      await dialog.alert(t("payment.title"), t("payment.invalidData"));
      return;
    }

    setProcessing(true);
    const peopleCount = Number(people ?? 1) || 1;
    const slotCount = parsedSlots.length;
    let paymentIntentId: string | null = null;
    let amountCentsPerSlot: number | null = null;
    let platformFeeCentsPerSlot: number | null = null;

    if (method === "card") {
      if (!stripe) {
        setProcessing(false);
        await dialog.alert(t("payment.title"), t("payment.cardNotAvailableWeb"));
        return;
      }
      const paymentIntent = await createPaymentIntent({
        service_id: serviceId,
        slot_start: parsedSlots[0].start,
        slot_end: parsedSlots[0].end,
        people_count: peopleCount * slotCount,
        currency: "eur",
      });
      if (!paymentIntent.client_secret || !paymentIntent.payment_intent_id) {
        setProcessing(false);
        await dialog.alert(t("payment.title"), paymentIntent.error ?? "Payment setup failed.");
        return;
      }
      const init = await stripe.initPaymentSheet({
        paymentIntentClientSecret: paymentIntent.client_secret,
        merchantDisplayName: "Lagoon",
        allowsDelayedPaymentMethods: true,
      });
      if (init.error) {
        setProcessing(false);
        await dialog.alert(t("payment.title"), init.error.message);
        return;
      }
      const present = await stripe.presentPaymentSheet();
      if (present.error) {
        setProcessing(false);
        await dialog.alert(t("payment.title"), present.error.message);
        return;
      }
      paymentIntentId = paymentIntent.payment_intent_id ?? null;
      amountCentsPerSlot = paymentIntent.amount_cents != null
        ? Math.round(paymentIntent.amount_cents / slotCount)
        : null;
      platformFeeCentsPerSlot = paymentIntent.platform_fee_cents != null
        ? Math.round(paymentIntent.platform_fee_cents / slotCount)
        : null;
    }

    let firstBookingId: string | null = null;
    let firstQrToken: string | null = null;

    for (let i = 0; i < parsedSlots.length; i++) {
      const slot = parsedSlots[i];
      const slotQrToken = `BK-${Date.now() + i}-${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          guest_id: user.id,
          service_id: serviceId,
          slot_start: slot.start,
          slot_end: slot.end,
          people_count: peopleCount,
          qr_token: slotQrToken,
          payment_intent_id: paymentIntentId,
          payment_status: method === "card" ? "paid" : "cash",
          amount_cents: amountCentsPerSlot ?? (priceEur != null ? Math.round(priceEur * 100) : null),
          platform_fee_cents: platformFeeCentsPerSlot,
          currency: "eur",
        })
        .select("id")
        .single();

      if (error) {
        setProcessing(false);
        await dialog.alert(t("payment.title"), error.message);
        return;
      }
      if (data && !firstBookingId) {
        firstBookingId = data.id;
        firstQrToken = slotQrToken;
      }
    }

    setProcessing(false);
    const slotTimesStr = parsedSlots.map(s => s.hour).join(', ');
    router.replace({
      pathname: "/(tabs)/guest/BookingConfirmation",
      params: {
        bookingId: firstBookingId,
        qrToken: firstQrToken,
        destination,
        timeslot: slotTimesStr,
        people,
        microservice,
        selectedHour: slotTimesStr,
      },
    });
  };

  const slotCount = parsedSlots.length;
  const totalPriceEur = priceEur != null ? priceEur * (slotCount || 1) : null;
  const displayTime = parsedSlots.length > 0 ? parsedSlots.map(s => s.hour).join(', ') : "-";
  const displayPeople = people ?? "1";

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: headerColor }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/guest")}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("payment.title")}</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 64 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Service image */}
        {serviceImageUrl ? (
          <Image source={{ uri: serviceImageUrl }} style={styles.serviceImage} resizeMode="cover" />
        ) : null}

        {/* Service summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.serviceName}>{microservice ?? "-"}</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{destination ?? "-"}</Text>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{displayTime}</Text>
          </View>
        </View>
        {/* Price card */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>Totale</Text>
            {slotCount > 1 && !loadingPrice && (
              <Text style={styles.priceBreakdown}>
                {`${slotCount} slot × €${(priceEur ?? 0).toFixed(2)}`}
              </Text>
            )}
          </View>
          <Text style={styles.priceValue}>
            {loadingPrice ? "…" : `€${(totalPriceEur ?? 0).toFixed(2)}`}
          </Text>
        </View>

        {/* Payment method */}
        <View>
          <Text style={styles.sectionLabel}>{t("payment.chooseMethod")}</Text>

          <TouchableOpacity
            style={[styles.methodRow, method === "card" && styles.methodRowSelected]}
            onPress={() => setMethod("card")}
          >
            <MaterialCommunityIcons
              name="credit-card-outline"
              size={22}
              color={method === "card" ? colors.warmAccent : colors.textSecondary}
            />
            <View style={styles.methodText}>
              <Text style={styles.methodLabel}>{t("payment.methodCard")}</Text>
              <Text style={styles.methodHint}>{t("payment.availableNow")}</Text>
            </View>
            <View style={[styles.radio, method === "card" && styles.radioSelected]}>
              {method === "card" && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodRow, method === "cash" && styles.methodRowSelected]}
            onPress={() => setMethod("cash")}
          >
            <MaterialCommunityIcons
              name="cash"
              size={22}
              color={method === "cash" ? colors.warmAccent : colors.textSecondary}
            />
            <View style={styles.methodText}>
              <Text style={styles.methodLabel}>{t("payment.methodCash")}</Text>
              <Text style={styles.methodHint}>{t("payment.availableNow")}</Text>
            </View>
            <View style={[styles.radio, method === "cash" && styles.radioSelected]}>
              {method === "cash" && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>


      {/* Fixed pay button */}
      <View style={[styles.bookBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={processing}
        >
          <Text style={styles.payButtonText}>
            {processing ? t("payment.processing") : t("payment.payNow")}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
