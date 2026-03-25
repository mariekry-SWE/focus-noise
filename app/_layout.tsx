import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureRevenueCat } from "@/lib/revenuecat";
import { RevenueCatProvider } from "@/hooks/useRevenueCat";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await configureRevenueCat();
      } catch (error) {
        console.warn("Failed to configure RevenueCat", error);
      } finally {
        setReady(true);
      }
    }

    void init();
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <RevenueCatProvider>
        <Stack
          screenOptions={{
            title: "Focus Noise",
            headerShadowVisible: false,
            contentStyle: { flex: 1 },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="paywall" options={{ title: "Premium", headerShown: false }} />
        </Stack>
      </RevenueCatProvider>
    </SafeAreaProvider>
  );
}
