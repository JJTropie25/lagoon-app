import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme-context";

export default function TabsLayout() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  return (
    <Tabs
      key={language}
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
        tabBarLabelStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="guest"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "home-variant" : "home-outline"}
              size={Math.max(22, size)}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("tabs.favourites"),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "star" : "star-outline"}
              size={Math.max(22, size)}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t("tabs.bookings"),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "briefcase" : "briefcase-outline"}
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ unmountOnBlur: true } as any),
          tabBarIcon: ({ size, focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "account-circle" : "account-circle-outline"}
              size={Math.max(22, size)}
              color={color}
            />
          ),
        }}
      />

    </Tabs>
  );
}
