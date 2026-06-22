import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface SelectedImage {
  id: string;
  uri: string;
  base64: string | null | undefined;
  width: number;
  height: number;
}

type ConvertState = "idle" | "converting" | "done" | "error";

export default function ConverterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [state, setState] = useState<ConvertState>("idle");
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

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
      const newImages: SelectedImage[] = result.assets.map((asset) => ({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
        uri: asset.uri,
        base64: asset.base64,
        width: asset.width,
        height: asset.height,
      }));
      setImages((prev) => [...prev, ...newImages]);
      setPdfUri(null);
      setState("idle");
    }
  }

  function removeImage(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((prev) => prev.filter((img) => img.id !== id));
    setPdfUri(null);
    setState("idle");
  }

  function moveUp(index: number) {
    if (index === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index === images.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function convertToPdf() {
    if (images.length === 0) return;
    setState("converting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const pages = images
        .map((img) => {
          const src = img.base64
            ? `data:image/jpeg;base64,${img.base64}`
            : img.uri;
          return `<div style="width:100%;height:100vh;display:flex;align-items:center;justify-content:center;page-break-after:always;margin:0;padding:0;">
            <img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;" />
          </div>`;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; }
</style>
</head>
<body>${pages}</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setPdfUri(uri);
      setState("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setErrorMsg("Error al convertir. Inténtalo de nuevo.");
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

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Imágenes a PDF</Text>
        <Text style={styles.subtitle}>
          {images.length === 0
            ? "Selecciona las imágenes que quieres convertir"
            : `${images.length} imagen${images.length > 1 ? "es" : ""} seleccionada${images.length > 1 ? "s" : ""}`}
        </Text>
      </View>

      {images.length === 0 ? (
        <Pressable
          testID="button-pick-images"
          style={({ pressed }) => [styles.dropZone, pressed && { opacity: 0.7 }]}
          onPress={pickImages}
        >
          <View style={styles.dropZoneIcon}>
            <Feather name="upload-cloud" size={40} color={colors.primary} />
          </View>
          <Text style={styles.dropZoneTitle}>Seleccionar imágenes</Text>
          <Text style={styles.dropZoneSubtitle}>JPG, PNG, WebP, GIF</Text>
        </Pressable>
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View testID={`card-image-${item.id}`} style={styles.imageCard}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />
              <View style={styles.imageInfo}>
                <Text style={styles.imagePage}>Página {index + 1}</Text>
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    testID={`button-moveup-${item.id}`}
                    onPress={() => moveUp(index)}
                    style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]}
                    disabled={index === 0}
                  >
                    <Feather name="chevron-up" size={18} color={index === 0 ? colors.mutedForeground : colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`button-movedown-${item.id}`}
                    onPress={() => moveDown(index)}
                    style={[styles.iconBtn, index === images.length - 1 && styles.iconBtnDisabled]}
                    disabled={index === images.length - 1}
                  >
                    <Feather name="chevron-down" size={18} color={index === images.length - 1 ? colors.mutedForeground : colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`button-remove-${item.id}`}
                    onPress={() => removeImage(item.id)}
                    style={styles.iconBtn}
                  >
                    <Feather name="x" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={
            <TouchableOpacity
              testID="button-add-more"
              style={styles.addMoreBtn}
              onPress={pickImages}
            >
              <Feather name="plus" size={18} color={colors.primary} />
              <Text style={styles.addMoreText}>Agregar más imágenes</Text>
            </TouchableOpacity>
          }
        />
      )}

      {state === "error" && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color={colors.destructiveForeground} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {state === "done" && (
        <View testID="status-success" style={styles.successBanner}>
          <Feather name="check-circle" size={16} color={colors.successForeground} />
          <Text style={styles.successText}>PDF creado con éxito</Text>
        </View>
      )}

      <View style={styles.bottomActions}>
        {state === "done" ? (
          <View style={styles.doneRow}>
            <TouchableOpacity
              testID="button-download-pdf"
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={sharePdf}
            >
              <Feather name="download" size={18} color={colors.primaryForeground} />
              <Text style={styles.primaryBtnText}>Descargar PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="button-reset"
              style={styles.secondaryBtn}
              onPress={reset}
            >
              <Feather name="refresh-cw" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : state === "converting" ? (
          <View style={[styles.primaryBtn, styles.loadingBtn]}>
            <ActivityIndicator color={colors.primaryForeground} size="small" />
            <Text style={styles.primaryBtnText}>Convirtiendo...</Text>
          </View>
        ) : (
          images.length > 0 && (
            <TouchableOpacity
              testID="button-convert"
              style={[styles.primaryBtn, images.length === 0 && styles.primaryBtnDisabled]}
              onPress={convertToPdf}
              disabled={images.length === 0}
            >
              <Feather name="file-text" size={18} color={colors.primaryForeground} />
              <Text style={styles.primaryBtnText}>Convertir a PDF</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <Text testID="text-footer" style={styles.footer}>
        Desarrollada por Javier Soto
      </Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    dropZone: {
      margin: 20,
      flex: 1,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: "dashed",
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.secondary,
      padding: 40,
    },
    dropZoneIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    dropZoneTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 6,
    },
    dropZoneSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    imageCard: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    thumbnail: {
      width: 80,
      height: 80,
      resizeMode: "cover",
    },
    imageInfo: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      justifyContent: "space-between",
    },
    imagePage: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    imageActions: {
      flexDirection: "row",
      gap: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnDisabled: {
      opacity: 0.4,
    },
    addMoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 12,
      borderStyle: "dashed",
      marginTop: 4,
    },
    addMoreText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.destructive,
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.destructiveForeground,
      flex: 1,
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.success,
    },
    successText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.successForeground,
      flex: 1,
    },
    bottomActions: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    doneRow: {
      flexDirection: "row",
      gap: 10,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      gap: 8,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    loadingBtn: {
      opacity: 0.8,
    },
    primaryBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.primaryForeground,
    },
    secondaryBtn: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    footer: {
      textAlign: "center",
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      paddingVertical: 10,
    },
    success: {
      color: "#10b981",
    },
  });
}
