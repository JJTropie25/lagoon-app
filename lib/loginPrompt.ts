import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const KEY = "lagoon:login_prompted_v1";

export async function markLoginPrompted(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}

export function useLoginPromptState() {
  const [loading, setLoading] = useState(true);
  const [prompted, setPrompted] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY).then((v) => {
      if (!mounted) return;
      setPrompted(v === "true");
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return { loading, prompted };
}
