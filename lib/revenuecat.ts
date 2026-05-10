import Purchases, { LOG_LEVEL, type CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const ENTITLEMENT_ID = "focus Premium";

type RevenueCatExtra = {
  revenueCatIosApiKey?: string;
  revenueCatAndroidApiKey?: string;
};

let isConfigured = false;
let warnedMissingApiKey = false;
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

function getExtra(): RevenueCatExtra {
  const extra = Constants.expoConfig?.extra as RevenueCatExtra | undefined;
  return extra ?? {};
}

function getRevenueCatApiKey(): string {
  const { revenueCatIosApiKey, revenueCatAndroidApiKey } = getExtra();
  const ios = revenueCatIosApiKey?.trim();
  const android = revenueCatAndroidApiKey?.trim();

  if (Platform.OS === "android") {
    return android || ios || "";
  }
  return ios || android || "";
}

export function isExpoGoRuntime() {
  return IS_EXPO_GO;
}

export async function configureRevenueCat(userId?: string) {
  if (IS_EXPO_GO) return;
  if (isConfigured) return;

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    if (!warnedMissingApiKey) {
      warnedMissingApiKey = true;
      console.warn(
        "[RevenueCat] Missing API key. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (and Android if needed) in .env or EAS env.",
      );
    }
    return;
  }

  if (!__DEV__ && apiKey.startsWith("test_")) {
    console.warn(
      "[RevenueCat] Release build is using a test (sandbox) API key. Set production EXPO_PUBLIC_REVENUECAT_* keys before App Store / Play release.",
    );
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

  Purchases.configure({
    apiKey,
    appUserID: userId,
  });
  isConfigured = true;
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (IS_EXPO_GO) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.warn("[RevenueCat] getCustomerInfo error", error);
    return null;
  }
}

export function hasFocusUnlimited(
  info: CustomerInfo | null | undefined,
): boolean {
  if (!info) return false;
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  return !!entitlement;
}
