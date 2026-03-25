import Purchases, { LOG_LEVEL, type CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";

const API_KEY = "test_bBJToVSxCRnrtdvBuVcterYKYZM";
export const ENTITLEMENT_ID = "focus Premium";
let isConfigured = false;
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";

export function isExpoGoRuntime() {
  return IS_EXPO_GO;
}

export async function configureRevenueCat(userId?: string) {
  if (IS_EXPO_GO) return;
  if (isConfigured) return;
  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({
    apiKey: API_KEY,
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
