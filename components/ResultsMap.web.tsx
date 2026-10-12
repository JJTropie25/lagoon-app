import { useEffect, useRef, useState } from "react";

import { View, StyleSheet } from "react-native";

// Leaflet is loaded from a CDN at runtime (window.L); no type package is installed.
declare namespace L {
  type Map = any;
  type Marker = any;
}

type ResultItem = {
  title: string;
  price: string;
  location: string;
  latitude: number;
  longitude: number;
};

type ResultsMapProps = {
  results: ResultItem[];
  selectedTitle?: string | null;
  onSelect?: (title: string) => void;
};

export default function ResultsMap({
  results,
  selectedTitle,
  onSelect,
}: ResultsMapProps) {
  const [ready, setReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

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
    if (!ready) return;
    if (!containerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([results[0].latitude, results[0].longitude], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const markerIcon = new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -28],
      shadowSize: [41, 41],
    });

    results.forEach((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: markerIcon,
      }).addTo(map);
      marker.bindPopup(`${item.title} • ${item.price}`);
      marker.on("click", () => onSelect?.(item.title));
      markersRef.current[item.title] = marker;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [onSelect, ready, results]);

  useEffect(() => {
    if (!ready) return;
    if (!selectedTitle || !mapRef.current) return;
    const selected = results.find((r) => r.title === selectedTitle);
    if (!selected) return;
    mapRef.current.flyTo([selected.latitude, selected.longitude], 12, {
      duration: 0.4,
    });
    const marker = markersRef.current[selectedTitle];
    marker?.openPopup();
  }, [ready, results, selectedTitle]);

  return <View ref={containerRef as any} style={styles.map} />;
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
