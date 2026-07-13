import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme-context";

export default function HostTabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        detachInactiveScreens: true,
        sceneStyle: { backgroundColor: colors.screenBackground },
        tabBarStyle: {
          backgroundColor: colors.screenBackground,
          borderTopColor: colors.divider,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.warmAccent,
        tabBarInactiveTintColor: colors.textPrimary,
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="listings"
        options={{
          title: t("host.tabs.listings"),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "view-grid" : "view-grid-outline"}
              size={Math.max(22, size)}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: t("host.tabs.reservations"),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "calendar-check" : "calendar-check-outline"}
              size={Math.max(22, size)}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "account-circle" : "account-circle-outline"}
              size={Math.max(22, size)}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="edit-listing"    options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="new-listing"     options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="reservation/[bookingId]" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="check-in-confirmed" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="scan-qr"         options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="payments"            options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="terms"               options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="help"                options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="language-settings"   options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="edit-profile"        options={{ href: null, tabBarStyle: { display: "none" } }} />
    </Tabs>
  );
}
