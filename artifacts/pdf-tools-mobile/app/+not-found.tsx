// When the app is opened from the file manager with a PDF intent,
// Expo Router cannot match the content:// URI to any route and lands here.
// _layout.tsx detects the initial URL and calls router.replace() to the reader.
// This screen just shows a dark spinner while that redirect happens.
// It must NOT attempt its own navigation — simultaneous router calls crash the app.
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#7c3aed" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0b1e",
    alignItems: "center",
    justifyContent: "center",
  },
});
