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

let qzSigningConfigured = false;
let qzSigningEnabled = false;

export function isQzSigningEnabled(): boolean {
  return qzSigningEnabled;
}

/** Configures QZ message signing when the backend exposes a certificate. */
export async function ensureQzSigningConfigured(qz: QzSecurityApi): Promise<boolean> {
  if (qzSigningConfigured) {
    return qzSigningEnabled;
  }

  qzSigningConfigured = true;

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
