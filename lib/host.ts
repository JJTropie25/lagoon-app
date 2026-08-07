import { supabase } from "./supabase";
import type { Service, ServiceAmenities } from "./services";
import { parseFirstImageUrl } from "./services";

export type HostTier = "COMMERCIAL_STORE" | "FOOD_AND_COWORKING" | "CERTIFIED_ACCOMMODATION" | "SPORT_CENTER";
export type VerificationStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";

export const TIER_ALLOWED_CATEGORIES: Record<HostTier, Service["category"][]> = {
  COMMERCIAL_STORE:        ["storage", "charge"],
  FOOD_AND_COWORKING:      ["storage", "charge", "focus", "tavolo"],
  CERTIFIED_ACCOMMODATION: ["storage", "charge", "focus", "tavolo", "shower", "rest"],
  SPORT_CENTER:            ["shower", "storage", "charge"],
};

const SLOT_DAYS_AHEAD = 60;

function buildSlotRows(serviceId: string, times: string[]): { service_id: string; slot_start: string; slot_end: string }[] {
  const now = new Date();
  const rows: { service_id: string; slot_start: string; slot_end: string }[] = [];
  for (let day = 0; day < SLOT_DAYS_AHEAD; day++) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
    for (const time of times) {
      const [h, m] = time.split(":").map(Number);
      const start = new Date(base);
      start.setHours(h, m, 0, 0);
      if (start <= now) continue;
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      rows.push({ service_id: serviceId, slot_start: start.toISOString(), slot_end: end.toISOString() });
    }
  }
  return rows;
}

export type HostAccount = {
  id: string;
  guest_id: string | null;
  display_name: string | null;
  business_name: string | null;
  tax_id: string | null;
  business_address: string | null;
  business_phone: string | null;
  host_tier: HostTier | null;
  verification_status: VerificationStatus;
  cin_cir_number: string | null;
  document_url: string | null;
  self_cert_accepted: boolean;
  enabled_categories: Service["category"][];
  onboarding_complete: boolean;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
};

export type HostOnboardingInput = {
  hostId: string;
  businessName: string;
  taxId: string;
  businessAddress: string;
  businessPhone: string;
  hostTier: HostTier;
  documentUrl: string | null;
  cinCirNumber: string | null;
  selfCertAccepted: boolean;
  enabledCategories: Service["category"][];
};

const HOST_FIELDS =
  "id, guest_id, display_name, business_name, tax_id, business_address, business_phone, " +
  "host_tier, verification_status, cin_cir_number, document_url, self_cert_accepted, " +
  "enabled_categories, onboarding_complete";

export type HostReservation = {
  id: string;
  guest_id: string;
  guest_username: string | null;
  people_count: number;
  slot_start: string;
  slot_end: string;
  checked_in_at: string | null;
  created_at: string | null;
  service_id: string;
  service_title: string;
  service_location: string;
  service_image_url: string | null;
  service_category: Service["category"] | null;
};

export async function resolveHostForUser(
  userId?: string | null
): Promise<{ host: HostAccount | null; preview: boolean }> {
  if (!supabase) return { host: null, preview: false };

  if (!userId) return { host: null, preview: false };
  const { data: owned } = await supabase
    .from("hosts")
    .select(HOST_FIELDS)
    .eq("guest_id", userId)
    .maybeSingle();
  return { host: (owned as unknown as HostAccount | null) ?? null, preview: false };
}

export async function ensureHostForUser(
  userId: string,
  displayName?: string | null
): Promise<{ host: HostAccount | null; error: string | null }> {
  if (!supabase) return { host: null, error: "Supabase not configured." };
  if (!userId) return { host: null, error: "Missing user id." };

  const { data: existing } = await supabase
    .from("hosts")
    .select(HOST_FIELDS)
    .eq("guest_id", userId)
    .maybeSingle();
  if (existing) return { host: existing as unknown as HostAccount, error: null };

  const { data, error } = await supabase
    .from("hosts")
    .insert({
      guest_id: userId,
      display_name: displayName ?? null,
    })
    .select(HOST_FIELDS)
    .single();

  if (error) return { host: null, error: error.message };
  return { host: (data as unknown as HostAccount) ?? null, error: null };
}

