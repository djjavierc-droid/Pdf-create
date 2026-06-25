import { Stack, router, useRootNavigationState } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef } from "react";
import { setPendingPdf } from "../lib/pendingPdf";

SplashScreen.preventAutoHideAsync();

function navigateToReader() {
  try {
    router.navigate("/(tabs)/reader");
  } catch {
    // router may not be ready yet — handled by the navState effect below
  }
}

export default function RootLayout() {
  const navState = useRootNavigationState();
  const initialUrl = useRef<string | null>(null);
  const initialHandled = useRef(false);

  // Grab the initial URL once (app opened fresh from file manager).
  useEffect(() => {
    SplashScreen.hideAsync();

    Linking.getInitialURL().then((url) => {
      if (url) initialUrl.current = url;
    });

    // Handle PDFs opened while the app is already running.
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (url) {
        setPendingPdf(url);
        navigateToReader();
      }
    });

    return () => sub.remove();
  }, []);

  // Navigate to reader once the navigator is mounted and ready.
  useEffect(() => {
    if (!navState?.key || initialHandled.current || !initialUrl.current) return;
    initialHandled.current = true;
    setPendingPdf(initialUrl.current);
    navigateToReader();
  }, [navState?.key]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
