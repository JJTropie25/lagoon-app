import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import { useAuthState } from "../lib/auth";
import { setCompletedOnboarding } from "../lib/onboarding";
import { acceptPolicy } from "../lib/policy";
import { registerForPushNotifications } from "../lib/notifications";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: c.screenBackground,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 90,
      paddingBottom: 140,
      gap: 14,
    },
    title: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: "600",
    },
    subtitle: {
      color: c.textPrimary,
      textAlign: "center",
      fontSize: 14,
    },
    cardBody: {
      color: c.textPrimary,
      marginBottom: 10,
      lineHeight: 20,
    },
    sectionTitle: {
      marginTop: 10,
      color: c.textPrimary,
      fontWeight: "600",
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: c.textPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: {
      backgroundColor: c.warmAccent,
      borderColor: c.warmAccent,
    },
    checkboxLabel: {
      color: c.textPrimary,
      fontWeight: "600",
    },
    footer: {
      position: "absolute",
      left: 24,
      right: 24,
      bottom: 32,
    },
    acceptButton: {
      width: "100%",
      backgroundColor: c.warmAccent,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
    },
    acceptButtonDisabled: {
      backgroundColor: c.warmAccentSoft,
    },
    acceptButtonText: {
      color: c.background,
      fontWeight: "600",
    },
  });
}

export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuthState();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPermissions = async () => {
      try {
        const locationStatus = await Location.getForegroundPermissionsAsync();
        const notificationStatus = await Notifications.getPermissionsAsync();
        if (!mounted) return;
        setLocationEnabled(locationStatus.status === "granted");
        setNotificationsEnabled(notificationStatus.status === "granted");
      } catch {
        // ignore permission fetch errors
      }
    };
    loadPermissions();
    return () => {
      mounted = false;
    };
  }, []);

  const requestLocation = async () => {
    if (locationEnabled) {
      Linking.openSettings();
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationEnabled(status === "granted");
  };

  const requestNotifications = async () => {
    if (notificationsEnabled) {
      Linking.openSettings();
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted" && user?.id) {
      await registerForPushNotifications(user.id);
    }
    setNotificationsEnabled(status === "granted");
  };

  const handleAccept = async () => {
    if (!acceptedTerms || submitting) return;
    setSubmitting(true);
    if (user?.id) {
      await acceptPolicy(user.id);
    }
    await setCompletedOnboarding();
    setSubmitting(false);
    router.replace("/(auth)/sign-in");
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>
          Please read the terms below and confirm the permissions you want to
          enable.
        </Text>

        <Text style={styles.cardBody}>
          By using Lagoon you agree to our Terms of Service and Privacy Policy.
          We collect and process the information needed to provide bookings,
          customer support, and safety features. We may use your location to
          show services nearby and guide you to your booking. Notifications help
          you stay updated on upcoming reservations and important service
          alerts.
        </Text>
        <Text style={styles.cardBody}>
          You are responsible for keeping your account secure and for any
          activity that occurs under your account. You can update your
          permissions at any time from your device settings. Continued use of
          the app means you accept the latest version of these terms.
        </Text>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAcceptedTerms((prev) => !prev)}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
            {acceptedTerms && (
              <MaterialCommunityIcons
                name="check-bold"
                size={12}
                color={colors.background}
              />
            )}
          </View>
          <Text style={styles.checkboxLabel}>I accept the terms</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Permissions</Text>
        <Pressable style={styles.checkboxRow} onPress={requestLocation}>
          <View style={[styles.checkbox, locationEnabled && styles.checkboxOn]}>
            {locationEnabled && (
              <MaterialCommunityIcons
                name="check-bold"
                size={12}
                color={colors.background}
              />
            )}
          </View>
          <Text style={styles.checkboxLabel}>Allow location access</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={requestNotifications}>
          <View
            style={[styles.checkbox, notificationsEnabled && styles.checkboxOn]}
          >
            {notificationsEnabled && (
              <MaterialCommunityIcons
                name="check-bold"
                size={12}
                color={colors.background}
              />
            )}
          </View>
          <Text style={styles.checkboxLabel}>Allow notifications</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.acceptButton,
            (!acceptedTerms || submitting) && styles.acceptButtonDisabled,
          ]}
          onPress={handleAccept}
          disabled={!acceptedTerms || submitting}
        >
          <Text style={styles.acceptButtonText}>
            {submitting ? "Loading..." : "Accept and continue"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}