export async function fetchHostListings(hostId: string): Promise<Service[]> {
  if (!supabase || !hostId) return [];
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Service[];
}

export async function deleteHostListing(serviceId: string): Promise<string | null> {
  if (!supabase || !serviceId) return "Missing service id.";
  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  return error?.message ?? null;
}

export async function fetchHostListingById(serviceId: string): Promise<Service | null> {
  if (!supabase || !serviceId) return null;
  const { data, error } = await supabase.from("services").select("*").eq("id", serviceId).maybeSingle();
  if (error || !data) return null;
  return data as Service;
}

export async function fetchServiceSlots(serviceId: string): Promise<string[]> {
  if (!supabase || !serviceId) return [];
  const { data, error } = await supabase
    .from("service_slots")
    .select("slot_start")
    .eq("service_id", serviceId)
    .order("slot_start", { ascending: true });
  if (error || !data) return [];

  const times = data
    .map((row) => {
      const d = new Date(row.slot_start);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    })
    .filter(Boolean);
  return Array.from(new Set(times));
}

type UpdateListingInput = {
  serviceId: string;
  title: string;
  description: string;
  category: "rest" | "shower" | "storage" | "focus" | "tavolo" | "charge";
  price_eur: number;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  slotTimes: string[];
  cancellationMinutes?: number | null;
  amenities?: ServiceAmenities | null;
};

type CreateListingInput = {
  hostId: string;
  title: string;
  description: string;
  category: "rest" | "shower" | "storage" | "focus" | "tavolo" | "charge";
  price_eur: number;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  image_url?: string | null;
  slotTimes: string[];
  cancellationMinutes?: number | null;
  amenities?: ServiceAmenities | null;
};

function normalizeSlotTimes(times: string[]): string[] {
  return Array.from(
    new Set(
      times
        .map((time) => time.trim())
        .filter((time) => /^\d{2}:\d{2}$/.test(time))
    )
  ).sort();
}

export async function updateHostListing(input: UpdateListingInput): Promise<string | null> {
  if (!supabase) return "Supabase not configured.";
  const {
    serviceId,
    title,
    description,
    category,
    price_eur,
    location,
    latitude,
    longitude,
    image_url,
    slotTimes,
    cancellationMinutes,
    amenities,
  } = input;
  if (!serviceId) return "Missing service id.";

  const { error: updateError } = await supabase
    .from("services")
    .update({
      title,
      description,
      category,
      price_eur,
      location,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      image_url: image_url ?? null,
      cancellation_minutes: cancellationMinutes ?? null,
      amenities: amenities ?? null,
    })
    .eq("id", serviceId);

  if (updateError) return updateError.message;

  const nextTimes = normalizeSlotTimes(slotTimes);
  const currentTimes = normalizeSlotTimes(await fetchServiceSlots(serviceId));
  const timesChanged =
    nextTimes.length !== currentTimes.length ||
    nextTimes.some((time, index) => time !== currentTimes[index]);

  if (!timesChanged) {
    const { data: futureCheck } = await supabase
      .from("service_slots")
      .select("id")
      .eq("service_id", serviceId)
      .gt("slot_start", new Date().toISOString())
      .limit(1);
    if ((futureCheck?.length ?? 0) > 0) return null;
  }

  const rows = buildSlotRows(serviceId, nextTimes);
  const { error: rpcError } = await (supabase as any).rpc("replace_service_slots", {
    p_service_id: serviceId,
    p_rows: rows.map((r) => ({ slot_start: r.slot_start, slot_end: r.slot_end })),
  });
  if (rpcError) return rpcError.message;

  return null;
}

