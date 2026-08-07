import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import { type ThemeColors } from "../../lib/theme";
import { useAuthState } from "../../lib/auth";
import { useAppDialog } from "../../components/AppDialogProvider";
import {
  TIER_ALLOWED_CATEGORIES,
  type HostTier,
  ensureHostForUser,
  submitHostOnboarding,
} from "../../lib/host";
import { type Service } from "../../lib/services";
import { pickAndUploadDocumentImage } from "../../lib/listingImage";

const TEAL = "#4F9B9B";
const TOTAL_STEPS = 5;

const PREFIX_OPTIONS = [
  { code: "+39",  country: "Italy",          flag: "🇮🇹" },
  { code: "+33",  country: "France",         flag: "🇫🇷" },
  { code: "+34",  country: "Spain",          flag: "🇪🇸" },
  { code: "+41",  country: "Switzerland",    flag: "🇨🇭" },
  { code: "+43",  country: "Austria",        flag: "🇦🇹" },
  { code: "+44",  country: "United Kingdom", flag: "🇬🇧" },
  { code: "+49",  country: "Germany",        flag: "🇩🇪" },
  { code: "+351", country: "Portugal",       flag: "🇵🇹" },
  { code: "+385", country: "Croatia",        flag: "🇭🇷" },
  { code: "+386", country: "Slovenia",       flag: "🇸🇮" },
  { code: "+1",   country: "USA / Canada",   flag: "🇺🇸" },
];

type TierOption = {
  id: HostTier;
  label: string;
  subtitle: string;
  icon: string;
};

