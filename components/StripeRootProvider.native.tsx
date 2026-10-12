import { ReactNode } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

type Props = {
  children: ReactNode;
};

export default function StripeRootProvider({ children }: Props) {
  const stripePublishableKey =
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  return (
    <StripeProvider
      publishableKey={stripePublishableKey}
      merchantIdentifier="merchant.com.lagoon"
    >
      <>{children}</>
    </StripeProvider>
  );
}
