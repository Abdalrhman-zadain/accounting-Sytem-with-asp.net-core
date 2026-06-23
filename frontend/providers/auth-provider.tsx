"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  AUTH_SESSION_CLEARED_EVENT,
  clearSession,
  persistSession,
  readStoredSession,
} from "@/lib/storage";
import type { AuthUser } from "@/types/api";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser, expiresAt?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function shouldRedirectToLogin() {
  if (typeof window === "undefined") {
    return false;
  }

  const path = window.location.pathname;
  return path !== "/login" && path !== "/register";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const applySession = useCallback((session: { token: string | null; user: AuthUser | null }) => {
    setToken(session.token);
    setUser(session.user);
  }, []);

  const syncStoredSession = useCallback(() => {
    const session = readStoredSession();
    applySession(session);
    return session;
  }, [applySession]);

  useLayoutEffect(() => {
    syncStoredSession();
    setIsHydrated(true);
  }, [syncStoredSession]);

  useEffect(() => {
    function handleSessionCleared() {
      applySession({ token: null, user: null });
    }

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
    return () => {
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
    };
  }, [applySession]);

  useEffect(() => {
    if (!token) {
      return;
    }

    function enforceSessionLimit() {
      const session = readStoredSession();
      if (session.token) {
        return;
      }

      applySession({ token: null, user: null });
      if (shouldRedirectToLogin()) {
        window.location.assign("/login");
      }
    }

    enforceSessionLimit();
    const intervalId = window.setInterval(enforceSessionLimit, 60_000);
    window.addEventListener("focus", enforceSessionLimit);
    document.addEventListener("visibilitychange", enforceSessionLimit);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", enforceSessionLimit);
      document.removeEventListener("visibilitychange", enforceSessionLimit);
    };
  }, [applySession, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isHydrated,
      isAuthenticated: Boolean(token && user),
      setSession(nextToken, nextUser, expiresAt) {
        setToken(nextToken);
        setUser(nextUser);
        persistSession(nextToken, nextUser, expiresAt);
      },
      logout() {
        setToken(null);
        setUser(null);
        clearSession();
      },
    }),
    [isHydrated, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
