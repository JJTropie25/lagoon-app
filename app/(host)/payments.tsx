import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { useAuthState } from "../../lib/auth";
import { useAppDialog } from "../../components/AppDialogProvider";
import { supabase } from "../../lib/supabase";
import { createAccountLink, createConnectedAccount, getStripeReturnUrl } from "../../lib/stripe";

WebBrowser.maybeCompleteAuthSession();

type HistoryEntry = {
  id: string;
  serviceTitle: string;
  slotStart: string;
  peopleCount: number;
  amount: number;
  status: string;
};

const HEADER_COLOR = "#4F9B9B";
const GREEN = "#2A7A3A";
const GREEN_BG = "#EBF5EC";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    header: {
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 12, paddingVertical: 8, gap: 8,
      backgroundColor: HEADER_COLOR,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
      flex: 1, fontSize: 15, fontWeight: "700",
      fontFamily: "Baloo2_700Bold", color: "#fff",
    },

    scroll: { paddingHorizontal: 16 },

    statusCard: {
      borderRadius: 16, padding: 20, marginBottom: 16,
      flexDirection: "row", alignItems: "center", gap: 14,
    },
    statusIconWrap: {
      width: 48, height: 48, borderRadius: 24,
      alignItems: "center", justifyContent: "center",
    },
    statusTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Baloo2_700Bold", marginBottom: 4 },
    statusBody: { fontSize: 13, lineHeight: 18 },

    infoCard: {
      backgroundColor: c.surfaceSoft, borderRadius: 14,
      padding: 16, marginBottom: 16, gap: 10,
    },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    infoText: { flex: 1, fontSize: 13, color: c.textSecondary, lineHeight: 19 },

    activateBtn: {
      backgroundColor: HEADER_COLOR, borderRadius: 14,
      paddingVertical: 16, alignItems: "center", justifyContent: "center",
      marginBottom: 12,
      shadowColor: HEADER_COLOR, shadowOpacity: 0.28,
      shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    activateBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Baloo2_700Bold" },
    btnDisabled: { opacity: 0.5 },

    divider: { height: 1, backgroundColor: c.divider, marginBottom: 16 },
    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: c.textMuted,
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
    },
    detailRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 10,
    },
    detailLabel: { fontSize: 14, color: c.textSecondary, fontWeight: "500" },
    detailValue: { fontSize: 14, fontWeight: "700" },

    historyRow: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 12, gap: 12,
    },
    historyIconWrap: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surfaceSoft,
      alignItems: "center", justifyContent: "center",
    },
    historyMeta: { flex: 1 },
    historyTitle: { fontSize: 14, fontWeight: "600", color: c.textPrimary, marginBottom: 2 },
    historyDate: { fontSize: 12, color: c.textMuted },
    historyRight: { alignItems: "flex-end" },
    historyAmount: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
    historyStatus: { fontSize: 11, marginTop: 2 },
    emptyHistory: { fontSize: 14, color: c.textMuted, textAlign: "center", paddingVertical: 20 },
  });
}

