import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pdf from "react-native-pdf";

const C = {
  bg: "#0d0b1e",
  surface: "#13112a",
  card: "#1a1738",
  border: "#2a2550",
  primary: "#7c3aed",
  text: "#f0eeff",
  muted: "#8b85a8",
  white: "#ffffff",
  error: "#ef4444",
};

export default function ReaderScreen() {
  const insets = useSafeAreaInsets();
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function pickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setPdfUri(asset.uri);
        setFileName(asset.name ?? "documento.pdf");
        setPage(1);
        setTotal(0);
        setErrorMsg("");
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      setErrorMsg("No se pudo abrir el selector. Intenta de nuevo.");
    }
  }

  function reset() {
    setPdfUri(null);
    setFileName("");
    setPage(1);
    setTotal(0);
    setLoading(false);
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
            {pdfUri ? fileName : "Funciona sin internet"}
          </Text>
        </View>
        {pdfUri && (
          <TouchableOpacity onPress={reset} style={styles.resetBtn}>
            <Feather name="x" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Idle — no file selected */}
      {!pdfUri && (
        <TouchableOpacity
          style={styles.dropZone}
          onPress={pickPdf}
          activeOpacity={0.75}
        >
          <View style={styles.dropIcon}>
            <Feather name="file-text" size={36} color={C.primary} />
          </View>
          <Text style={styles.dropTitle}>Abrir PDF</Text>
          <Text style={styles.dropSub}>Sin conexión a internet</Text>
          <View style={styles.dropBtn}>
            <Text style={styles.dropBtnText}>Seleccionar archivo</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Error (only when no PDF loaded) */}
      {!pdfUri && errorMsg !== "" && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color={C.white} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* PDF viewer */}
      {pdfUri && (
        <View style={styles.viewerContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={styles.loadingText}>Cargando PDF...</Text>
            </View>
          )}

          <Pdf
            source={{ uri: pdfUri, cache: false }}
            onLoadComplete={(numberOfPages) => {
              setTotal(numberOfPages);
              setLoading(false);
            }}
            onPageChanged={(p) => setPage(p)}
            onError={() => {
              setLoading(false);
              setErrorMsg("No se pudo renderizar este PDF.");
              setPdfUri(null);
            }}
            style={styles.pdf}
            trustAllCerts={false}
            spacing={8}
            fitPolicy={0}
          />

          {/* Page indicator */}
          {total > 0 && (
            <View style={[styles.pageBar, { paddingBottom: insets.bottom + 64 }]}>
              <Text style={styles.pageLabel}>
                Página {page} de {total}
              </Text>
            </View>
          )}
        </View>
      )}

      {!pdfUri && (
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.error,
  },
  errorText: { fontSize: 13, color: C.white, flex: 1 },
  viewerContainer: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    gap: 12,
  },
  loadingText: { fontSize: 15, color: C.muted },
  pdf: {
    flex: 1,
    backgroundColor: C.bg,
  },
  pageBar: {
    paddingTop: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  pageLabel: { fontSize: 14, fontWeight: "600", color: C.muted },
  footer: { textAlign: "center", fontSize: 11, color: C.muted, paddingTop: 6 },
});
