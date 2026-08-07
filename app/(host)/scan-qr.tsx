import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera/build";
import { useAppDialog } from "../../components/AppDialogProvider";
import { supabase } from "../../lib/supabase";

const HEADER_COLOR = "#4F9B9B";
const CORNER_SIZE = 26;
const CORNER_THICKNESS = 3;

export default function HostScanQr() {
  const router = useRouter();
  const dialog = useAppDialog();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);
  const { bookingId, expectedToken } = useLocalSearchParams<{
    bookingId?: string;
    expectedToken?: string;
  }>();

  const FRAME_SIZE = Math.round(screenWidth * 0.68);
  const s = useMemo(() => makeStyles(FRAME_SIZE), [FRAME_SIZE]);

  const canScan = Boolean(expectedToken && expectedToken.trim().length > 0);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(host)/reservations");

  const handleScan = async ({ data }: { data: string }) => {
    if (scanLocked) return;
    setScanLocked(true);
    if (!canScan) {
      await dialog.alert("Scan QR", "Booking has no QR token.");
      setScanLocked(false);
      return;
    }
    if (data !== expectedToken) {
      await dialog.alert("Scan QR", "QR code non valido.");
      setScanLocked(false);
      return;
    }
    if (supabase && bookingId) {
      await supabase
        .from("bookings")
        .update({ checked_in_at: new Date().toISOString(), status: "checked_in" })
        .eq("id", bookingId);
    }
    router.replace({ pathname: "/(host)/check-in-confirmed", params: { bookingId, mode: "checkin" } });
  };

  return (
    <View style={s.screen}>
      {/* Camera — fills the entire screen */}
      {permission?.granted && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleScan}
        />
      )}

      {/* Viewfinder overlay (camera granted) */}
      {permission?.granted ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {/* top dark strip */}
          <View style={s.overlayStrip} />
          {/* middle row */}
          <View style={{ flexDirection: "row", height: FRAME_SIZE }}>
            <View style={s.overlaySide} />
            {/* transparent viewfinder square */}
            <View style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
            </View>
            <View style={s.overlaySide} />
          </View>
          {/* bottom dark strip with hint */}
          <View style={[s.overlayStrip, { alignItems: "center", paddingTop: 28 }]}>
            <Text style={s.hintText}>Inquadra il QR code del guest</Text>
          </View>
        </View>
      ) : (
        /* Permission not granted */
        <View style={[s.permWrap, { paddingTop: insets.top + 80 }]}>
          <MaterialCommunityIcons name="camera-off" size={56} color="rgba(255,255,255,0.5)" />
          <Text style={s.permMessage}>
            Il permesso alla fotocamera è necessario per scansionare i QR code
          </Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Consenti fotocamera</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating teal header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={goBack}
          style={s.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 38 }} />
      </View>
    </View>
  );
}

function makeStyles(FRAME_SIZE: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#000",
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: HEADER_COLOR,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 14,
      gap: 8,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "rgba(0,0,0,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: "#fff",
      textAlign: "center",
    },
    overlayStrip: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.56)",
    },
    overlaySide: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.56)",
    },
    corner: {
      position: "absolute",
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      borderColor: "#fff",
      borderWidth: CORNER_THICKNESS,
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderTopLeftRadius: 4,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderLeftWidth: 0,
      borderBottomWidth: 0,
      borderTopRightRadius: 4,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomLeftRadius: 4,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderBottomRightRadius: 4,
    },
    hintText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 32,
    },
    permWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      paddingHorizontal: 36,
    },
    permMessage: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 22,
    },
    permBtn: {
      backgroundColor: HEADER_COLOR,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 28,
      marginTop: 8,
    },
    permBtnText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
  });
}
