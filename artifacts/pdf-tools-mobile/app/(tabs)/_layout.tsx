import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIMARY = "#7c3aed";
const INACTIVE = "#6b7280";
const BG = "#0d0b1e";
const BORDER = "#1e1b35";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          // Add insets.bottom so the tab bar sits above on-screen nav buttons.
          // On gesture-nav devices insets.bottom ≈ 20-34 px (home indicator).
          // On button-nav devices insets.bottom ≈ 48 px (nav bar buttons).
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Convertir",
          tabBarIcon: ({ color }) => (
            <Feather name="file-plus" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reader"
        options={{
          title: "Leer PDF",
          tabBarIcon: ({ color }) => (
            <Feather name="book-open" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
