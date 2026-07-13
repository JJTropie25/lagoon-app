import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme-context";
import { type ThemeColors } from "../lib/theme";
import * as Location from "expo-location";
import DirectionsMap from "../components/DirectionsMap";

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};
const DEFAULT_PILL_COLOR = "#4F9B9B";

type Params = {
  microservice?: string;
  destination?: string;
  timeslot?: string;
  people?: string;
  latitude?: string;
  longitude?: string;
  category?: string;
};

const cityCoords: Record<string, { lat: number; lon: number }> = {
  "Roma, RM": { lat: 41.9028, lon: 12.4964 },
  "Milano, MI": { lat: 45.4642, lon: 9.19 },
  "Firenze, FI": { lat: 43.7696, lon: 11.2558 },
  "Torino, TO": { lat: 45.0703, lon: 7.6869 },
  "Bologna, BO": { lat: 44.4949, lon: 11.3426 },
  "Napoli, NA": { lat: 40.8518, lon: 14.2681 },
  "Padova, PD": { lat: 45.4064, lon: 11.8768 },
  "Verona, VR": { lat: 45.4384, lon: 10.9916 },
};

type LatLng = { latitude: number; longitude: number };

async function fetchOsrmRoute(origin: LatLng, dest: LatLng): Promise<LatLng[]> {
  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}` +
    `?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": "LagoonApp/1.0" } });
  if (!res.ok) return [origin, dest];
  const payload = (await res.json()) as {
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  };
  const coords = payload.routes?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return [origin, dest];
  return coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },
    mapContainer: { flex: 1 },
    mapTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
    },
    summaryBox: {
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.28,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    summaryBack: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(0,0,0,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    summaryInfo: { flex: 1 },
    summaryTitle: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
    },
    summaryDestination: {
      fontSize: 12,
      color: "rgba(255,255,255,0.82)",
      marginTop: 1,
    },
  });
}

export default function Directions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { microservice, destination, timeslot, people, latitude, longitude, category } =
    useLocalSearchParams<Params>();

  const catColor = (category && CATEGORY_COLORS[category]) ?? DEFAULT_PILL_COLOR;
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const mapRef = useRef<any>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LatLng[]>([]);

  const destinationCoords = useMemo(() => {
    const fallback = cityCoords[destination ?? ""] ?? cityCoords["Roma, RM"];
    const lat = latitude ? Number(latitude) : fallback.lat;
    const lon = longitude ? Number(longitude) : fallback.lon;
    return { latitude: lat, longitude: lon };
  }, [destination, latitude, longitude]);

  useEffect(() => {
    let mounted = true;
    const loadOrigin = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mounted) return;
      setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    };
    loadOrigin().catch(() => null);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRoute = async () => {
      if (!origin) { setRoute([destinationCoords]); return; }
      const routeCoords = await fetchOsrmRoute(origin, destinationCoords).catch(() => [origin, destinationCoords]);
      if (!mounted) return;
      setRoute(routeCoords);
    };
    loadRoute().catch(() => null);
    return () => { mounted = false; };
  }, [origin, destinationCoords]);

  useEffect(() => {
    const points = route.length > 1 ? route : [destinationCoords];
    if (points.length === 0) return;
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 120, bottom: 120, left: 60, right: 60 },
      animated: true,
    });
  }, [route, destinationCoords]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.mapContainer}>
        <DirectionsMap
          mapRef={mapRef}
          destinationCoords={destinationCoords}
          origin={origin}
          route={route}
          microservice={microservice}
          destination={destination}
          title={t("directions.webTitle")}
          body={t("directions.webBody")}
          back={t("directions.webBack")}
          onBack={() => router.back()}
        />
        <View style={[styles.mapTop, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.summaryBox, { backgroundColor: catColor }]}>
            <TouchableOpacity style={styles.summaryBack} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle} numberOfLines={1}>{microservice ?? "-"}</Text>
              {destination ? (
                <Text style={styles.summaryDestination} numberOfLines={1}>
                  {destination}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
