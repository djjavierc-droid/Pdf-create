import { useEffect, useState } from "react";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { setPendingPdf, peekPendingPdf } from "@/lib/pendingPdf";

// Detect any URI that came from an Android PDF intent
function isPdfIntent(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    url.startsWith("content://") ||
    url.startsWith("file://") ||
    lower.includes(".pdf") ||
    lower.includes("application/pdf")
  );
}

export default function NotFoundScreen() {
  // Start in "checking" mode so we never flash the error UI
  // for the instant we redirect to the reader.
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAndRedirect() {
      // 1. Check if _layout.tsx already stored a pending URI
      const stored = peekPendingPdf();
      if (stored) {
        router.replace("/(tabs)/reader");
        return;
      }

      // 2. Check the raw initial URL (the content:// or file:// from the intent)
      const url = await Linking.getInitialURL();
      if (cancelled) return;

      if (url && isPdfIntent(url)) {
        setPendingPdf(url);
        router.replace("/(tabs)/reader");
        return;
      }

      // 3. Not a PDF intent — show the real 404 UI
      if (!cancelled) setShowError(true);
    }

    checkAndRedirect();
    return () => { cancelled = true; };
  }, []);

  if (!showError) {
    // Transparent spinner while we decide where to go
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  // Real 404 — a route that genuinely doesn't exist in the app
  return (
    <View style={styles.error}>
      <ActivityIndicator color="#7c3aed" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0d0b1e",
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    flex: 1,
    backgroundColor: "#0d0b1e",
    alignItems: "center",
    justifyContent: "center",
  },
});
