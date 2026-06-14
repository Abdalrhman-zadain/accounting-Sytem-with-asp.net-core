import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createSign, generateKeyPairSync } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

@Injectable()
export class QzTrayService {
  private certificate: string | null = null;
  private privateKey: string | null = null;

  constructor() {
    this.loadCredentials();
  }

  isConfigured(): boolean {
    return Boolean(this.certificate && this.privateKey);
  }

  getCertificate(): string {
    this.assertConfigured();
    return this.certificate!;
  }

  signMessage(request: string): string {
    this.assertConfigured();
    const signer = createSign("SHA512");
    signer.update(request);
    signer.end();
    return signer.sign(this.privateKey!, "base64");
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "QZ Tray signing is not configured. Set QZ_CERT_PATH and QZ_PRIVATE_KEY_PATH (or inline QZ_DIGITAL_CERTIFICATE / QZ_PRIVATE_KEY).",
      );
    }
  }

  private loadCredentials(): void {
    const certificate = this.readCredential(
      process.env.QZ_DIGITAL_CERTIFICATE,
      process.env.QZ_CERT_PATH,
    );
    const privateKey = this.readCredential(process.env.QZ_PRIVATE_KEY, process.env.QZ_PRIVATE_KEY_PATH);

    if (!certificate || !privateKey) {
      return;
    }

    this.certificate = certificate;
    this.privateKey = privateKey;
  }

  private readCredential(inlineValue: string | undefined, filePath: string | undefined): string | null {
    const inline = inlineValue?.trim();
    if (inline) {
      return inline.replace(/\\n/g, "\n");
    }

    const pathValue = filePath?.trim();
    if (!pathValue) {
      return null;
    }

    const resolvedPath = resolve(pathValue);
    if (!existsSync(resolvedPath)) {
      return null;
    }

    return readFileSync(resolvedPath, "utf8").trim();
  }
}

/** Generates an ephemeral RSA key pair for unit tests only. */
export function createQzTrayTestCredentials(): { certificate: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  return {
    certificate: publicKey,
    privateKey,
  };
}
