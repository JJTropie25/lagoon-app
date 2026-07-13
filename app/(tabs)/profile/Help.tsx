import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";

const SUPPORT_EMAIL = "lagoon.project.admin@gmail.com";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does booking work?",
    a: "Browse services near you on the map or in the list. Tap a service to see details, available time slots and pricing. Select your slot, choose the number of guests, and confirm your booking. You'll receive a confirmation in the Bookings tab.",
  },
  {
    q: "Can I cancel or modify a booking?",
    a: "You can cancel a booking from the Bookings tab → Manage. Cancellations made within the service's cancellation window are fully refunded. Outside that window, the host's cancellation policy applies. You cannot modify a booking once confirmed — cancel and rebook if needed.",
  },
  {
    q: "How do I pay?",
    a: "Payments are processed securely via Stripe at the time of booking. We accept major credit and debit cards. Your card details are never stored on our servers.",
  },
  {
    q: "How do I check in?",
    a: "When you arrive, show the booking confirmation in the Bookings tab to the host. Hosts can also scan the QR code on your confirmation screen to check you in directly.",
  },
  {
    q: "I'm a host — how do I list a service?",
    a: "Go to Profile → Switch to Host mode. Once in Host mode, tap the + button in the Listings tab to create a service. You can add photos, description, pricing, available slots, and cancellation policy.",
  },
  {
    q: "How do I receive payments as a host?",
    a: "Hosts are paid via Stripe Connect. Go to Profile → Switch to Host mode → Payments to complete the Stripe onboarding. Payouts are sent to your bank account after each successful booking.",
  },
  {
    q: "What happens if a guest doesn't show up?",
    a: "If a guest doesn't check in within a reasonable time after the slot starts, you can mark the booking as a no-show from the Reservations tab. The platform's no-show policy will apply.",
  },
  {
    q: "How are reviews handled?",
    a: "Guests can leave a review after a booking expires. Reviews are public and help other users choose services. Hosts cannot delete reviews, but can contact support if a review violates our guidelines.",
  },
  {
    q: "Is my personal data safe?",
    a: "Yes. We comply with GDPR. We collect only the data needed to provide the service. You can request access, correction, or deletion of your data at any time — see Terms & Conditions for details, or email us at " + SUPPORT_EMAIL + ".",
  },
  {
    q: "I found a bug or have a suggestion",
    a: "We'd love to hear from you. Send us an email at " + SUPPORT_EMAIL + " with as much detail as possible. Screenshots are very helpful.",
  },
];

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
    intro: {
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 20,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    faqItem: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      backgroundColor: c.cardBackground,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 3,
      overflow: "hidden",
    },
    question: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    questionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: c.textPrimary,
      lineHeight: 20,
    },
    answer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      fontSize: 14,
      color: c.textSecondary,
      lineHeight: 21,
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginHorizontal: 16,
    },
    contactCard: {
      margin: 16,
      marginTop: 8,
      borderRadius: 16,
      backgroundColor: c.warmSurface,
      padding: 20,
      gap: 6,
    },
    contactTitle: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.warmAccentDark,
    },
    contactBody: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
    },
    contactLink: {
      fontSize: 13,
      color: c.warmAccentDark,
      fontWeight: "700",
      marginTop: 4,
    },
  });
}

export default function Help() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Help & FAQ</Text>
        </View>

        <Text style={styles.intro}>
          Find answers to the most common questions below. Can't find what you're looking for? Write to us directly.
        </Text>

        {/* FAQ accordion */}
        {FAQS.map((item, i) => (
          <View key={i} style={styles.faqItem}>
            <Pressable
              style={styles.question}
              onPress={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <Text style={styles.questionText}>{item.q}</Text>
              <MaterialCommunityIcons
                name={openIndex === i ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
            {openIndex === i && (
              <>
                <View style={styles.divider} />
                <Text style={styles.answer}>{item.a}</Text>
              </>
            )}
          </View>
        ))}

        {/* Contact card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactBody}>
            Our support team is available Monday–Friday, 9:00–18:00 CET. We aim to reply within one business day.
          </Text>
          <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            <Text style={styles.contactLink}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
