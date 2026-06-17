import { getApiBaseUrl } from "@/lib/config/api";

export class QzTrayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "QzTrayApiError";
  }
}

export async function fetchQzCertificate(token: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/qz/certificate`, {
    cache: "no-store",
    headers: {
      Accept: "text/plain",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new QzTrayApiError(
      response.status === 503
        ? "QZ signing is not configured on the server."
        : `Unable to load QZ certificate (${response.status}).`,
      response.status,
    );
  }

  return response.text();
}

export async function signQzMessage(token: string, request: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/qz/sign`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "text/plain",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ request }),
  });

  if (!response.ok) {
    throw new QzTrayApiError(
      response.status === 503
        ? "QZ signing is not configured on the server."
        : `Unable to sign QZ request (${response.status}).`,
      response.status,
    );
  }

  return response.text();
}

export async function downloadQzCertificate(token: string): Promise<void> {
  const certificate = await fetchQzCertificate(token);
  const blob = new Blob([certificate], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "digital-certificate.txt";
  link.click();
  URL.revokeObjectURL(url);
}

export async function isQzSigningAvailable(token: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const certificate = await fetchQzCertificate(token);
    return certificate.trim().length > 0;
  } catch (error) {
    if (error instanceof QzTrayApiError && error.status === 503) {
      return false;
    }
    return false;
  }
}
