/**
 * Minimal mock Print Agent for local API contract testing (Node 18+).
 *   node tools/print-agent/mock-agent-server.mjs
 */

import http from "node:http";

const PORT = 9188;
const ALLOW_ALL_ORIGINS = true;
const ALLOWED_ORIGINS = [
  "https://market.trusttechlimited.com",
  "https://sabina.trusttechlimited.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function corsOrigin(origin) {
  if (ALLOW_ALL_ORIGINS) {
    return origin || "*";
  }
  if (!origin) return ALLOWED_ORIGINS[0];
  return ALLOWED_ORIGINS.find((o) => o.toLowerCase() === origin.toLowerCase()) ?? null;
}

const server = http.createServer((req, res) => {
  const origin = corsOrigin(req.headers.origin);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const path = (req.url ?? "/").replace(/\/$/, "") || "/";

  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  };

  if (path === "/health" && req.method === "GET") {
    send(200, { ok: true, version: "1.0.3-mock" });
    return;
  }

  if (path === "/printers" && req.method === "GET") {
    send(200, { printers: ["Mock-Kitchen", "Mock-Receipt"] });
    return;
  }

  if (path === "/config" && req.method === "GET") {
    send(200, {
      port: PORT,
      kitchenPrinterName: "Mock-Kitchen",
      receiptPrinterName: "Mock-Receipt",
    });
    return;
  }

  if (path === "/print" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.printerName || !payload.html) {
          send(400, { ok: false, error: "printerName and html are required" });
          return;
        }
        send(200, { ok: true });
      } catch {
        send(400, { ok: false, error: "Invalid JSON" });
      }
    });
    return;
  }

  send(404, { ok: false, error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock Print Agent listening on http://127.0.0.1:${PORT}`);
});
