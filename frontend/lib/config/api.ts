export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  // If a specific non-localhost URL is configured, use it.
  if (configuredBaseUrl && !configuredBaseUrl.includes("localhost")) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    // In the browser, if we are not on localhost, use relative path to go through the proxy.
    // This is the most portable approach for Nginx/production setups.
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return "/api";
    }
    return `http://${window.location.hostname}:3007/api`;
  }

  // On the server (SSR), use localhost to talk to the backend directly.
  return "http://localhost:3007/api";
}
