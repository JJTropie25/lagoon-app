import { Redirect } from "expo-router";
import { useAuthState } from "../lib/auth";
import { useOnboardingState } from "../lib/onboarding";
import { useLoginPromptState } from "../lib/loginPrompt";
import SplashScreen from "../components/SplashScreen";

export default function Index() {
  const { session, loading } = useAuthState();
  const onboarding = useOnboardingState();
  const loginPrompt = useLoginPromptState();

  if (loading || onboarding.loading || loginPrompt.loading) {
    return <SplashScreen />;
  }
  if (!onboarding.completed) {
    return <Redirect href="/onboarding-intro" />;
  }
  // First launch without a session: show sign-in (dismissible with X).
  // Once the user dismisses, markLoginPrompted() is called and this branch
  // never triggers again, so subsequent cold starts go straight to guest.
  if (!session && !loginPrompt.prompted) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Redirect href="/(tabs)/guest" />;
}
