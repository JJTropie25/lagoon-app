import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "../../../lib/i18n";
import { supabase } from "../../../lib/supabase";
import { useAuthState } from "../../../lib/auth";
import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";
import { useTheme } from "../../../lib/theme-context";
import { type ThemeColors } from "../../../lib/theme";
import { useAppDialog } from "../../../components/AppDialogProvider";

const HEADER_COLOR = "#4F9B9B";
const DANGER_COLOR = "#B94040";

const PREFIX_OPTIONS = [
  { code: "+1",   country: "US / Canada",    flag: "🇺🇸" },
  { code: "+7",   country: "Russia",          flag: "🇷🇺" },
  { code: "+20",  country: "Egypt",           flag: "🇪🇬" },
  { code: "+27",  country: "South Africa",    flag: "🇿🇦" },
  { code: "+30",  country: "Greece",          flag: "🇬🇷" },
  { code: "+31",  country: "Netherlands",     flag: "🇳🇱" },
  { code: "+32",  country: "Belgium",         flag: "🇧🇪" },
  { code: "+33",  country: "France",          flag: "🇫🇷" },
  { code: "+34",  country: "Spain",           flag: "🇪🇸" },
  { code: "+36",  country: "Hungary",         flag: "🇭🇺" },
  { code: "+39",  country: "Italy",           flag: "🇮🇹" },
  { code: "+40",  country: "Romania",         flag: "🇷🇴" },
  { code: "+41",  country: "Switzerland",     flag: "🇨🇭" },
  { code: "+43",  country: "Austria",         flag: "🇦🇹" },
  { code: "+44",  country: "United Kingdom",  flag: "🇬🇧" },
  { code: "+45",  country: "Denmark",         flag: "🇩🇰" },
  { code: "+46",  country: "Sweden",          flag: "🇸🇪" },
  { code: "+47",  country: "Norway",          flag: "🇳🇴" },
  { code: "+48",  country: "Poland",          flag: "🇵🇱" },
  { code: "+49",  country: "Germany",         flag: "🇩🇪" },
  { code: "+52",  country: "Mexico",          flag: "🇲🇽" },
  { code: "+54",  country: "Argentina",       flag: "🇦🇷" },
  { code: "+55",  country: "Brazil",          flag: "🇧🇷" },
  { code: "+56",  country: "Chile",           flag: "🇨🇱" },
  { code: "+61",  country: "Australia",       flag: "🇦🇺" },
  { code: "+62",  country: "Indonesia",       flag: "🇮🇩" },
  { code: "+63",  country: "Philippines",     flag: "🇵🇭" },
  { code: "+65",  country: "Singapore",       flag: "🇸🇬" },
  { code: "+66",  country: "Thailand",        flag: "🇹🇭" },
  { code: "+81",  country: "Japan",           flag: "🇯🇵" },
  { code: "+82",  country: "South Korea",     flag: "🇰🇷" },
  { code: "+84",  country: "Vietnam",         flag: "🇻🇳" },
  { code: "+86",  country: "China",           flag: "🇨🇳" },
  { code: "+90",  country: "Turkey",          flag: "🇹🇷" },
  { code: "+91",  country: "India",           flag: "🇮🇳" },
  { code: "+92",  country: "Pakistan",        flag: "🇵🇰" },
  { code: "+94",  country: "Sri Lanka",       flag: "🇱🇰" },
  { code: "+212", country: "Morocco",         flag: "🇲🇦" },
  { code: "+213", country: "Algeria",         flag: "🇩🇿" },
  { code: "+216", country: "Tunisia",         flag: "🇹🇳" },
  { code: "+234", country: "Nigeria",         flag: "🇳🇬" },
  { code: "+351", country: "Portugal",        flag: "🇵🇹" },
  { code: "+353", country: "Ireland",         flag: "🇮🇪" },
  { code: "+355", country: "Albania",         flag: "🇦🇱" },
  { code: "+358", country: "Finland",         flag: "🇫🇮" },
  { code: "+359", country: "Bulgaria",        flag: "🇧🇬" },
  { code: "+380", country: "Ukraine",         flag: "🇺🇦" },
  { code: "+385", country: "Croatia",         flag: "🇭🇷" },
  { code: "+386", country: "Slovenia",        flag: "🇸🇮" },
  { code: "+420", country: "Czech Republic",  flag: "🇨🇿" },
  { code: "+421", country: "Slovakia",        flag: "🇸🇰" },
  { code: "+966", country: "Saudi Arabia",    flag: "🇸🇦" },
  { code: "+971", country: "UAE",             flag: "🇦🇪" },
  { code: "+972", country: "Israel",          flag: "🇮🇱" },
  { code: "+977", country: "Nepal",           flag: "🇳🇵" },
  { code: "+880", country: "Bangladesh",      flag: "🇧🇩" },
];

