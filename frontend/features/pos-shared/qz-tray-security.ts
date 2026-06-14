import { fetchQzCertificate, signQzMessage } from "@/lib/api/qz-tray";
import { loadStoredToken } from "@/lib/storage";

type QzSecurityApi = {
  security: {
    setSignatureAlgorithm: (algorithm: string) => void;
    setCertificatePromise: (
      handler: (resolve: (certificate: string) => void, reject: (error: unknown) => void) => void,
    ) => void;
    setSignaturePromise: (
      handler: (
        toSign: string,
      ) => (
        resolve: (signature: string) => void,
        reject: (error: unknown) => void,
      ) => void,
    ) => void;
  };
};

export const QZ_SKIP_SIGNING_STORAGE_KEY = "pos.qz.skip-signing.v1";

let qzSigningConfigured = false;
let qzSigningEnabled = false;

export function isQzSigningEnabled(): boolean {
  return qzSigningEnabled;
}

export function shouldSkipQzSigning(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(QZ_SKIP_SIGNING_STORAGE_KEY) === "1";
}

export function markSkipQzSigning(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(QZ_SKIP_SIGNING_STORAGE_KEY, "1");
  }
}

export function clearSkipQzSigning(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(QZ_SKIP_SIGNING_STORAGE_KEY);
  }
}

/** Configures QZ message signing when the backend exposes a certificate. */
export async function ensureQzSigningConfigured(qz: QzSecurityApi): Promise<boolean> {
  if (shouldSkipQzSigning()) {
    qzSigningConfigured = true;
    return false;
  }

  if (qzSigningConfigured) {
    return qzSigningEnabled;
  }

  qzSigningConfigured = true;

  if (!qz.security) {
    return false;
  }

  const token = loadStoredToken();
  if (!token) {
    return false;
  }

  try {
    await fetchQzCertificate(token);
  } catch {
    return false;
  }

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setCertificatePromise((resolve, reject) => {
    const activeToken = loadStoredToken();
    if (!activeToken) {
      reject(new Error("POS session token is missing."));
      return;
    }

    void fetchQzCertificate(activeToken).then(resolve).catch(reject);
  });
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    const activeToken = loadStoredToken();
    if (!activeToken) {
      reject(new Error("POS session token is missing."));
      return;
    }

    void signQzMessage(activeToken, toSign).then(resolve).catch(reject);
  });

  qzSigningEnabled = true;
  return true;
}
