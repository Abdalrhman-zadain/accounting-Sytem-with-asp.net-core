function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isPrivateIpv4Host(hostname: string) {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }

  const match = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function isDirectDevHost(hostname: string) {
  return isLoopbackHost(hostname) || isPrivateIpv4Host(hostname);
}

function buildBrowserLocalApiBase(hostname: string) {
  return `${window.location.protocol}//${hostname}:3007/api`;
}

function resolveConfiguredBrowserBase(configuredBaseUrl: string, currentHostname: string) {
  try {
    const url = new URL(configuredBaseUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    const search = url.search || "";
    const port = url.port || "3007";

    if (isLoopbackHost(url.hostname)) {
      if (isLoopbackHost(currentHostname)) {
        return trimTrailingSlashes(configuredBaseUrl);
      }

      if (isDirectDevHost(currentHostname)) {
        return `${window.location.protocol}//${currentHostname}:${port}${pathname}${search}`;
      }

      // Custom hostnames (e.g. Tailscale `web`) must not call client-side localhost.
      // Use the Next.js `/api` rewrite so requests stay on the dev machine.
      return "/api";
    }
  } catch {
    return trimTrailingSlashes(configuredBaseUrl);
  }

  return trimTrailingSlashes(configuredBaseUrl);
}

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (typeof window !== "undefined") {
    const currentHostname = window.location.hostname;

    if (configuredBaseUrl) {
      return resolveConfiguredBrowserBase(configuredBaseUrl, currentHostname);
    }

    if (isDirectDevHost(currentHostname)) {
      return buildBrowserLocalApiBase(currentHostname);
    }

    return "/api";
  }

  if (configuredBaseUrl) {
    return trimTrailingSlashes(configuredBaseUrl);
  }

  return "http://localhost:3007/api";
}