type EditField = "username" | "email" | "password" | "phone";

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },

    header: {
      position: "absolute",
      top: 0, left: 0, right: 0,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: HEADER_COLOR,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 15, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
    },

    scroll: { paddingHorizontal: 16 },

    // Avatar row
    avatarSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 20,
    },
    avatarWrapper: {},
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.surfaceSoft,
    },
    cameraBadge: {
      position: "absolute",
      bottom: 0, right: 0,
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: HEADER_COLOR,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: c.screenBackground,
    },
    avatarMeta: { flex: 1 },
    avatarName: {
      fontSize: 16, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 2,
    },
    changePhotoText: {
      fontSize: 13, fontWeight: "600",
      color: HEADER_COLOR,
    },

    // Settings card
    card: {
      backgroundColor: c.listBackground,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 20,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 15,
      gap: 10,
    },
    rowLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textPrimary,
      width: 110,
    },
    rowValue: {
      flex: 1,
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "right",
      marginRight: 4,
    },
    rowDivider: {
      height: 1,
      backgroundColor: c.divider,
      marginLeft: 16,
    },

    // Logout button
    logoutBtn: {
      borderWidth: 1.5,
      borderColor: DANGER_COLOR,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      marginBottom: 32,
    },
    logoutBtnText: { color: DANGER_COLOR, fontSize: 15, fontWeight: "700" },

    // Field edit full-screen modal
    editBackdrop: {
      flex: 1,
      backgroundColor: c.screenBackground,
    },
    editSheet: {
      paddingHorizontal: 16,
    },
    editHandle: {
      height: 0,
    },
    editSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    editSheetCancel: {
      fontSize: 14, fontWeight: "600",
      color: c.textSecondary,
      paddingVertical: 4,
    },
    editSheetTitle: {
      fontSize: 16, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
    },
    editSheetSave: {
      fontSize: 14, fontWeight: "700",
      color: HEADER_COLOR,
      paddingVertical: 4,
    },
    editSheetSaveDisabled: { opacity: 0.45 },

    editInput: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: c.textPrimary,
      marginBottom: 6,
    },
    editHint: {
      fontSize: 12,
      color: c.textMuted,
      marginBottom: 8,
    },

    passwordRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      marginBottom: 6,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.textPrimary,
      fontSize: 15,
      backgroundColor: "transparent",
    },
    passwordEye: { paddingHorizontal: 14 },

    phoneEditRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
    prefixBtn: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minWidth: 90,
    },
    prefixBtnText: { color: c.textPrimary, fontWeight: "700", fontSize: 14 },
    phoneInput: { flex: 1 },

    // Country code bottom sheet
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: c.screenBackground,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 16, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
    },
    prefixItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    prefixFlag: { fontSize: 18, width: 26 },
    prefixCode: { fontSize: 14, fontWeight: "700", color: c.textPrimary, width: 46 },
    prefixCodeActive: { color: HEADER_COLOR },
    prefixCountry: { flex: 1, fontSize: 14, color: c.textSecondary },
    prefixCountryActive: { color: c.textPrimary, fontWeight: "600" },
  });
}

