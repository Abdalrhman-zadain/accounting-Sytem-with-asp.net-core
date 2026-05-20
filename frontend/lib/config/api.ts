export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    // If we are on the production domain, use relative path to go through the proxy
    if (window.location.hostname === "sabina.trusttechlimited.com") {
      return "/api";
    }
    return `http://${window.location.hostname}:3003/api`;
  }

  return "http://localhost:3003/api";
}
