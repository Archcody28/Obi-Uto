import { Tabs } from "expo-router";
import { Text, StyleSheet, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTheme } from "../../constants/theme";

// Text glyphs render reliably on Android without icon-font assets.
// The previous tab bar defined screens with no tabBarIcon, so every tab
// rendered as a blank slot on the physical device.
const GLYPHS: Record<string, string> = {
  home: "\u2302",
  search: "\u25CB",
  downloads: "\u2193",
  profile: "\u25C9",
};

function TabGlyph({ name, color }: { name: string; color?: any }) {
  const tint = color ? { color: color } : null;
  return <Text style={[styles.glyph, tint]}>{GLYPHS[name]}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: AppTheme.colors.backgroundElevated,
          borderTopColor: AppTheme.colors.border,
          borderTopWidth: 1,
          minHeight: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: AppTheme.colors.accent,
        tabBarInactiveTintColor: AppTheme.colors.textSubtle,
        tabBarIcon: ({ color }) => (
          <TabGlyph name={route.name} color={color} />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="downloads" options={{ title: "Downloads" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glyph: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: "center",
  },
});