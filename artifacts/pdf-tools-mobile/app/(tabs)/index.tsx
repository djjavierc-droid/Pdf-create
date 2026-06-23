import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  bg: "#0d0b1e",
  surface: "#13112a",
  card: "#1a1738",
  border: "#2a2550",
  primary: "#7c3aed",
  primaryLight: "#9f67fa",
  text: "#f0eeff",
  muted: "#8b85a8",
  success: "#10b981",
  error: "#ef4444",
  white: "#ffffff",
};

interface Img {
  id: string;
  uri: string;
  base64: string | null | undefined;
}

type State = "idle" | "converting" | "done" | "error";

export default function ConverterScreen() {
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<Img[]>([]);
  const [state, setState] = useState<State>("idle");
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Pre-warm expo-print's internal WebView renderer on first mount.
  // On Android, the first call to printToFileAsync can hang for a long time
  // while the headless Chromium engine initializes. Calling it silently on
  // mount means the engine is ready by the time the user taps "Convertir".
  useEffect(() => {
    Print.printToFileAsync({ html: "<html><body></body></html>", base64: false })
      .catch(() => {});
  }, []);

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Se necesita permiso para acceder a la galería.");
      setState("error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newImgs: Img[] = result.assets.map((a) => ({
        id: Math.random().toString(36).slice(2),
        uri: a.uri,
        base64: a.base64,
      }));
      setImages((p) => [...p, ...newImgs]);
      setPdfUri(null);
      setState("idle");
    }
  }

  function remove(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((p) => p.filter((i) => i.id !== id));
    setPdfUri(null);
    setState("idle");
  }

  function move(index: number, dir: -1 | 1) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((p) => {
      const next = [...p];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function convert() {
    if (images.length === 0) return;
    setState("converting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const pages = images
        .map((img) => {
          const src = img.base64
            ? `data:image/jpeg;base64,${img.base64}`
            : img.uri;
          return `<div style="width:100%;height:100vh;display:flex;align-items:center;justify-content:center;page-break-after:always;background:#fff;margin:0;padding:0;">
            <img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;" />
          </div>`;
        })
        .join("");

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;}</style></head><body>${pages}</body></html>`;

      // Race the print call against a 30-second timeout.
      // printToFileAsync can hang indefinitely on first launch while Android
      // warms up its headless Chromium engine — the timeout unblocks the UI.
      const printPromise = Print.printToFileAsync({ html, base64: false });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 30000)
      );
      const { uri } = await Promise.race([printPromise, timeoutPromise]);

      setPdfUri(uri);
      setState("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const isTimeout = e instanceof Error && e.message === "timeout";
      setErrorMsg(
        isTimeout
          ? "El motor tardó en iniciar. Toca 'Convertir' de nuevo."
          : "Error al convertir. Inténtalo de nuevo."
      );
      setState("error");
    }
  }

  async function sharePdf() {
    if (!pdfUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Sharing.shareAsync(pdfUri, {
      mimeType: "application/pdf",
      dialogTitle: "Guardar PDF",
      UTI: "com.adobe.pdf",
    });
  }

  function reset() {
    setImages([]);
    setPdfUri(null);
    setState("idle");
    setErrorMsg("");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Feather name="file-plus" size={20} color={C.primary} />
        </View>
        <View>
          <Text style={styles.title}>Imágenes a PDF</Text>
          <Text style={styles.subtitle}>
            {images.length === 0
              ? "Selecciona imágenes para convertir"
              : `${images.length} imagen${images.length !== 1 ? "es" : ""} seleccionada${images.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      {/* Content */}
      {images.length === 0 ? (
        <Pressable
          style={({ pressed }) => [styles.dropZone, pressed && { opacity: 0.75 }]}
          onPress={pickImages}
        >
          <View style={styles.dropIcon}>
            <Feather name="image" size={36} color={C.primary} />
          </View>
          <Text style={styles.dropTitle}>Toca para seleccionar</Text>
          <Text style={styles.dropSub}>JPG · PNG · WebP · GIF</Text>
          <View style={styles.dropBtn}>
            <Text style={styles.dropBtnText}>Abrir galería</Text>
          </View>
        </Pressable>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={styles.imageCard}>
              <Image
                source={{
                  uri: item.base64
                    ? `data:image/jpeg;base64,${item.base64}`
                    : item.uri,
                }}
                style={styles.thumb}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardPage}>Página {index + 1}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    style={[styles.actionBtn, index === 0 && styles.actionBtnDim]}
                  >
                    <Feather name="chevron-up" size={16} color={index === 0 ? C.muted : C.primaryLight} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    style={[styles.actionBtn, index === images.length - 1 && styles.actionBtnDim]}
                  >
                    <Feather name="chevron-down" size={16} color={index === images.length - 1 ? C.muted : C.primaryLight} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item.id)} style={styles.actionBtn}>
                    <Feather name="trash-2" size={16} color={C.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.addMore} onPress={pickImages}>
              <Feather name="plus-circle" size={16} color={C.primary} />
              <Text style={styles.addMoreText}>Agregar más imágenes</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Status banners */}
      {state === "error" && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={15} color={C.white} />
          <Text style={styles.bannerText}>{errorMsg}</Text>
        </View>
      )}
      {state === "done" && (
        <View style={styles.successBanner}>
          <Feather name="check-circle" size={15} color={C.white} />
          <Text style={styles.bannerText}>¡PDF creado exitosamente!</Text>
        </View>
      )}

      {/* Bottom actions */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 70 }]}>
        {state === "done" ? (
          <View style={styles.doneRow}>
            <TouchableOpacity style={[styles.mainBtn, { flex: 1 }]} onPress={sharePdf}>
              <Feather name="download" size={18} color={C.white} />
              <Text style={styles.mainBtnText}>Guardar / Compartir PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={reset}>
              <Feather name="refresh-cw" size={18} color={C.primary} />
            </TouchableOpacity>
          </View>
        ) : state === "converting" ? (
          <View style={[styles.mainBtn, { opacity: 0.8 }]}>
            <ActivityIndicator color={C.white} size="small" />
            <Text style={styles.mainBtnText}>Convirtiendo...</Text>
          </View>
        ) : images.length > 0 ? (
          <TouchableOpacity style={styles.mainBtn} onPress={convert}>
            <Feather name="file-text" size={18} color={C.white} />
            <Text style={styles.mainBtnText}>Convertir a PDF</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={[styles.footer, { paddingBottom: insets.bottom + 68 }]}>
        Desarrollada por Javier Soto
      </Text>
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
  subtitle: { fontSize: 13, color: C.muted, marginTop: 1 },
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
  list: { padding: 16, gap: 10 },
  imageCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  thumb: { width: 80, height: 80, resizeMode: "cover" },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  cardPage: { fontSize: 14, fontWeight: "600", color: C.text },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDim: { opacity: 0.35 },
  addMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 4,
  },
  addMoreText: { fontSize: 14, color: C.primary },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.error,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.success,
  },
  bannerText: { fontSize: 13, color: C.white, flex: 1 },
  bottom: { paddingHorizontal: 16, paddingTop: 8 },
  doneRow: { flexDirection: "row", gap: 10 },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  mainBtnText: { fontSize: 16, fontWeight: "700", color: C.white },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: C.muted,
    paddingTop: 6,
  },
});
