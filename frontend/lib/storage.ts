import type { AuthUser } from "@/types/api";

const TOKEN_KEY = "simple-account-access-token";
const USER_KEY = "simple-account-user";
const EXPIRES_KEY = "simple-account-session-expires";
export const AUTH_SESSION_CLEARED_EVENT = "simple-account:session-cleared";
export const AUTH_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function isBrowser() {
  return typeof window !== "undefined";
}

function decodeJwtPayload(token: string) {
  const segment = token.split(".")[1];
  if (!segment) {
    return null;
  }

  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function getTokenExpiryMs(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return null;
  }

  return payload.exp * 1000;
}

function readStoredExpiryMs() {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(EXPIRES_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isStoredTokenExpired(token: string) {
  const storedExpiry = readStoredExpiryMs();
  if (storedExpiry !== null) {
    return Date.now() >= storedExpiry;
  }

  const tokenExpiry = getTokenExpiryMs(token);
  if (tokenExpiry === null) {
    return true;
  }

  return Date.now() >= tokenExpiry;
}

export function readStoredSession() {
  if (!isBrowser()) {
    return { token: null, user: null };
  }

  const token = loadStoredToken();
  const user = loadStoredUser();

  if (!token && !user) {
    return { token: null, user: null };
  }

  if (!token || !user || isStoredTokenExpired(token)) {
    clearSession();
    return { token: null, user: null };
  }

  return { token, user };
}

export function loadStoredToken() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function loadStoredUser() {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistSession(token: string, user: AuthUser, expiresAt?: string | number) {
  if (!isBrowser()) {
    return;
  }

  const resolvedExpiry =
    typeof expiresAt === "string"
      ? Date.parse(expiresAt)
      : typeof expiresAt === "number"
        ? expiresAt
        : getTokenExpiryMs(token);

  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(
    EXPIRES_KEY,
    String(resolvedExpiry && Number.isFinite(resolvedExpiry) ? resolvedExpiry : Date.now() + AUTH_SESSION_TTL_MS),
  );
}

function clearSessionStorage() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(EXPIRES_KEY);
}

export function clearSession() {
  if (!isBrowser()) {
    return;
  }

  clearSessionStorage();
  window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
}
