import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const C = {
  bg: "#0d0b1e",
  surface: "#13112a",
  card: "#1a1738",
  border: "#2a2550",
  primary: "#7c3aed",
  primaryLight: "#9f67fa",
  text: "#f0eeff",
  muted: "#8b85a8",
  white: "#ffffff",
  error: "#ef4444",
  webBg: "#111827",
};

const VIEWER = require("../../assets/pdfjs/viewer.html");

type LoadState = "idle" | "picking" | "loaded" | "error";

export default function ReaderScreen() {
  const insets = useSafeAreaInsets();
  const wvRef = useRef<WebView>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [fileName, setFileName] = useState("");
  const [pdfB64, setPdfB64] = useState("");
  const [viewerReady, setViewerReady] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [errorMsg, setErrorMsg] = useState("");

  async function pickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setFileName(asset.name ?? "documento.pdf");
      setLoadState("picking");
      setPage(1);
      setTotal(0);
      setViewerReady(false);
      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfB64(b64);
      setLoadState("loaded");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setErrorMsg("No se pudo abrir el archivo.");
      setLoadState("error");
    }
  }

  function injectPdf(b64: string) {
    wvRef.current?.injectJavaScript(`window.loadPdf('${b64}'); true;`);
  }

  function onMessage(e: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") {
        setViewerReady(true);
        if (pdfB64) injectPdf(pdfB64);
      } else if (msg.type === "pageChanged") {
        setPage(msg.page);
        setTotal(msg.total);
      }
    } catch {}
  }

  function prevPage() {
    if (page <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    wvRef.current?.injectJavaScript(`window.goToPage(${page - 1}); true;`);
  }

  function nextPage() {
    if (page >= total) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    wvRef.current?.injectJavaScript(`window.goToPage(${page + 1}); true;`);
  }

  function zoomIn() {
    const s = Math.min(scale + 0.25, 3.0);
    setScale(s);
    wvRef.current?.injectJavaScript(`window.setScale(${s}); true;`);
  }

  function zoomOut() {
    const s = Math.max(scale - 0.25, 0.5);
    setScale(s);
    wvRef.current?.injectJavaScript(`window.setScale(${s}); true;`);
  }

  function reset() {
    setLoadState("idle");
    setPdfB64("");
    setViewerReady(false);
    setPage(1);
    setTotal(0);
    setErrorMsg("");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Feather name="book-open" size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Lector de PDF</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {loadState === "loaded" ? fileName : "Sin conexión a internet"}
          </Text>
        </View>
        {loadState === "loaded" && (
          <TouchableOpacity onPress={reset} style={styles.resetBtn}>
            <Feather name="x" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Idle state */}
      {loadState === "idle" && (
        <Pressable
          style={({ pressed }) => [styles.dropZone, pressed && { opacity: 0.75 }]}
          onPress={pickPdf}
        >
          <View style={styles.dropIcon}>
            <Feather name="file-text" size={36} color={C.primary} />
          </View>
          <Text style={styles.dropTitle}>Abrir PDF</Text>
          <Text style={styles.dropSub}>Funciona sin conexión a internet</Text>
          <View style={styles.dropBtn}>
            <Text style={styles.dropBtnText}>Seleccionar archivo</Text>
          </View>
        </Pressable>
      )}

      {/* Loading */}
      {loadState === "picking" && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Cargando PDF...</Text>
        </View>
      )}

      {/* Error */}
      {loadState === "error" && (
        <View style={styles.centerBox}>
          <Feather name="alert-triangle" size={40} color={C.error} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setLoadState("idle")}>
            <Text style={styles.retryText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PDF viewer */}
      {loadState === "loaded" && (
        <>
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.toolBtn, scale <= 0.5 && styles.toolBtnDim]}
              onPress={zoomOut}
              disabled={scale <= 0.5}
            >
              <Feather name="zoom-out" size={18} color={scale <= 0.5 ? C.muted : C.primaryLight} />
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{Math.round(scale * 100)}%</Text>
            <TouchableOpacity
              style={[styles.toolBtn, scale >= 3.0 && styles.toolBtnDim]}
              onPress={zoomIn}
              disabled={scale >= 3.0}
            >
              <Feather name="zoom-in" size={18} color={scale >= 3.0 ? C.muted : C.primaryLight} />
            </TouchableOpacity>
          </View>

          {/* WebView */}
          <WebView
            ref={wvRef}
            source={VIEWER}
            style={styles.webview}
            onMessage={onMessage}
            javaScriptEnabled
            originWhitelist={["*"]}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            scrollEnabled
            showsVerticalScrollIndicator={false}
            onLoad={() => {
              if (!viewerReady && pdfB64) {
                injectPdf(pdfB64);
              }
            }}
          />

          {/* Page controls */}
          <View style={[styles.pageBar, { paddingBottom: insets.bottom + 62 }]}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDim]}
              onPress={prevPage}
              disabled={page <= 1}
            >
              <Feather name="chevron-left" size={22} color={page <= 1 ? C.muted : C.primary} />
            </TouchableOpacity>
            <Text style={styles.pageLabel}>
              {total > 0 ? `${page} / ${total}` : "—"}
            </Text>
            <TouchableOpacity
              style={[styles.pageBtn, page >= total && styles.pageBtnDim]}
              onPress={nextPage}
              disabled={page >= total}
            >
              <Feather name="chevron-right" size={22} color={page >= total ? C.muted : C.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {loadState !== "loaded" && (
        <Text style={[styles.footer, { paddingBottom: insets.bottom + 70 }]}>
          Desarrollada por Javier Soto
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 1 },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dropZone: {
    flex: 1,
    margin: 20,
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: "dashed",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    gap: 12,
  },
  dropIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  dropTitle: { fontSize: 18, fontWeight: "600", color: C.text },
  dropSub: { fontSize: 13, color: C.muted },
  dropBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: C.primary,
    borderRadius: 14,
  },
  dropBtnText: { fontSize: 15, fontWeight: "600", color: C.white },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  loadingText: { fontSize: 16, color: C.muted },
  errorTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  errorMsg: { fontSize: 13, color: C.muted, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.primary,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: C.white },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnDim: { opacity: 0.4 },
  zoomLabel: { fontSize: 14, fontWeight: "600", color: C.text, minWidth: 50, textAlign: "center" },
  webview: { flex: 1, backgroundColor: C.webBg },
  pageBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDim: { opacity: 0.4 },
  pageLabel: { fontSize: 16, fontWeight: "700", color: C.text, minWidth: 64, textAlign: "center" },
  footer: { textAlign: "center", fontSize: 11, color: C.muted, paddingTop: 6 },
});
