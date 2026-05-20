export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    // If we are on the production domain, use relative path to go through the proxy
    if (window.location.hostname === "sabina.trusttechlimited.com") {
      return "/api";
    }
    return `http://${window.location.hostname}:3007/api`;
  }
  return "http://localhost:3007/api";
}
