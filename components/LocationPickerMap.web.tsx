import { useEffect, useRef, useState } from "react";

import { StyleSheet, View } from "react-native";

// Leaflet is loaded from a CDN at runtime (window.L); no type package is installed.
declare namespace L {
  type Map = any;
  type Marker = any;
}

type Props = {
  latitude: number;
  longitude: number;
  onPick: (coords: { latitude: number; longitude: number }) => void;
};

export default function LocationPickerMap({ latitude, longitude, onPick }: Props) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).L) {
      setReady(true);
      return;
    }

    const existingScript = document.getElementById("leaflet-js");
    const existingCss = document.getElementById("leaflet-css");

    if (!existingCss) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setReady(true);
      document.body.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setReady(true));
    }
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([latitude, longitude], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("move", () => {
      const center = map.getCenter();
      onPickRef.current({ latitude: center.lat, longitude: center.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
  }, [latitude, longitude]);

  return (
    <View style={styles.container}>
      <View ref={containerRef as any} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.crosshairWrap]}>
        <View style={styles.crosshair}>
          <View style={styles.crossV} />
          <View style={styles.crossH} />
          <View style={styles.crossDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  crosshairWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  crosshair: { width: 40, height: 40 },
  crossV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 19,
    width: 2,
    backgroundColor: "rgba(20,20,20,0.82)",
    borderRadius: 1,
  },
  crossH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 19,
    height: 2,
    backgroundColor: "rgba(20,20,20,0.82)",
    borderRadius: 1,
  },
  crossDot: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(20,20,20,0.92)",
  },
});
