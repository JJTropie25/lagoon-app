import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useAuthState } from "../lib/auth";
import { registerForPushNotifications } from "../lib/notifications";

export default function NotificationsProvider() {
  const { user } = useAuthState();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    registerForPushNotifications(user?.id).catch(() => null);
  }, [user?.id]);

  return null;
}
