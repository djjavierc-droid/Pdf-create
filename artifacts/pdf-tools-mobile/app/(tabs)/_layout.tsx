import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
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
