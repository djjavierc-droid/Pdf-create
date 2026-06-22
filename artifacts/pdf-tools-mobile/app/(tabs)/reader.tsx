import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";

type LoadState = "idle" | "loading" | "loaded" | "error";

const VIEWER_HTML = require("../../assets/pdfjs/viewer.html");

export default function ReaderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [pdfBase64, setPdfBase64] = useState<string>("");
  const [viewerReady, setViewerReady] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [scale, setScale] = useState<number>(1.5);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  async function pickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setFileName(asset.name ?? "documento.pdf");
      setLoadState("loading");
      setCurrentPage(1);
      setTotalPages(0);
      setViewerReady(false);

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setPdfBase64(base64);
      setLoadState("loaded");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setErrorMsg("No se pudo abrir el PDF. Inténtalo de nuevo.");
      setLoadState("error");
    }
  }

  function onWebViewReady() {
    setViewerReady(true);
    if (pdfBase64) {
      webViewRef.current?.injectJavaScript(`window.loadPdf('${pdfBase64}'); true;`);
    }
  }

  function onWebViewMessage(event: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "ready") {
        onWebViewReady();
      } else if (msg.type === "pageChanged") {
        setCurrentPage(msg.page);
        setTotalPages(msg.total);
      }
    } catch {}
  }

  function goNext() {
    if (currentPage >= totalPages) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript(
      `window.goToPage(${currentPage + 1}); true;`
    );
  }

  function goPrev() {
    if (currentPage <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webViewRef.current?.injectJavaScript(
      `window.goToPage(${currentPage - 1}); true;`
    );
  }

  function zoomIn() {
    const s = Math.min(scale + 0.25, 3.0);
    setScale(s);
    webViewRef.current?.injectJavaScript(`window.setScale(${s}); true;`);
  }

  function zoomOut() {
    const s = Math.max(scale - 0.25, 0.5);
    setScale(s);
    webViewRef.current?.injectJavaScript(`window.setScale(${s}); true;`);
  }

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Lector de PDF</Text>
        {loadState === "loaded" ? (
          <Text style={styles.subtitle} numberOfLines={1}>{fileName}</Text>
        ) : (
          <Text style={styles.subtitle}>Selecciona un archivo PDF para leerlo</Text>
        )}
      </View>

      {loadState === "idle" && (
        <Pressable
          testID="button-pick-pdf"
          style={({ pressed }) => [styles.dropZone, pressed && { opacity: 0.7 }]}
          onPress={pickPdf}
        >
          <View style={styles.dropZoneIcon}>
            <Feather name="file-text" size={40} color={colors.primary} />
          </View>
          <Text style={styles.dropZoneTitle}>Abrir PDF</Text>
          <Text style={styles.dropZoneSubtitle}>Toca para seleccionar un archivo</Text>
        </Pressable>
      )}

      {loadState === "loading" && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando PDF...</Text>
        </View>
      )}

      {loadState === "error" && (
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={40} color={colors.destructive} />
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity
            testID="button-retry"
            style={styles.retryBtn}
            onPress={() => { setLoadState("idle"); setErrorMsg(""); }}
          >
            <Text style={styles.retryBtnText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadState === "loaded" && (
        <>
          <View style={styles.toolbar}>
            <TouchableOpacity
              testID="button-open-new"
              style={styles.toolbarBtn}
              onPress={() => { setLoadState("idle"); setPdfBase64(""); setViewerReady(false); }}
            >
              <Feather name="folder" size={18} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.zoomControls}>
              <TouchableOpacity
                testID="button-zoom-out"
                style={styles.toolbarBtn}
                onPress={zoomOut}
                disabled={scale <= 0.5}
              >
                <Feather name="zoom-out" size={18} color={scale <= 0.5 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
              <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
              <TouchableOpacity
                testID="button-zoom-in"
                style={styles.toolbarBtn}
                onPress={zoomIn}
                disabled={scale >= 3.0}
              >
                <Feather name="zoom-in" size={18} color={scale >= 3.0 ? colors.mutedForeground : colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.webViewContainer}>
            <WebView
              ref={webViewRef}
              source={VIEWER_HTML}
              style={styles.webView}
              onMessage={onWebViewMessage}
              javaScriptEnabled
              originWhitelist={["*"]}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              scrollEnabled
              showsVerticalScrollIndicator={false}
              onLoad={() => {
                if (!viewerReady && pdfBase64) {
                  webViewRef.current?.injectJavaScript(
                    `window.loadPdf('${pdfBase64}'); true;`
                  );
                }
              }}
            />
          </View>

          <View style={[styles.pageControls, { paddingBottom: bottomPad + 60 }]}>
            <TouchableOpacity
              testID="button-prev-page"
              style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
              onPress={goPrev}
              disabled={currentPage <= 1}
            >
              <Feather name="chevron-left" size={22} color={currentPage <= 1 ? colors.mutedForeground : colors.primary} />
            </TouchableOpacity>
            <Text testID="text-page-counter" style={styles.pageCounter}>
              {totalPages > 0 ? `${currentPage} / ${totalPages}` : "—"}
            </Text>
            <TouchableOpacity
              testID="button-next-page"
              style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
              onPress={goNext}
              disabled={currentPage >= totalPages}
            >
              <Feather name="chevron-right" size={22} color={currentPage >= totalPages ? colors.mutedForeground : colors.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {loadState !== "loaded" && (
        <Text testID="text-footer" style={[styles.footer, { paddingBottom: bottomPad + 60 }]}>
          Desarrollada por Javier Soto
        </Text>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    title: { fontSize: 26, fontWeight: "700", color: colors.foreground, marginBottom: 4 },
    subtitle: { fontSize: 14, color: colors.mutedForeground },
    dropZone: {
      margin: 20, flex: 1, borderWidth: 2, borderColor: colors.primary,
      borderStyle: "dashed", borderRadius: 16, alignItems: "center",
      justifyContent: "center", backgroundColor: colors.secondary, padding: 40,
    },
    dropZoneIcon: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center", marginBottom: 16,
    },
    dropZoneTitle: { fontSize: 18, fontWeight: "600", color: colors.foreground, marginBottom: 6 },
    dropZoneSubtitle: { fontSize: 13, color: colors.mutedForeground },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
    loadingText: { fontSize: 16, color: colors.mutedForeground },
    errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
    errorTitle: { fontSize: 18, fontWeight: "600", color: colors.foreground },
    errorMsg: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
    retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 12 },
    retryBtnText: { fontSize: 14, fontWeight: "600", color: colors.primaryForeground },
    toolbar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
    },
    toolbarBtn: {
      width: 38, height: 38, borderRadius: 10, backgroundColor: colors.muted,
      alignItems: "center", justifyContent: "center",
    },
    zoomControls: { flexDirection: "row", alignItems: "center", gap: 8 },
    scaleText: { fontSize: 13, color: colors.foreground, minWidth: 44, textAlign: "center" },
    webViewContainer: { flex: 1 },
    webView: { flex: 1, backgroundColor: "#1e1e2e" },
    pageControls: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 20, paddingTop: 12, paddingHorizontal: 20,
      backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
    },
    pageBtn: {
      width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary,
      alignItems: "center", justifyContent: "center",
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageCounter: { fontSize: 15, fontWeight: "600", color: colors.foreground, minWidth: 60, textAlign: "center" },
    footer: { textAlign: "center", fontSize: 12, color: colors.mutedForeground, paddingVertical: 10 },
  });
}
