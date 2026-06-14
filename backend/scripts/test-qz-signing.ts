/**
 * Pre-deploy smoke test for QZ Tray backend signing.
 *
 * Usage:
 *   npm run qz:test
 *   npm run qz:test -- --base-url http://192.168.1.10:3007/api --user cashier --password cashier123
 */

type LoginResponse = {
  access_token?: string;
  accessToken?: string;
  token?: string;
};

function readArg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) {
    return fallback;
  }
  return process.argv[index + 1];
}

async function requestText(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: string }> {
  const response = await fetch(`${baseUrl}${path}`, options);
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function main() {
  const baseUrl = readArg("--base-url", "http://localhost:3007/api").replace(/\/+$/, "");
  const username = readArg("--user", "cashier");
  const password = readArg("--password", "cashier123");

  console.log(`QZ signing smoke test → ${baseUrl}`);

  const loginResponse = await requestText(baseUrl, "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (loginResponse.status !== 200 && loginResponse.status !== 201) {
    throw new Error(`Login failed (${loginResponse.status}): ${loginResponse.body}`);
  }

  const loginPayload = JSON.parse(loginResponse.body) as LoginResponse;
  const token = loginPayload.access_token ?? loginPayload.accessToken ?? loginPayload.token;
  if (!token) {
    throw new Error("Login succeeded but no access token was returned.");
  }

  console.log("✓ Login OK");

  const certificateResponse = await requestText(baseUrl, "/qz/certificate", {
    headers: {
      Accept: "text/plain",
      Authorization: `Bearer ${token}`,
    },
  });

  if (certificateResponse.status !== 200) {
    throw new Error(
      `GET /qz/certificate failed (${certificateResponse.status}): ${certificateResponse.body}`,
    );
  }

  if (!certificateResponse.body.includes("BEGIN CERTIFICATE")) {
    throw new Error("Certificate response does not look like a PEM certificate.");
  }

  console.log("✓ Certificate endpoint OK");

  const sampleRequest = "connect";
  const signResponse = await requestText(baseUrl, "/qz/sign", {
    method: "POST",
    headers: {
      Accept: "text/plain",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ request: sampleRequest }),
  });

  if (signResponse.status !== 200 && signResponse.status !== 201) {
    throw new Error(`POST /qz/sign failed (${signResponse.status}): ${signResponse.body}`);
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(signResponse.body.trim())) {
    throw new Error("Signature response is not valid base64.");
  }

  console.log("✓ Sign endpoint OK");
  console.log("");
  console.log("Backend QZ signing is ready.");
  console.log("");
  console.log("Next on the cashier Windows PC:");
  console.log("  1. Copy backend/certs/qz/digital-certificate.txt to the PC");
  console.log('  2. cd "C:\\Program Files\\QZ Tray"');
  console.log('  3. java -jar qz-tray.jar --allow "C:\\path\\to\\digital-certificate.txt"');
  console.log("  4. Restart QZ Tray, log into POS, open /pos/printers, run test prints");
}

main().catch((error) => {
  console.error("");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
