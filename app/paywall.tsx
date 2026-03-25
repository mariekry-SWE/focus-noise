import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { configureRevenueCat, isExpoGoRuntime } from "@/lib/revenuecat";

export default function PaywallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { refreshCustomerInfo } = useRevenueCat();
  const [loading, setLoading] = useState(false);
  const hasPresentedRef = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerBack,
            pressed && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.headerBackText}>Tillbaka</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const openPaywall = useCallback(async () => {
    try {
      if (isExpoGoRuntime()) {
        Alert.alert(
          "Paywall kraver development build",
          "RevenueCat-paywall fungerar inte fullt ut i Expo Go. Kor en dev build (npx expo run:ios / run:android eller EAS dev build).",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }
      setLoading(true);
      await configureRevenueCat();
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          await refreshCustomerInfo();
          router.back();
          return;
        case PAYWALL_RESULT.NOT_PRESENTED:
          Alert.alert(
            "Ingen betalvagg",
            "Kontrollera att en paywall/offering ar konfigurerad som Current i RevenueCat.",
            [{ text: "OK", onPress: () => router.back() }],
          );
          return;
        case PAYWALL_RESULT.ERROR:
          Alert.alert("Fel vid kop", "Kunde inte visa betalvaggen.", [
            { text: "OK", onPress: () => router.back() },
          ]);
          return;
        case PAYWALL_RESULT.CANCELLED:
        default:
          router.back();
          return;
      }
    } catch (error: unknown) {
      console.warn("[Paywall] error", error);
      const message =
        error != null && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Nagot gick fel.";
      Alert.alert("Fel vid kop", message, [{ text: "OK", onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [refreshCustomerInfo, router]);

  useEffect(() => {
    if (hasPresentedRef.current) return;
    hasPresentedRef.current = true;
    void openPaywall();
  }, [openPaywall]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Uppgradera Focus Noise</Text>
        <Text style={styles.subtitle}>
          Las upp alla ljud och spela upp till 8 timmar per session.
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" style={styles.spinner} />
      ) : (
        <View style={styles.actions}>
          <Pressable
            onPress={() => void openPaywall()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Visa premiumalternativ</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.footer}>
        <Pressable
          onPress={async () => {
            try {
              if (isExpoGoRuntime()) {
                Alert.alert(
                  "Restore kraver development build",
                  "Aterstall kop fungerar inte fullt ut i Expo Go.",
                );
                return;
              }
              setLoading(true);
              await configureRevenueCat();
              await Purchases.restorePurchases();
              await refreshCustomerInfo();
              Alert.alert("Klart", "Dina kop har aterstallts.");
            } catch (error: unknown) {
              console.warn("[RestorePurchases] error", error);
              const message =
                error != null && typeof error === "object" && "message" in error
                  ? String((error as { message?: string }).message)
                  : "Nagot gick fel.";
              Alert.alert("Kunde inte aterstalla kop", message);
            } finally {
              setLoading(false);
            }
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Aterstall kop</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Tillbaka</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginTop: 8,
  },
  spinner: {
    marginVertical: 24,
  },
  actions: {
    gap: 16,
  },
  footer: {
    gap: 12,
  },
  headerBack: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  headerBackText: {
    fontSize: 17,
    color: "#2563EB",
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
});
