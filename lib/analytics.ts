import { PostHog } from "posthog-react-native";

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";

export const posthog: PostHog | null = key
  ? new PostHog(key, { host: "https://eu.i.posthog.com" })
  : null;

export const analytics = {
  searchPerformed(p: {
    microservice: string | null;
    destination: string | null;
    result_count: number;
  }) {
    posthog?.capture("search_performed", p);
  },

  emptySearch(p: { microservice: string | null; destination: string | null }) {
    posthog?.capture("empty_search_results", p);
  },

  bookingFlowStarted(p: {
    service_id: string;
    microservice: string | null;
    category: string | null;
  }) {
    posthog?.capture("booking_flow_started", p);
  },

  bookingCompleted(p: {
    service_id: string;
    microservice: string | null;
    method: string;
    slot_count: number;
    total_eur: number | null;
  }) {
    posthog?.capture("booking_completed", p);
  },
};
