/**
 * Smoke-test the Print Agent HTTP API (run on Windows with the agent started).
 *
 *   node tools/print-agent/smoke-test-agent-api.mjs
 *   node tools/print-agent/smoke-test-agent-api.mjs http://127.0.0.1:9188
 *   node tools/print-agent/smoke-test-agent-api.mjs http://127.0.0.1:9188 "XPrinter-V320N" "XPrinter-Q851L"
 */

const base = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://127.0.0.1:9188";
const kitchenOverride = process.argv[2]?.startsWith("http") ? process.argv[3] : process.argv[2];
const receiptOverride = process.argv[2]?.startsWith("http") ? process.argv[4] : process.argv[3];

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

function findInstalledPrinter(installed, name) {
  if (!name) {
    return null;
  }
  return installed.find((entry) => entry.localeCompare(name, undefined, { sensitivity: "accent" }) === 0);
}

function build80mmTestHtml(title, subtitle) {
  const now = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      width: 76mm;
      padding: 4mm 2mm;
      color: #000;
      text-align: center;
    }
    .title { font-size: 12pt; font-weight: bold; margin-bottom: 4px; }
    .sub { font-size: 9pt; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="title">${title}</div>
  <div>${now}</div>
  <div class="sub">${subtitle}</div>
</body>
</html>`;
}

async function printToPrinter(printerName, html) {
  const print = await request("/print", {
    method: "POST",
    body: JSON.stringify({ printerName, html }),
  });
  assert(print.ok, `POST /print to "${printerName}" failed (${print.status}): ${JSON.stringify(print.json)}`);
  console.log("OK  POST /print to", printerName);
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
  const installed = printers.json.printers;
  console.log("OK  GET /printers", installed.length, "printer(s)", installed);

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

  const kitchenName = kitchenOverride ?? config.json?.kitchenPrinterName ?? null;
  const receiptName = receiptOverride ?? config.json?.receiptPrinterName ?? null;

  const targets = [
    {
      role: "kitchen",
      name: kitchenName,
      html: build80mmTestHtml("Kitchen Printer Test", "KOT / تذكرة مطبخ"),
    },
    {
      role: "receipt",
      name: receiptName,
      html: build80mmTestHtml("Receipt Printer Test", "Receipt / إيصال"),
    },
  ].filter((target) => target.name);

  if (targets.length === 0) {
    if (installed.length >= 2) {
      targets.push(
        {
          role: "kitchen",
          name: installed[0],
          html: build80mmTestHtml("Kitchen Printer Test", "KOT / تذكرة مطبخ"),
        },
        {
          role: "receipt",
          name: installed[1],
          html: build80mmTestHtml("Receipt Printer Test", "Receipt / إيصال"),
        },
      );
      console.log("WARN No kitchen/receipt configured — using first two installed printers");
    } else if (installed.length === 1) {
      targets.push({
        role: "kitchen",
        name: installed[0],
        html: build80mmTestHtml("Kitchen Printer Test", "KOT / تذكرة مطبخ"),
      });
      console.log("WARN Only one printer installed — kitchen test only");
    } else {
      console.log("SKIP POST /print (no installed printers on this PC)");
      console.log("\nAll smoke tests passed.");
      return;
    }
  }

  for (const target of targets) {
    const matched = findInstalledPrinter(installed, target.name);
    assert(
      matched,
      `Printer "${target.name}" (${target.role}) is not installed. Available: ${installed.join(", ") || "(none)"}`,
    );
    if (matched !== target.name) {
      console.log(`NOTE Using installed name "${matched}" for configured "${target.name}"`);
    }
    await printToPrinter(matched, target.html);
  }

  if (targets.length >= 2 && targets[0].name === targets[1].name) {
    throw new Error("Kitchen and receipt printers must be different devices.");
  }

  console.log("\nAll smoke tests passed.");
}

main().catch((error) => {
  console.error("\nSmoke test failed:", error.message);
  console.error("Start SimpleAccount.PrintAgent.exe and retry.");
  process.exit(1);
});
