"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "pos-kds-kitchen-mode";

type KdsModeContextValue = {
  kitchenMode: boolean;
  setKitchenMode: (enabled: boolean) => void;
  toggleKitchenMode: () => void;
};

const KdsModeContext = createContext<KdsModeContextValue | null>(null);

export function KdsModeProvider({ children }: { children: ReactNode }) {
  const [kitchenMode, setKitchenModeState] = useState(false);

  useEffect(() => {
    try {
      setKitchenModeState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setKitchenModeState(false);
    }
  }, []);

  const setKitchenMode = useCallback((enabled: boolean) => {
    setKitchenModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleKitchenMode = useCallback(() => {
    setKitchenModeState((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ kitchenMode, setKitchenMode, toggleKitchenMode }),
    [kitchenMode, setKitchenMode, toggleKitchenMode],
  );

  return <KdsModeContext.Provider value={value}>{children}</KdsModeContext.Provider>;
}

export function useKdsMode() {
  const context = useContext(KdsModeContext);
  if (!context) {
    throw new Error("useKdsMode must be used within KdsModeProvider");
  }
  return context;
}
