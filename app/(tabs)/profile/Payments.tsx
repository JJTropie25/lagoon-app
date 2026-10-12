import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { useAuthState } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

type PaymentEntry = {
  id: string;
  service_title: string;
  slot_start: string;
  amount_cents: number | null;
  currency: string | null;
  payment_status: string | null;
  people_count: number;
  created_at: string;
};

function statusColor(s: string | null): string {
  if (s === "succeeded" || s === "paid") return "#2E7D32";
  if (s === "refunded")                  return "#1A4F8A";
  if (s === "canceled" || s === "failed") return "#C62828";
  return "#888";
}

function statusLabel(s: string | null): string {
  if (!s || s === "pending")  return "Pending";
  if (s === "succeeded")      return "Paid";
  if (s === "paid")           return "Paid";
  if (s === "refunded")       return "Refunded";
  if (s === "canceled")       return "Canceled";
  if (s === "failed")         return "Failed";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function amountLabel(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const c = (currency ?? "eur").toUpperCase();
  const symbol = c === "EUR" ? "€" : c === "USD" ? "$" : c + " ";
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
    },

    // summary card
    summaryCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      borderRadius: 16,
      backgroundColor: "#4F9B9B",
      padding: 20,
      gap: 4,
    },
    summaryLabel: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
    summaryAmount: {
      fontSize: 32,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
    },
    summaryCount: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },

    // stripe badge
    stripeBadge: {
      marginHorizontal: 16,
      marginBottom: 20,
      borderRadius: 12,
      backgroundColor: c.cardBackground,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    stripeBadgeText: { flex: 1, fontSize: 12, color: c.textSecondary, lineHeight: 17 },
    stripeBadgeLabel: { fontWeight: "700", color: c.textPrimary },

    // section title
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textMuted,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginHorizontal: 16,
      marginBottom: 8,
    },

    // list
    list: {
      marginHorizontal: 16,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: c.cardBackground,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: "#4F9B9B18",
      alignItems: "center",
      justifyContent: "center",
    },
    rowContent: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
    rowSub: { fontSize: 12, color: c.textSecondary },
    rowRight: { alignItems: "flex-end", gap: 4 },
    rowAmount: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
    statusPill: {
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    statusText: { fontSize: 10, fontWeight: "700" },
    separator: { height: 1, backgroundColor: c.divider, marginLeft: 64 },

    // empty
    emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyIcon: { opacity: 0.2 },
    emptyText: { fontSize: 15, color: c.textSecondary, fontWeight: "600" },
    emptySubtext: { fontSize: 13, color: c.textMuted, textAlign: "center", paddingHorizontal: 40 },
  });
}

export default function PaymentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuthState();

  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (!supabase || !user?.id) { setEntries([]); setLoading(false); return; }
      setLoading(true);
      supabase
        .from("bookings")
        .select("id, slot_start, amount_cents, currency, payment_status, people_count, created_at, services(title)")
        .eq("guest_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (!mounted) return;
          setEntries(
            (data ?? []).map((r: any) => ({
              id: r.id,
              service_title: r.services?.title ?? "Service",
              slot_start: r.slot_start,
              amount_cents: r.amount_cents,
              currency: r.currency,
              payment_status: r.payment_status,
              people_count: r.people_count,
              created_at: r.created_at,
            }))
          );
          setLoading(false);
        }, () => { if (mounted) setLoading(false); });
      return () => { mounted = false; };
    }, [user?.id])
  );

  const totalCents = useMemo(
    () => entries.filter(e => e.payment_status === "succeeded" || e.payment_status === "paid")
                 .reduce((s, e) => s + (e.amount_cents ?? 0), 0),
    [entries]
  );
  const paidCount = entries.filter(e => e.payment_status === "succeeded" || e.payment_status === "paid").length;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        {!loading && entries.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total spent</Text>
            <Text style={styles.summaryAmount}>{amountLabel(totalCents, "eur")}</Text>
            <Text style={styles.summaryCount}>{paidCount} completed payment{paidCount !== 1 ? "s" : ""}</Text>
          </View>
        )}

        {/* Stripe badge */}
        <View style={styles.stripeBadge}>
          <MaterialCommunityIcons name="shield-check-outline" size={22} color="#635BFF" />
          <Text style={styles.stripeBadgeText}>
            <Text style={styles.stripeBadgeLabel}>Secured by Stripe. </Text>
            {"Your card details are never stored on our servers. All transactions are encrypted end-to-end."}
          </Text>
        </View>

        {/* Transaction list */}
        {loading ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="credit-card-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>Loading…</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="receipt-text-outline" size={52} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No payments yet</Text>
            <Text style={styles.emptySubtext}>Your booking payments will appear here after your first reservation.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Transaction history</Text>
            <View style={styles.list}>
              {entries.map((entry, index) => {
                const sc = statusColor(entry.payment_status);
                return (
                  <View key={entry.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <View style={styles.row}>
                      <View style={styles.rowIcon}>
                        <MaterialCommunityIcons name="credit-card-outline" size={18} color="#4F9B9B" />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{entry.service_title}</Text>
                        <Text style={styles.rowSub}>{formatDate(entry.slot_start)}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowAmount}>{amountLabel(entry.amount_cents, entry.currency)}</Text>
                        <View style={[styles.statusPill, { backgroundColor: sc + "18" }]}>
                          <Text style={[styles.statusText, { color: sc }]}>
                            {statusLabel(entry.payment_status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
