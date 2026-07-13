import { useMemo } from "react";
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

const EFFECTIVE_DATE = "1 July 2025";
const COMPANY_NAME = "Lagoon S.r.l.";
const COMPANY_EMAIL = "lagoon.project.admin@gmail.com";
const COMPANY_ADDRESS = "Calle della Misericordia 2456, 30121 Venezia, Italia";

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
    effective: {
      fontSize: 12,
      color: c.textMuted,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    section: {
      paddingHorizontal: 16,
      marginBottom: 22,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 8,
    },
    body: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
    },
    bullet: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
      paddingLeft: 12,
    },
    link: {
      color: c.accent,
      textDecorationLine: "underline",
    },
    divider: {
      height: 1,
      backgroundColor: c.divider,
      marginHorizontal: 16,
      marginBottom: 22,
    },
  });
}

export default function TermsAndConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/profile");
  };
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
        </View>
        <Text style={styles.effective}>Effective date: {EFFECTIVE_DATE}</Text>

        {/* 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Who We Are</Text>
          <Text style={styles.body}>
            Lagoon is a platform operated by {COMPANY_NAME} ("{COMPANY_ADDRESS}"). The platform connects guests seeking leisure and beach-side services with independent hosts who offer them ("Services"). By accessing or using the Lagoon mobile application ("App"), you agree to these Terms & Conditions ("Terms").
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility and Accounts</Text>
          <Text style={styles.body}>
            You must be at least 18 years old to create an account. You are responsible for keeping your login credentials confidential and for all activity under your account. Lagoon reserves the right to suspend or terminate accounts that violate these Terms.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Booking and Payments</Text>
          <Text style={styles.body}>
            When you book a Service, you enter into a contract directly with the host. Lagoon acts as an intermediary platform and payment facilitator only. Payments are processed by Stripe, Inc. in accordance with their Terms of Service. Lagoon charges a service fee on each transaction, visible at checkout before confirmation.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Cancellation and Refunds</Text>
          <Text style={styles.body}>
            Each service listing displays its own cancellation policy set by the host. Cancellations within the permitted window are refunded in full within 5–10 business days. Outside that window, a partial or zero refund may apply depending on the host's policy. In the event of a host cancellation, guests receive a full refund.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 5 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Host Obligations</Text>
          <Text style={styles.body}>
            Hosts warrant that their listed services are accurate, legally permitted, and delivered as described. Hosts are responsible for their own tax obligations, licenses, and compliance with local regulations. Lagoon does not employ hosts and is not liable for the quality or safety of host-provided services.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 6 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User Obligations</Text>
          <Text style={styles.body}>
            You agree not to:
          </Text>
          <Text style={styles.bullet}>{"• use the App for any unlawful purpose;"}</Text>
          <Text style={styles.bullet}>{"• post false, misleading or harmful content;"}</Text>
          <Text style={styles.bullet}>{"• attempt to circumvent the platform to pay hosts directly;"}</Text>
          <Text style={styles.bullet}>{"• reverse-engineer, scrape or misuse any part of the App."}</Text>
        </View>
        <View style={styles.divider} />

        {/* 7 — GDPR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy and Data Protection (GDPR)</Text>
          <Text style={styles.body}>
            {COMPANY_NAME} is the data controller for personal data collected through the App. We process your data on the following legal bases:
          </Text>
          <Text style={styles.bullet}>{"• Contract performance (account management, bookings, payments);"}</Text>
          <Text style={styles.bullet}>{"• Legitimate interest (service improvement, fraud prevention);"}</Text>
          <Text style={styles.bullet}>{"• Legal obligation (tax records, anti-money-laundering);"}</Text>
          <Text style={styles.bullet}>{"• Consent (marketing communications — you may withdraw at any time)."}</Text>
          <Text style={[styles.body, { marginTop: 10 }]}>
            Data we collect: name, email address, profile photo (optional), location (to show nearby services), booking history, payment tokens (stored by Stripe — we never see full card numbers). We do not sell your data.
          </Text>
          <Text style={[styles.body, { marginTop: 10 }]}>
            Third-party processors: Supabase (database and authentication), Stripe (payments), Expo (push notifications). All processors are bound by GDPR-compliant data processing agreements.
          </Text>
          <Text style={[styles.body, { marginTop: 10 }]}>
            Data transfers: our servers are located in the EU. Where processors operate outside the EU, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission.
          </Text>
          <Text style={[styles.body, { marginTop: 10 }]}>
            Retention: account data is retained for the duration of your account plus 2 years after deletion (for legal compliance). Booking and payment records are retained for 10 years (tax law).
          </Text>
          <Text style={[styles.sectionTitle, { fontSize: 13, marginTop: 12, marginBottom: 4 }]}>
            Your Rights under GDPR
          </Text>
          <Text style={styles.bullet}>{"• Right of access — request a copy of your data."}</Text>
          <Text style={styles.bullet}>{"• Right to rectification — correct inaccurate data."}</Text>
          <Text style={styles.bullet}>{"• Right to erasure — request deletion of your data ('right to be forgotten'), subject to legal retention obligations."}</Text>
          <Text style={styles.bullet}>{"• Right to restriction — limit how we process your data."}</Text>
          <Text style={styles.bullet}>{"• Right to data portability — receive your data in a machine-readable format."}</Text>
          <Text style={styles.bullet}>{"• Right to object — object to processing based on legitimate interest."}</Text>
          <Text style={[styles.body, { marginTop: 10 }]}>
            To exercise any of these rights, contact{" "}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(`mailto:${COMPANY_EMAIL}`)}
            >
              {COMPANY_EMAIL}
            </Text>
            . We will respond within 30 days. You also have the right to lodge a complaint with your national supervisory authority.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 8 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.body}>
            All trademarks, logos, and content produced by Lagoon are the exclusive property of {COMPANY_NAME}. User-generated content (reviews, photos) remains yours; by submitting it you grant Lagoon a non-exclusive, worldwide, royalty-free licence to display it within the App.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 9 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.body}>
            To the maximum extent permitted by law, Lagoon is not liable for indirect, incidental, or consequential damages arising from your use of the App or a host's service. Our total liability to you shall not exceed the amount paid by you in the 12 months preceding the claim.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 10 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to These Terms</Text>
          <Text style={styles.body}>
            We may update these Terms from time to time. We will notify you of material changes via email or an in-app notice at least 14 days before they take effect. Continued use of the App after that date constitutes acceptance of the new Terms.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 11 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Governing Law</Text>
          <Text style={styles.body}>
            These Terms are governed by the laws of Italy. Any disputes shall be subject to the exclusive jurisdiction of the courts of Venezia, Italy, unless mandatory consumer-protection laws in your country of residence provide otherwise.
          </Text>
        </View>
        <View style={styles.divider} />

        {/* 12 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact</Text>
          <Text style={styles.body}>
            For any queries regarding these Terms or your data, contact us at{" "}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(`mailto:${COMPANY_EMAIL}`)}
            >
              {COMPANY_EMAIL}
            </Text>
            .
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
