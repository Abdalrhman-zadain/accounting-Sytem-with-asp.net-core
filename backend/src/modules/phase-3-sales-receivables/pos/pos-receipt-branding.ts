const KARSHANJI_RECEIPT_DEFAULTS = {
  phone: "079 120 84 88",
  address: "المقابلين - شارع القدس",
  tagline: "كرشات - مقادم - روس - فوارغ - طحالات - سناكات",
} as const;

function readReceiptEnv(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value || fallback;
}

export function getPosReceiptBranding() {
  return {
    companyName: process.env.POS_RECEIPT_COMPANY_NAME?.trim() || "",
    taxNumber: process.env.POS_RECEIPT_TAX_NUMBER?.trim() || null,
    phone: readReceiptEnv("POS_RECEIPT_PHONE", KARSHANJI_RECEIPT_DEFAULTS.phone),
    address: readReceiptEnv("POS_RECEIPT_ADDRESS", KARSHANJI_RECEIPT_DEFAULTS.address),
    tagline: readReceiptEnv("POS_RECEIPT_TAGLINE", KARSHANJI_RECEIPT_DEFAULTS.tagline),
  };
}