export async function createHostListing(
  input: CreateListingInput
): Promise<{ error: string | null; serviceId: string | null }> {
  if (!supabase) return { error: "Supabase not configured.", serviceId: null };
  const {
    hostId,
    title,
    description,
    category,
    price_eur,
    location,
    latitude,
    longitude,
    image_url,
    slotTimes,
    cancellationMinutes,
    amenities,
  } = input;
  if (!hostId) return { error: "Missing host id.", serviceId: null };

  const { data: created, error: insertServiceError } = await supabase
    .from("services")
    .insert({
      host_id: hostId,
      title,
      description,
      category,
      price_eur,
      location,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      image_url: image_url ?? null,
      cancellation_minutes: cancellationMinutes ?? null,
      amenities: amenities ?? null,
    })
    .select("id")
    .single();

  if (insertServiceError || !created?.id) {
    return { error: insertServiceError?.message ?? "Could not create service.", serviceId: null };
  }

  const serviceId = created.id as string;
  const nextTimes = normalizeSlotTimes(slotTimes);
  if (nextTimes.length === 0) return { error: null, serviceId };

  const rows = buildSlotRows(serviceId, nextTimes);
  const { error: rpcError } = await (supabase as any).rpc("replace_service_slots", {
    p_service_id: serviceId,
    p_rows: rows.map((r) => ({ slot_start: r.slot_start, slot_end: r.slot_end })),
  });
  if (!rpcError) return { error: null, serviceId };

  await supabase.from("services").delete().eq("id", serviceId);
  return { error: rpcError.message, serviceId: null };
}

export async function submitHostOnboarding(
  input: HostOnboardingInput
): Promise<string | null> {
  if (!supabase) return "Supabase not configured.";
  const { error } = await supabase
    .from("hosts")
    .update({
      business_name:       input.businessName,
      tax_id:              input.taxId,
      business_address:    input.businessAddress,
      business_phone:      input.businessPhone,
      host_tier:           input.hostTier,
      document_url:        input.documentUrl ?? null,
      cin_cir_number:      input.cinCirNumber ?? null,
      self_cert_accepted:  input.selfCertAccepted,
      enabled_categories:  input.enabledCategories,
      onboarding_complete: true,
      verification_status: "PENDING_VERIFICATION",
    })
    .eq("id", input.hostId);
  return error?.message ?? null;
}

export async function fetchHostReservations(
  hostId: string
): Promise<HostReservation[]> {
  if (!supabase || !hostId) return [];

  const listings = await fetchHostListings(hostId);
  const listingIds = listings.map((item) => item.id);
  if (listingIds.length === 0) return [];

  const byService = new Map(
    listings.map((item) => [
      item.id,
      {
        title: item.title,
        location: item.location,
        image_url: parseFirstImageUrl(item.image_url) ?? null,
        category: item.category ?? null,
      },
    ])
  );

  const bookingsBase = supabase
    .from("bookings")
    .select("id, guest_id, people_count, slot_start, slot_end, created_at, service_id, checked_in_at")
    .in("service_id", listingIds)
    .order("created_at", { ascending: false });
  let { data, error } = await bookingsBase;
  if (error) {
    const fallback = await supabase
      .from("bookings")
      .select("id, guest_id, people_count, slot_start, slot_end, created_at, service_id")
      .in("service_id", listingIds)
      .order("created_at", { ascending: false });
    data = fallback.data as any;
    error = fallback.error as any;
  }

  if (error || !data) return [];

  const guestIds = Array.from(
    new Set(
      data
        .map((row: any) => row.guest_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );
  const namesById = new Map<string, string>();
  if (guestIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", guestIds);
    (profiles ?? []).forEach((p: any) => {
      namesById.set(p.id, p.username ?? "Guest");
    });
  }

  return data.map((row) => {
    const service = byService.get(row.service_id);
    return {
      id: row.id,
      guest_id: row.guest_id,
      guest_username: namesById.get(row.guest_id) ?? "Guest",
      people_count: row.people_count,
      slot_start: row.slot_start,
      slot_end: row.slot_end,
      checked_in_at: row.checked_in_at ?? null,
      created_at: row.created_at,
      service_id: row.service_id,
      service_title: service?.title ?? "-",
      service_location: service?.location ?? "-",
      service_image_url: service?.image_url ?? null,
      service_category: service?.category ?? null,
    };
  });
}