export default function EditProfile() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const dialog = useAppDialog();
  const { user } = useAuthState();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const returnRoute = returnTo === "host" ? "/(host)/profile" : "/(tabs)/profile";

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+39");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [initialPhonePrefix, setInitialPhonePrefix] = useState("+39");
  const [initialPhoneNumber, setInitialPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Field editing modal
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editPhonePrefix, setEditPhonePrefix] = useState("+39");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [prefixOpen, setPrefixOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.username) setUsername(user.user_metadata.username);
    if (user.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    if (!user) { setAvatarUrl(null); return; }
    if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
    if (!supabase) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted) return;
        const row = (data as any) ?? {};
        setAvatarUrl(row.avatar_url ?? user.user_metadata?.avatar_url ?? null);
        const loadedPrefix = row.phone_country_code ?? "+39";
        const loadedPhone = row.phone_number ?? "";
        setPhonePrefix(loadedPrefix);
        setPhoneNumber(loadedPhone);
        setInitialPhonePrefix(loadedPrefix);
        setInitialPhoneNumber(loadedPhone);
      });
    return () => { isMounted = false; };
  }, [user]);

  const openEdit = (field: EditField) => {
    if (field === "username") setEditValue(username);
    else if (field === "email") setEditValue(email);
    else if (field === "password") setEditValue("");
    else if (field === "phone") {
      setEditPhonePrefix(phonePrefix);
      setEditPhoneNumber(phoneNumber);
    }
    setShowPassword(false);
    setEditingField(field);
  };

  const closeEdit = () => setEditingField(null);

  const handleSaveField = async () => {
    if (!supabase || !user) return;
    setEditSaving(true);
    try {
      if (editingField === "username") {
        const { error } = await supabase.auth.updateUser({ data: { username: editValue.trim() } });
        if (error) { await dialog.alert(t("edit.saveChanges"), error.message); return; }
        setUsername(editValue.trim());
      } else if (editingField === "email") {
        const { error } = await supabase.auth.updateUser({ email: editValue.trim() });
        if (error) { await dialog.alert(t("edit.saveChanges"), error.message); return; }
        setEmail(editValue.trim());
      } else if (editingField === "password") {
        const trimmed = editValue.trim();
        if (!trimmed) { closeEdit(); return; }
        const { error } = await supabase.auth.updateUser({ password: trimmed });
        if (error) { await dialog.alert(t("edit.saveChanges"), error.message); return; }
      } else if (editingField === "phone") {
        const nextPhone = editPhoneNumber.trim();
        if (!editPhonePrefix || !nextPhone) { await dialog.alert(t("edit.saveChanges"), t("edit.phoneRequired")); return; }
        const { error } = await supabase.from("profiles").upsert(
          { id: user.id, phone_country_code: editPhonePrefix, phone_number: nextPhone },
          { onConflict: "id" }
        );
        if (error) { await dialog.alert(t("edit.saveChanges"), error.message); return; }
        setPhonePrefix(editPhonePrefix);
        setPhoneNumber(nextPhone);
        setInitialPhonePrefix(editPhonePrefix);
        setInitialPhoneNumber(nextPhone);
      }
      closeEdit();
    } finally {
      setEditSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!user || !supabase) {
      await dialog.alert(t("edit.changePhoto"), "Sign in and configure Supabase to upload a photo.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { await dialog.alert(t("edit.changePhoto"), "Permission denied."); return; }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        ...(Platform.OS === "android" ? { legacy: true } : {}),
      });
    } catch (error: any) {
      await dialog.alert(t("edit.changePhoto"), error?.message ?? t("edit.photoError"));
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const inferredExt = asset.mimeType?.split("/").pop() || asset.fileName?.split(".").pop() || asset.uri.split(".").pop() || "jpg";
    const fileExt = inferredExt.toLowerCase();
    const version = Date.now();
    const filePath = `${user.id}/avatar-${version}.${fileExt}`;
    let error: { message: string } | null = null;
    if (Platform.OS === "web") {
      try {
        const webFile = (asset as any).file as File | undefined;
        const payload = webFile ?? (await (await fetch(asset.uri)).blob());
        const upload = await supabase.storage.from("avatars").upload(filePath, payload, { cacheControl: "3600", upsert: true, contentType: asset.mimeType ?? "image/jpeg" });
        error = upload.error;
      } catch (webError: any) {
        await dialog.alert(t("edit.changePhoto"), webError?.message ?? t("edit.photoError"));
        return;
      }
    } else {
      let fileBuffer: Uint8Array;
      try {
        const base64 = await LegacyFileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
        fileBuffer = Buffer.from(base64, "base64");
      } catch (nativeError: any) {
        await dialog.alert(t("edit.changePhoto"), nativeError?.message ?? t("edit.photoError"));
        return;
      }
      const upload = await supabase.storage.from("avatars").upload(filePath, fileBuffer, { cacheControl: "3600", upsert: true, contentType: asset.mimeType ?? "image/jpeg" });
      error = upload.error;
    }
    if (error) { await dialog.alert(t("edit.changePhoto"), error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    if (data?.publicUrl) {
      setAvatarUrl(data.publicUrl);
      const { error: profileUpsertError } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: data.publicUrl }, { onConflict: "id" });
      if (profileUpsertError) await dialog.alert(t("edit.changePhoto"), profileUpsertError.message);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) { await dialog.alert(t("profile.logout"), error.message); return; }
    router.replace("/(auth)/sign-in");
  };

  const headerH = insets.top + 52;
  const displayName = username || user?.user_metadata?.username || "—";
  const displayPhone = phoneNumber ? `${phonePrefix} ${phoneNumber}` : "—";

  const fields: { key: EditField; label: string; value: string }[] = [
    { key: "username", label: t("edit.username"),     value: displayName },
    { key: "email",    label: t("edit.email"),        value: email || "—" },
    { key: "password", label: t("edit.password"),     value: "••••••••" },
    { key: "phone",    label: t("edit.phoneNumber"),  value: displayPhone },
  ];

  const editFieldLabel =
    editingField === "username" ? t("edit.username")
    : editingField === "email"  ? t("edit.email")
    : editingField === "password" ? t("edit.password")
    : t("edit.phoneNumber");

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={mode === "dark" ? ["#051F1F", "#0B3F3F"] : ["#A5D3D3", "#FFFFFF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.55 }}
        pointerEvents="none"
      />

      {/* Fixed teal header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace(returnRoute as any)}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("edit.title")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 8, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar row */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require("../../../assets/images/icon.png")}
              style={styles.avatar}
            />
            <View style={styles.cameraBadge}>
              <MaterialCommunityIcons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.avatarMeta}>
            <Text style={styles.avatarName}>{displayName}</Text>
            <TouchableOpacity onPress={handlePickPhoto}>
              <Text style={styles.changePhotoText}>{t("edit.changePhoto")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings card */}
        <View style={styles.card}>
          {fields.map((field, i) => (
            <View key={field.key}>
              {i > 0 && <View style={styles.rowDivider} />}
              <TouchableOpacity style={styles.row} onPress={() => openEdit(field.key)} activeOpacity={0.7}>
                <Text style={styles.rowLabel}>{field.label}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>{field.value}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {user ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>{t("profile.logout")}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Field edit full-screen modal */}
      <Modal
        visible={editingField != null}
        animationType="slide"
        onRequestClose={closeEdit}
        statusBarTranslucent
      >
        <View style={[styles.editBackdrop, { paddingTop: (StatusBar.currentHeight ?? 0) + insets.top + 12 }]}>
          <View style={styles.editSheet}>
            <View style={styles.editHandle} />
            <View style={styles.editSheetHeader}>
              <TouchableOpacity onPress={closeEdit}>
                <Text style={styles.editSheetCancel}>Annulla</Text>
              </TouchableOpacity>
              <Text style={styles.editSheetTitle}>{editFieldLabel}</Text>
              <TouchableOpacity onPress={handleSaveField} disabled={editSaving}>
                <Text style={[styles.editSheetSave, editSaving && styles.editSheetSaveDisabled]}>
                  {editSaving ? "..." : "Salva"}
                </Text>
              </TouchableOpacity>
            </View>

            {editingField === "phone" ? (
              <View style={styles.phoneEditRow}>
                <TouchableOpacity style={styles.prefixBtn} onPress={() => setPrefixOpen(true)}>
                  <Text style={styles.prefixBtnText}>{editPhonePrefix}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.editInput, styles.phoneInput]}
                  placeholder="3331234567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={editPhoneNumber}
                  onChangeText={(v) => setEditPhoneNumber(v.replace(/[^\d]/g, ""))}
                  autoFocus
                />
              </View>
            ) : editingField === "password" ? (
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Nuova password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={editValue}
                  onChangeText={setEditValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                <TouchableOpacity style={styles.passwordEye} onPress={() => setShowPassword((v) => !v)}>
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.editInput}
                placeholder={editFieldLabel}
                placeholderTextColor={colors.textMuted}
                value={editValue}
                onChangeText={setEditValue}
                autoCapitalize={editingField === "email" ? "none" : "words"}
                keyboardType={editingField === "email" ? "email-address" : "default"}
                autoFocus
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Country code bottom sheet */}
      <Modal
        transparent
        visible={prefixOpen}
        animationType="slide"
        onRequestClose={() => setPrefixOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPrefixOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("edit.phonePrefix")}</Text>
              <Pressable onPress={() => setPrefixOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {PREFIX_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={styles.prefixItem}
                  onPress={() => { setEditPhonePrefix(opt.code); setPrefixOpen(false); }}
                >
                  <Text style={styles.prefixFlag}>{opt.flag}</Text>
                  <Text style={[styles.prefixCode, editPhonePrefix === opt.code && styles.prefixCodeActive]}>
                    {opt.code}
                  </Text>
                  <Text style={[styles.prefixCountry, editPhonePrefix === opt.code && styles.prefixCountryActive]}>
                    {opt.country}
                  </Text>
                  {editPhonePrefix === opt.code ? (
                    <MaterialCommunityIcons name="check" size={18} color={HEADER_COLOR} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