export default function HostPayments() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useAppDialog();
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [hostStatus, setHostStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [bookingHistory, setBookingHistory] = useState<HistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (!supabase || !user) { setLoading(false); return () => { mounted = false; }; }

      supabase
        .from("hosts")
        .select("id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled")
        .eq("guest_id", user.id)
        .maybeSingle()
        .then(async ({ data: host }) => {
          if (!mounted) return;
          setHostStatus(host ?? null);
          setLoading(false);

          if (!host) return;
          const { data: services } = await supabase!
            .from("services")
            .select("id, title, price_eur")
            .eq("host_id", host.id);
          if (!mounted || !services || services.length === 0) return;

          const serviceMap = new Map(services.map((s: any) => [s.id, s]));
          const serviceIds = services.map((s: any) => s.id);
          const { data: bkgs } = await supabase!
            .from("bookings")
            .select("id, service_id, slot_start, people_count, status, created_at")
            .in("service_id", serviceIds)
            .order("slot_start", { ascending: false });
          if (!mounted) return;

          const entries: HistoryEntry[] = (bkgs ?? []).map((b: any) => {
            const svc = serviceMap.get(b.service_id);
            return {
              id: b.id,
              serviceTitle: svc?.title ?? "Service",
              slotStart: b.slot_start,
              peopleCount: b.people_count ?? 1,
              amount: (svc?.price_eur ?? 0) * (b.people_count ?? 1),
              status: b.status,
            };
          });
          setBookingHistory(entries);
        });

      return () => { mounted = false; };
    }, [user])
  );

  const isActive = hostStatus?.stripe_onboarding_complete;
  const hasAccount = Boolean(hostStatus?.stripe_account_id);
  const headerH = insets.top + 52;

  const handleActivate = async () => {
    if (!user || !supabase) return;
    setActivating(true);

    if (!hasAccount) {
      const created = await createConnectedAccount();
      if (created.error) {
        setActivating(false);
        await dialog.alert("Payments", created.error);
        return;
      }
      const { data: refreshed } = await supabase
        .from("hosts")
        .select("id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled")
        .eq("guest_id", user.id)
        .maybeSingle();
      if (refreshed) setHostStatus(refreshed);
    }

    const returnUrl = getStripeReturnUrl("/host-onboarding");
    const refreshUrl = getStripeReturnUrl("/host-onboarding");
    if (!returnUrl || !refreshUrl) {
      setActivating(false);
      await dialog.alert("Payments", "Missing Supabase URL.");
      return;
    }
    const link = await createAccountLink(returnUrl, refreshUrl);
    setActivating(false);
    if (link.error || !link.url) {
      await dialog.alert("Payments", link.error ?? "Could not start onboarding.");
      return;
    }
    await WebBrowser.openBrowserAsync(link.url);
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

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.replace("/(host)/profile")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 20, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status card */}
        {!loading && (
          <View style={[
            styles.statusCard,
            { backgroundColor: isActive ? GREEN_BG : colors.surfaceSoft },
          ]}>
            <View style={[styles.statusIconWrap, { backgroundColor: isActive ? GREEN_BG : colors.surface }]}>
              <MaterialCommunityIcons
                name={isActive ? "check-circle" : "bank-outline"}
                size={26}
                color={isActive ? GREEN : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: isActive ? GREEN : colors.textPrimary }]}>
                {isActive ? "Payments active" : "Payments not set up"}
              </Text>
              <Text style={[styles.statusBody, { color: isActive ? GREEN : colors.textSecondary }]}>
                {isActive
                  ? "You can receive payments from guests. Payouts go to your connected bank account."
                  : "Complete the Stripe onboarding to start receiving payments from bookings."}
              </Text>
            </View>
          </View>
        )}

        {/* Account details */}
        {!loading && hostStatus && (
          <>
            <Text style={styles.sectionLabel}>Account details</Text>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Stripe account</Text>
              <Text style={[styles.detailValue, { color: hasAccount ? colors.textPrimary : colors.textMuted }]}>
                {hasAccount ? "Connected" : "Not connected"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Charges</Text>
              <Text style={[styles.detailValue, { color: hostStatus.stripe_charges_enabled ? GREEN : colors.textMuted }]}>
                {hostStatus.stripe_charges_enabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payouts</Text>
              <Text style={[styles.detailValue, { color: hostStatus.stripe_payouts_enabled ? GREEN : colors.textMuted }]}>
                {hostStatus.stripe_payouts_enabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <View style={[styles.divider, { marginTop: 8 }]} />
          </>
        )}

        {/* Info box */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>
              Payments are processed via Stripe Connect. Lagoon never stores your banking details.
              Payouts are sent to your bank account after each successful booking, minus the platform fee.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>
              Your payout schedule and banking details are managed directly on the Stripe dashboard.
              The setup takes about 5 minutes.
            </Text>
          </View>
        </View>

        {/* Activate button */}
        {!isActive && !loading && (
          <Pressable
            style={[styles.activateBtn, activating && styles.btnDisabled]}
            onPress={handleActivate}
            disabled={activating}
          >
            <Text style={styles.activateBtnText}>
              {activating ? "Opening Stripe…" : hasAccount ? "Continue Setup" : "Activate payments"}
            </Text>
          </Pressable>
        )}

        {/* Payment history */}
        {!loading && (
          <>
            <View style={{ marginTop: 8 }} />
            <Text style={styles.sectionLabel}>Payment history</Text>
            <View style={styles.divider} />
            {bookingHistory.length === 0 ? (
              <Text style={styles.emptyHistory}>No bookings yet</Text>
            ) : (
              bookingHistory.map((entry, idx) => {
                const date = new Date(entry.slotStart);
                const dateStr = date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
                const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
                const isCancelled = entry.status === "cancelled_by_guest" || entry.status === "cancelled_by_host";
                const statusColor = isCancelled ? colors.textMuted : entry.status === "confirmed" ? GREEN : colors.textSecondary;
                return (
                  <View key={entry.id}>
                    <View style={styles.historyRow}>
                      <View style={styles.historyIconWrap}>
                        <MaterialCommunityIcons
                          name={isCancelled ? "calendar-remove-outline" : "calendar-check-outline"}
                          size={20}
                          color={isCancelled ? colors.textMuted : HEADER_COLOR}
                        />
                      </View>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyTitle} numberOfLines={1}>{entry.serviceTitle}</Text>
                        <Text style={styles.historyDate}>{dateStr} · {timeStr} · {entry.peopleCount} {entry.peopleCount === 1 ? "person" : "people"}</Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={[styles.historyAmount, isCancelled && { color: colors.textMuted, textDecorationLine: "line-through" }]}>
                          €{entry.amount.toFixed(2)}
                        </Text>
                        <Text style={[styles.historyStatus, { color: statusColor }]}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    {idx < bookingHistory.length - 1 && <View style={[styles.divider, { marginBottom: 0 }]} />}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
