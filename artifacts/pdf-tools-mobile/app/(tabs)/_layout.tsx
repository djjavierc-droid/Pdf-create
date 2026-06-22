import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

const PRIMARY = "#7c3aed";
const INACTIVE = "#6b7280";
const BG = "#0d0b1e";
const BORDER = "#1e1b35";

export default function TabLayout() {
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
          height: 60,
          paddingBottom: 8,
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
