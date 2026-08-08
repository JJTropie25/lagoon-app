# Lagoon App

Expo + Supabase app with guest/host flows, maps, notifications, Stripe Connect payments, PostHog analytics, and Sentry error tracking.

Part of the **Jungle** ecosystem:
- `lagoon-app` — this repo (React Native / Expo)
- `lagoon-web` — landing page (static HTML on Cloudflare Pages)

---

## Prerequisites

- Node.js 20+
- npm
- Expo CLI (`npx expo`)
- EAS CLI (`npm install -g eas-cli`)
- Supabase project
- Stripe account (test mode for setup)

---

## Local setup

1. Install deps:
```bash
npm install
```

2. Copy the right env file for the environment you want to develop against:
```bash
npm run env:demo        # demo DB (mock data) — default for development
npm run env:production  # production DB (empty, real users)
```

Or manually copy `.env.demo` / `.env.production` to `.env`. Required variables:
```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_SENTRY_DSN=
```

> Geocoding and place search use Photon (komoot) + Nominatim (OSM) — no extra API key needed.

3. (Android push notifications) put `google-services.json` in project root.

4. Start dev client:
```bash
npx expo start
```

---

## Environments

The app supports two environments built with EAS, each with its own Supabase project and bundle ID:

| Profile | Bundle ID | Supabase | Purpose |
|---|---|---|---|
| `production` | `com.lagoon.app` | Real DB (empty) | APK linked from landing page |
| `demo` | `com.lagoon.demo` | Demo DB (curated mock data) | Screenshots and demos |

Build commands:
```bash
eas build --profile production --platform android   # real app APK
eas build --profile demo --platform android          # demo APK
```

OTA updates:
```bash
eas update --branch production --message "..."
eas update --branch demo --message "..."
```

---

## Database (Supabase)

### Apply migrations to a new project
```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --linked
```

### Seed demo data
Run `supabase/seeds/mock_curated.sql` in the Supabase Dashboard SQL editor of the demo project.

### Migration files
All files in `supabase/migrations/` are production schema migrations applied in chronological order. The only non-migration file is `supabase/seeds/mock_curated.sql` (demo data only — do not run on production).

---

## Edge Functions

Deploy all functions:
```bash
npx supabase functions deploy --project-ref <PROJECT_REF>
```

Required Supabase secrets (Dashboard → Settings → Edge Functions → Secrets):
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_WEBHOOK_SECRET_CONNECT   # optional
PLATFORM_FEE_PERCENT            # default 20
```

---

## Stripe setup

1. Host completes Stripe Connect onboarding via the profile screen.
2. Guest pays by card (native Stripe Payment Sheet).
3. Webhook at `stripe-webhook` Edge Function handles:
   - `payment_intent.succeeded` → confirms booking + sends push notifications
   - `payment_intent.payment_failed` → marks payment failed
   - `charge.refunded` → marks payment refunded
   - `account.updated` → refreshes host Stripe status

Stripe webhook events to subscribe to:
- `account.updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

---

## Analytics & monitoring

- **PostHog** — product analytics (search funnels, booking conversion, session replay). Tracked events: `search_performed`, `empty_search_results`, `booking_flow_started`, `booking_completed`.
- **Sentry** — crash and error tracking, initialized in `app/_layout.tsx`.

Both require `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_SENTRY_DSN` in the environment.

---

## Notes

- Card payments are disabled on web (Stripe Payment Sheet is native only).
- `.env` and all secret keys must never be committed to git.
- `eas.json` contains only public/publishable keys (Supabase anon key, Stripe publishable key) — no secrets.