const TIER_OPTIONS: TierOption[] = [
  {
    id: "COMMERCIAL_STORE",
    label: "Negozio / Attività commerciale",
    subtitle: "Bagagli, ricariche",
    icon: "store-outline",
  },
  {
    id: "FOOD_AND_COWORKING",
    label: "Bar / Café / Coworking",
    subtitle: "Bagagli, ricariche, postazioni, tavoli",
    icon: "coffee-outline",
  },
  {
    id: "CERTIFIED_ACCOMMODATION",
    label: "Struttura ricettiva (Hotel, B&B, Ostello)",
    subtitle: "Tutti i servizi inclusi riposo e doccia",
    icon: "bed-outline",
  },
  {
    id: "SPORT_CENTER",
    label: "Palestra / Centro sportivo",
    subtitle: "Docce, bagagli, ricariche",
    icon: "dumbbell",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  rest:    "#1A4F8A",
  shower:  "#5BB5CC",
  storage: "#C8930A",
  focus:   "#C62828",
  tavolo:  "#C2185B",
  charge:  "#2E7D32",
};

const CATEGORY_META: Record<Service["category"], { label: string; icon: string }> = {
  rest:    { label: "Riposo",    icon: "bed-king" },
  shower:  { label: "Doccia",   icon: "shower" },
  storage: { label: "Bagagli",  icon: "locker" },
  focus:   { label: "Focus",    icon: "laptop" },
  tavolo:  { label: "Tavolo",   icon: "silverware-fork-knife" },
  charge:  { label: "Ricarica", icon: "lightning-bolt" },
};

function validateTaxId(value: string): boolean {
  const v = value.trim().toUpperCase();
  return /^\d{11}$/.test(v) || /^[A-Z0-9]{16}$/.test(v);
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screenBackground },

    header: {
      backgroundColor: TEAL,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    headerBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 16, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: "#fff",
      marginHorizontal: 8,
    },
    stepsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
    stepDot: {
      height: 6, borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.35)",
    },
    stepDotActive: { backgroundColor: "#fff" },
    stepLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginLeft: 4 },

    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 48 },

    stepTitle: {
      fontSize: 20, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary,
      marginBottom: 6,
    },
    stepSubtitle: {
      fontSize: 14, color: c.textSecondary,
      marginBottom: 24, lineHeight: 20,
    },

    fieldBlock: { marginBottom: 18 },
    label: {
      fontSize: 11, fontWeight: "700", textTransform: "uppercase",
      letterSpacing: 0.8, color: c.textSecondary, marginBottom: 6,
    },
    input: {
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: c.textPrimary,
      fontSize: 15,
    },
    inputFocused: {
      borderWidth: 1.5,
      borderColor: TEAL,
    },
    inputError: { borderWidth: 1.5, borderColor: "#C62828" },
    hint: {
      fontSize: 12, color: c.textMuted,
      marginTop: 6, lineHeight: 17,
      paddingHorizontal: 4,
    },
    errorText: {
      fontSize: 12, color: "#C62828",
      marginTop: 6, paddingHorizontal: 4,
    },

    phoneRow: { flexDirection: "row", gap: 10 },
    prefixBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: c.surfaceSoft,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    prefixBtnText: { color: c.textPrimary, fontWeight: "700", fontSize: 15 },
    phoneInput: { flex: 1 },

    tierCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.listBackground,
      padding: 14,
      marginBottom: 10,
    },
    tierCardSelected: { borderColor: TEAL, backgroundColor: c.surfaceSoft },
    tierIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.surfaceSoft,
      alignItems: "center", justifyContent: "center",
    },
    tierIconSelected: { backgroundColor: TEAL },
    tierLabel: { fontSize: 14, fontWeight: "700", color: c.textPrimary },
    tierSubtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    docBox: {
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.border,
      borderStyle: "dashed",
      backgroundColor: c.surfaceSoft,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      minHeight: 120,
      overflow: "hidden",
    },
    docBoxUploaded: { borderStyle: "solid", borderColor: TEAL },
    docImage: { width: "100%", height: 160, borderRadius: 10 },
    docHint: { color: c.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center" },
    changeDocLink: {
      color: TEAL, fontWeight: "700", fontSize: 13,
      textAlign: "center", marginTop: 10,
    },

    noticeBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: c.warmSurface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      alignItems: "flex-start",
    },
    noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: c.textPrimary },

    checkRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 20,
    },
    checkBox: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, borderColor: c.border,
      alignItems: "center", justifyContent: "center",
      marginTop: 2, flexShrink: 0,
    },
    checkBoxChecked: { backgroundColor: TEAL, borderColor: TEAL },
    checkLabel: { flex: 1, fontSize: 13, lineHeight: 19, color: c.textPrimary },

    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    categoryChip: {
      flexBasis: "30%", flexGrow: 1,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.listBackground,
      alignItems: "center",
      paddingVertical: 14,
      gap: 6,
    },
    categoryChipSelected: { borderColor: TEAL, backgroundColor: c.surfaceSoft },
    categoryChipText: { fontSize: 12, fontWeight: "700", color: c.textSecondary, textAlign: "center" },
    categoryChipTextSelected: { color: TEAL },

    pendingBox: {
      borderRadius: 16,
      backgroundColor: c.warmSurface,
      padding: 24,
      alignItems: "center",
      gap: 12,
    },
    pendingTitle: {
      fontSize: 20, fontWeight: "700",
      fontFamily: "Baloo2_700Bold",
      color: c.textPrimary, textAlign: "center",
    },
    pendingText: {
      fontSize: 14, color: c.textSecondary,
      textAlign: "center", lineHeight: 21,
    },

    navRow: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.screenBackground,
    },
    backBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      backgroundColor: c.surfaceSoft,
    },
    backBtnText: { fontWeight: "700", fontSize: 15, color: c.textPrimary },
    nextBtn: {
      flex: 2,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      backgroundColor: TEAL,
    },
    nextBtnDisabled: { opacity: 0.45 },
    nextBtnText: { fontWeight: "700", fontSize: 15, color: "#fff" },

    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    modalSheet: {
      backgroundColor: c.listBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: "center",
      marginBottom: 14,
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
      paddingVertical: 12,
      gap: 10,
    },
    prefixFlag: { fontSize: 20, width: 28 },
    prefixCode: { fontSize: 14, fontWeight: "700", color: c.textSecondary, width: 46 },
    prefixCodeActive: { color: TEAL },
    prefixCountry: { flex: 1, fontSize: 14, color: c.textSecondary },
    prefixCountryActive: { color: c.textPrimary, fontWeight: "600" },
    prefixDivider: { height: 1, backgroundColor: c.divider },
  });
}

