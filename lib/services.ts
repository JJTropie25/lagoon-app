import { supabase } from "./supabase";
import { fetchReviewCounts } from "./reviews";

export type ServiceAmenities = {
  towels_included?: boolean;
  hair_dryer?: boolean;
  soap_included?: boolean;
  dimensions?: string;
  open_24h?: boolean;
  quiet_location?: boolean;
  blanket?: boolean;
  sofa_or_bed?: "sofa" | "bed";
  toilet_access?: boolean;
  // focus
  wifi?: boolean;
  ergonomic_chair?: boolean;
  isolated_space?: boolean;
  adjustable_lighting?: boolean;
  // tavolo
  seats_count?: number;
  // charge
  voltage?: number;
  outlet_count?: number;
  international_plug?: boolean;
};

export type Service = {
  id: string;
  title: string;
  category: "rest" | "shower" | "storage" | "focus" | "tavolo" | "charge";
  description?: string | null;
  price_eur: number;
  image_url?: string | null;
  location: string;
  city?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  review_count?: number | null;
  distance_meters?: number | null;
  section?: string | null;
  cancellation_minutes?: number | null;
  amenities?: ServiceAmenities | null;
};

type FetchServicesOptions = {
  limit?: number;
};

export async function fetchServices(
  options?: FetchServicesOptions
): Promise<Service[]> {
  if (!supabase) return [];
  let query = supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  const services = data as Service[];
  const counts = await fetchReviewCounts(services.map(s => s.id));
  return services.map(s => ({ ...s, review_count: counts[s.id] ?? 0 }));
}

export function parseFirstImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.trimStart().startsWith("[")) {
    try {
      const arr = JSON.parse(imageUrl);
      return Array.isArray(arr) && arr[0] ? String(arr[0]) : null;
    } catch { return imageUrl; }
  }
  return imageUrl;
}

export function toPriceLabel(price: number) {
  return `€${price}`;
}

export function toDistanceLabel(distanceMeters?: number | null): string | undefined {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return undefined;
  if (distanceMeters >= 1000) {
    const km = Math.floor(distanceMeters / 1000);
    return `${km}km`;
  }
  const meters = Math.floor(distanceMeters);
  return `${meters}m`;
}

export function toTypeKey(category: Service["category"]) {
  if (category === "rest")    return "category.rest";
  if (category === "shower")  return "category.shower";
  if (category === "focus")   return "category.focus";
  if (category === "tavolo")  return "category.tavolo";
  if (category === "charge")  return "category.charge";
  return "category.storage";
}

export function toCategoryIcon(category: Service["category"]) {
  if (category === "rest")    return "bed-king";
  if (category === "shower")  return "shower";
  if (category === "focus")   return "laptop";
  if (category === "tavolo")  return "silverware-fork-knife";
  if (category === "charge")  return "lightning-bolt";
  return "locker";
}
