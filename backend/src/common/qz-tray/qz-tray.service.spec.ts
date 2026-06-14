import { ServiceUnavailableException } from "@nestjs/common";

import { createQzTrayTestCredentials, QzTrayService } from "./qz-tray.service";

describe("QzTrayService", () => {
  const previousCert = process.env.QZ_DIGITAL_CERTIFICATE;
  const previousKey = process.env.QZ_PRIVATE_KEY;
  const previousCertPath = process.env.QZ_CERT_PATH;
  const previousKeyPath = process.env.QZ_PRIVATE_KEY_PATH;

  afterEach(() => {
    process.env.QZ_DIGITAL_CERTIFICATE = previousCert;
    process.env.QZ_PRIVATE_KEY = previousKey;
    process.env.QZ_CERT_PATH = previousCertPath;
    process.env.QZ_PRIVATE_KEY_PATH = previousKeyPath;
  });

  it("returns 503-style errors when signing is not configured", () => {
    delete process.env.QZ_DIGITAL_CERTIFICATE;
    delete process.env.QZ_PRIVATE_KEY;
    delete process.env.QZ_CERT_PATH;
    delete process.env.QZ_PRIVATE_KEY_PATH;

    const service = new QzTrayService();
    expect(service.isConfigured()).toBe(false);
    expect(() => service.getCertificate()).toThrow(ServiceUnavailableException);
    expect(() => service.signMessage("connect")).toThrow(ServiceUnavailableException);
  });

  it("serves the certificate and signs QZ requests when configured", () => {
    const credentials = createQzTrayTestCredentials();
    process.env.QZ_DIGITAL_CERTIFICATE = credentials.certificate;
    process.env.QZ_PRIVATE_KEY = credentials.privateKey;

    const service = new QzTrayService();
    expect(service.isConfigured()).toBe(true);
    expect(service.getCertificate()).toContain("BEGIN PUBLIC KEY");
    expect(service.signMessage("connect")).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});