export default function HostOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthState();
  const { colors } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [taxIdTouched, setTaxIdTouched] = useState(false);
  const [businessAddress, setBusinessAddress] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+39");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [prefixOpen, setPrefixOpen] = useState(false);

  // Step 2
  const [selectedTier, setSelectedTier] = useState<HostTier | null>(null);

  // Step 3
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [cinCirNumber, setCinCirNumber] = useState("");
  const [selfCertAccepted, setSelfCertAccepted] = useState(false);

  // Step 4
  const [selectedCategories, setSelectedCategories] = useState<Set<Service["category"]>>(new Set());

  const taxIdValid = validateTaxId(taxId);
  const allowedCategories = useMemo(
    () => (selectedTier ? TIER_ALLOWED_CATEGORIES[selectedTier] : []),
    [selectedTier]
  );

  const step1Valid = Boolean(businessName.trim()) && taxIdValid;
  const step2Valid = selectedTier !== null;
  const step3Valid =
    Boolean(documentUrl) &&
    selfCertAccepted &&
    (selectedTier !== "CERTIFIED_ACCOMMODATION" || Boolean(cinCirNumber.trim()));
  const step4Valid = selectedCategories.size > 0;

  const canAdvance =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    (step === 3 && step3Valid) ||
    (step === 4 && step4Valid) ||
    step === 5;

  const focus = (field: string) => setFocusedField(field);
  const blur = (field: string) => {
    setFocusedField(f => (f === field ? null : f));
  };

  const handleUploadDoc = async () => {
    setUploadingDoc(true);
    const result = await pickAndUploadDocumentImage(user?.id);
    setUploadingDoc(false);
    if (result.canceled) return;
    if (result.error) { await dialog.alert("Documento", result.error); return; }
    setDocumentUrl(result.url);
  };

  const toggleCategory = (cat: Service["category"]) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleNext = async () => {
    if (step < 4) { setStep(s => s + 1); return; }
    if (step === 4) {
      setSubmitting(true);
      const { host, error: hostError } = await ensureHostForUser(user!.id, user?.email ?? null);
      if (hostError || !host) {
        setSubmitting(false);
        await dialog.alert("Errore", hostError ?? "Impossibile creare il profilo host.");
        return;
      }
      const phone = phoneNumber.trim() ? `${phonePrefix} ${phoneNumber.trim()}` : "";
      const err = await submitHostOnboarding({
        hostId: host.id,
        businessName: businessName.trim(),
        taxId: taxId.trim().toUpperCase(),
        businessAddress: businessAddress.trim(),
        businessPhone: phone,
        hostTier: selectedTier!,
        documentUrl,
        cinCirNumber: cinCirNumber.trim() || null,
        selfCertAccepted,
        enabledCategories: Array.from(selectedCategories),
      });
      setSubmitting(false);
      if (err) { await dialog.alert("Errore", err); return; }
      setStep(5);
    }
  };

  const handleBack = () => {
    if (step > 1) { setStep(s => s - 1); return; }
    router.canGoBack() ? router.back() : router.replace("/(host)/listings");
  };

  const stepDots = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    active: i + 1 <= step,
    current: i + 1 === step,
  }));

  const taxIdShowError = taxIdTouched && !taxIdValid && focusedField !== "taxId";
  const taxIdInputStyle = [
    styles.input,
    focusedField === "taxId" && styles.inputFocused,
    taxIdShowError && styles.inputError,
  ];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          {step < 5 && (
            <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Registrazione Host</Text>
        </View>
        <View style={styles.stepsRow}>
          {stepDots.map((dot, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                { width: dot.current ? 20 : 6 },
                dot.active && styles.stepDotActive,
              ]}
            />
          ))}
          <Text style={styles.stepLabel}>{step}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Dati fiscali ── */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Dati fiscali e contatti</Text>
            <Text style={styles.stepSubtitle}>
              Inserisci i dati della tua attività. Servono per la verifica del profilo.
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Nome / Ragione Sociale *</Text>
              <TextInput
                style={[styles.input, focusedField === "businessName" && styles.inputFocused]}
                placeholder="es. Mario Rossi oppure Rossi S.r.l."
                placeholderTextColor={colors.textMuted}
                value={businessName}
                onChangeText={setBusinessName}
                onFocus={() => focus("businessName")}
                onBlur={() => blur("businessName")}
                returnKeyType="next"
              />
              {focusedField === "businessName" && (
                <Text style={styles.hint}>
                  Nome e cognome se sei una persona fisica, ragione sociale se hai un'impresa.
                </Text>
              )}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>P.IVA o Codice Fiscale *</Text>
              <TextInput
                style={taxIdInputStyle}
                placeholder="11 cifre (P.IVA) · 16 caratteri (CF)"
                placeholderTextColor={colors.textMuted}
                value={taxId}
                onChangeText={setTaxId}
                onFocus={() => focus("taxId")}
                onBlur={() => { setTaxIdTouched(true); blur("taxId"); }}
                autoCapitalize="characters"
                returnKeyType="next"
              />
              {focusedField === "taxId" && (
                <Text style={styles.hint}>
                  P.IVA: 11 cifre (es. 01234567890) · Codice Fiscale: 16 caratteri alfanumerici (es. RSSMRA80A01H501Y).
                </Text>
              )}
              {taxIdShowError && (
                <Text style={styles.errorText}>
                  Formato non valido. P.IVA: 11 cifre · CF: 16 caratteri alfanumerici.
                </Text>
              )}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Indirizzo attività</Text>
              <TextInput
                style={[styles.input, focusedField === "address" && styles.inputFocused]}
                placeholder="Via Roma 1, 20121 Milano"
                placeholderTextColor={colors.textMuted}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                onFocus={() => focus("address")}
                onBlur={() => blur("address")}
                returnKeyType="next"
              />
              {focusedField === "address" && (
                <Text style={styles.hint}>
                  Indirizzo della sede operativa dove eroghi i servizi ai viaggiatori.
                </Text>
              )}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Telefono</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity style={styles.prefixBtn} onPress={() => setPrefixOpen(true)}>
                  <Text style={styles.prefixBtnText}>{phonePrefix}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.phoneInput, focusedField === "phone" && styles.inputFocused]}
                  placeholder="3331234567"
                  placeholderTextColor={colors.textMuted}
                  value={phoneNumber}
                  onChangeText={v => setPhoneNumber(v.replace(/[^\d]/g, ""))}
                  onFocus={() => focus("phone")}
                  onBlur={() => blur("phone")}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
              {focusedField === "phone" && (
                <Text style={styles.hint}>
                  Numero senza prefisso internazionale (es. 3331234567). Campo opzionale.
                </Text>
              )}
            </View>
          </>
        )}

        {/* ── STEP 2: Tier ── */}
        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>Tipo di struttura</Text>
            <Text style={styles.stepSubtitle}>
              Seleziona la categoria che descrive meglio la tua attività. Determina i servizi che potrai offrire.
            </Text>
            {TIER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.tierCard, selectedTier === opt.id && styles.tierCardSelected]}
                onPress={() => {
                  setSelectedTier(opt.id);
                  setSelectedCategories(new Set());
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.tierIcon, selectedTier === opt.id && styles.tierIconSelected]}>
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={20}
                    color={selectedTier === opt.id ? "#fff" : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierLabel}>{opt.label}</Text>
                  <Text style={styles.tierSubtitle}>{opt.subtitle}</Text>
                </View>
                {selectedTier === opt.id && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={TEAL} />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── STEP 3: Documenti ── */}
        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>Documenti e dichiarazioni</Text>
            <Text style={styles.stepSubtitle}>
              Carica un documento d'identità e accetta le dichiarazioni legali obbligatorie.
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Documento d'identità *</Text>
              <TouchableOpacity
                style={[styles.docBox, documentUrl && styles.docBoxUploaded]}
                onPress={handleUploadDoc}
                disabled={uploadingDoc}
                activeOpacity={0.8}
              >
                {uploadingDoc ? (
                  <ActivityIndicator color={TEAL} />
                ) : documentUrl ? (
                  <Image source={{ uri: documentUrl }} style={styles.docImage} resizeMode="cover" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="card-account-details-outline" size={36} color={colors.textMuted} />
                    <Text style={styles.docHint}>Tocca per caricare una foto del documento</Text>
                    <Text style={[styles.docHint, { fontSize: 11 }]}>Carta d'identità o passaporto</Text>
                  </>
                )}
              </TouchableOpacity>
              {documentUrl && (
                <TouchableOpacity onPress={handleUploadDoc} disabled={uploadingDoc}>
                  <Text style={styles.changeDocLink}>Cambia documento</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedTier === "CERTIFIED_ACCOMMODATION" && (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Codice CIN / CIR *</Text>
                <TextInput
                  style={[styles.input, focusedField === "cin" && styles.inputFocused]}
                  placeholder="es. IT012345678901234"
                  placeholderTextColor={colors.textMuted}
                  value={cinCirNumber}
                  onChangeText={setCinCirNumber}
                  onFocus={() => focus("cin")}
                  onBlur={() => blur("cin")}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
                {focusedField === "cin" && (
                  <Text style={styles.hint}>
                    Il Codice Identificativo Nazionale (CIN) è obbligatorio per le strutture ricettive (D.L. 145/2023). Lo trovi sul portale del Ministero del Turismo.
                  </Text>
                )}
              </View>
            )}

            <View style={styles.noticeBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.warmAccent} style={{ marginTop: 1 }} />
              <Text style={styles.noticeText}>
                I documenti vengono verificati dal team Lagoon entro 2–3 giorni lavorativi. Potrai pubblicare inserzioni solo dopo l'approvazione.
              </Text>
            </View>

            <TouchableOpacity style={styles.checkRow} onPress={() => setSelfCertAccepted(v => !v)} activeOpacity={0.8}>
              <View style={[styles.checkBox, selfCertAccepted && styles.checkBoxChecked]}>
                {selfCertAccepted && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkLabel}>
                Dichiaro sotto la mia responsabilità di possedere i titoli autorizzativi, edilizi e igienico-sanitari idonei all'erogazione dei servizi selezionati.
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 4: Servizi ── */}
        {step === 4 && (
          <>
            <Text style={styles.stepTitle}>Servizi offerti</Text>
            <Text style={styles.stepSubtitle}>
              Scegli i servizi che vuoi mettere a disposizione dei viaggiatori. Seleziona almeno uno.
            </Text>
            <View style={styles.categoryGrid}>
              {allowedCategories.map(cat => {
                const meta = CATEGORY_META[cat];
                const color = CATEGORY_COLORS[cat];
                const selected = selectedCategories.has(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selected && { borderColor: color, backgroundColor: color + "18" },
                    ]}
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={meta.icon as any}
                      size={24}
                      color={selected ? color : colors.textSecondary}
                    />
                    <Text style={[styles.categoryChipText, selected && { color }]}>
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.noticeBox}>
              <MaterialCommunityIcons name="information-outline" size={18} color={colors.warmAccent} style={{ marginTop: 1 }} />
              <Text style={styles.noticeText}>
                I servizi disponibili dipendono dal tipo di struttura scelto. Puoi aggiornare la selezione contattando il supporto Lagoon.
              </Text>
            </View>
          </>
        )}

        {/* ── STEP 5: Conferma ── */}
        {step === 5 && (
          <View style={styles.pendingBox}>
            <MaterialCommunityIcons name="clock-check-outline" size={56} color={TEAL} />
            <Text style={styles.pendingTitle}>Profilo in verifica</Text>
            <Text style={styles.pendingText}>
              La tua richiesta è stata inviata con successo.{"\n\n"}
              Il team Lagoon verificherà i documenti entro 2–3 giorni lavorativi e ti contatterà per confermare l'approvazione.{"\n\n"}
              Nel frattempo puoi esplorare la dashboard host.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      {step < 5 ? (
        <View style={[styles.navRow, { paddingBottom: insets.bottom + 8 }]}>
          {step > 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>Indietro</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, (!canAdvance || submitting) && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>
                {step === 4 ? "Invia richiesta" : "Avanti"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.navRow, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.nextBtn, { flex: 1 }]}
            onPress={() => router.replace("/(host)/listings")}
          >
            <Text style={styles.nextBtnText}>Vai alle inserzioni</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Phone prefix bottom sheet */}
      <Modal
        transparent
        visible={prefixOpen}
        animationType="slide"
        onRequestClose={() => setPrefixOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPrefixOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prefisso telefonico</Text>
              <Pressable onPress={() => setPrefixOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {PREFIX_OPTIONS.map((opt, i) => (
                <View key={opt.code}>
                  {i > 0 && <View style={styles.prefixDivider} />}
                  <TouchableOpacity
                    style={styles.prefixItem}
                    onPress={() => { setPhonePrefix(opt.code); setPrefixOpen(false); }}
                  >
                    <Text style={styles.prefixFlag}>{opt.flag}</Text>
                    <Text style={[styles.prefixCode, phonePrefix === opt.code && styles.prefixCodeActive]}>
                      {opt.code}
                    </Text>
                    <Text style={[styles.prefixCountry, phonePrefix === opt.code && styles.prefixCountryActive]}>
                      {opt.country}
                    </Text>
                    {phonePrefix === opt.code && (
                      <MaterialCommunityIcons name="check" size={18} color={TEAL} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
