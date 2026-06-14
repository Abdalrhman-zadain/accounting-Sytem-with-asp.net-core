/**
 * Smoke-test the Print Agent HTTP API (run on Windows with the agent started).
 *
 *   node tools/print-agent/smoke-test-agent-api.mjs
 *
 * Optional base URL:
 *   node tools/print-agent/smoke-test-agent-api.mjs http://127.0.0.1:9188
 */

const base = process.argv[2] ?? "http://127.0.0.1:9188";

async function request(path, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { ok: response.ok, status: response.status, json };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`Testing Print Agent at ${base}`);

  const health = await request("/health");
  assert(health.ok, `GET /health failed (${health.status}): ${JSON.stringify(health.json)}`);
  assert(health.json?.ok === true, "GET /health ok flag missing");
  console.log("OK  GET /health", health.json);

  const printers = await request("/printers");
  assert(printers.ok, `GET /printers failed (${printers.status})`);
  assert(Array.isArray(printers.json?.printers), "GET /printers missing printers array");
  console.log("OK  GET /printers", printers.json.printers.length, "printer(s)");

  const config = await request("/config");
  assert(config.ok, `GET /config failed (${config.status})`);
  console.log("OK  GET /config", config.json);

  const cors = await fetch(`${base}/health`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://sabina.trusttechlimited.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Private-Network": "true",
    },
  });
  const allowOrigin = cors.headers.get("access-control-allow-origin");
  const allowPrivate = cors.headers.get("access-control-allow-private-network");
  assert(
    allowOrigin === "https://sabina.trusttechlimited.com",
    `CORS origin header missing/wrong: ${allowOrigin}`,
  );
  assert(allowPrivate === "true", `Private Network Access header missing: ${allowPrivate}`);
  console.log("OK  CORS + Private Network Access preflight for production origin");

  const firstPrinter = printers.json.printers[0];
  if (firstPrinter) {
    const print = await request("/print", {
      method: "POST",
      body: JSON.stringify({
        printerName: firstPrinter,
        html: `<!DOCTYPE html><html><body><h1>Smoke test</h1><p>${new Date().toISOString()}</p></body></html>`,
      }),
    });
    assert(print.ok, `POST /print failed (${print.status}): ${JSON.stringify(print.json)}`);
    console.log("OK  POST /print to", firstPrinter);
  } else {
    console.log("SKIP POST /print (no installed printers on this PC)");
  }

  console.log("\nAll smoke tests passed.");
}

main().catch((error) => {
  console.error("\nSmoke test failed:", error.message);
  console.error("Start SimpleAccount.PrintAgent.exe and retry.");
  process.exit(1);
});
