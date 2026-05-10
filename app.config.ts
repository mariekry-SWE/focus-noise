import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * RevenueCat public SDK keys (safe to ship in the client).
 * Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
 * for production (appl_… / goog_…). If unset, the sandbox test key below is used for local dev.
 */
const SANDBOX_IOS_KEY_FALLBACK = "test_bBJToVSxCRnrtdvBuVcterYKYZM";

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosFromEnv = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const androidFromEnv = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();

  const revenueCatIosApiKey = iosFromEnv || SANDBOX_IOS_KEY_FALLBACK;
  const revenueCatAndroidApiKey = androidFromEnv || revenueCatIosApiKey;

  const baseExtra =
    typeof config.extra === "object" && config.extra !== null && !Array.isArray(config.extra)
      ? config.extra
      : {};

  return {
    ...config,
    extra: {
      ...baseExtra,
      revenueCatIosApiKey,
      revenueCatAndroidApiKey,
    },
  } as ExpoConfig;
};
