import { createContext, useContext, useEffect, useState } from "react";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import { getCustomerInfoSafe, hasFocusUnlimited } from "@/lib/revenuecat";

type RevenueCatContextValue = {
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  refreshCustomerInfo: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatContextValue | undefined>(
  undefined,
);

export function RevenueCatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    async function load() {
      const info = await getCustomerInfoSafe();
      if (info) setCustomerInfo(info);
    }
    void load();

    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const isPro = hasFocusUnlimited(customerInfo);

  async function refreshCustomerInfo() {
    const info = await getCustomerInfoSafe();
    if (info) setCustomerInfo(info);
  }

  return (
    <RevenueCatContext.Provider
      value={{ customerInfo, isPro, refreshCustomerInfo }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error("useRevenueCat must be used within RevenueCatProvider");
  }
  return ctx;
}
