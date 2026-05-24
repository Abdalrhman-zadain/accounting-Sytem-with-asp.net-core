export type VolumeSeedConfig = {
  years: number[];
  monthlyJournals: number;
  customers: number;
  suppliers: number;
  employees: number;
  inventoryItems: number;
  auditEvents: number;
  rngSeed: number;
};

function readInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadVolumeSeedConfig(): VolumeSeedConfig {
  const yearsRaw = process.env.SEED_VOLUME_YEARS ?? '2024,2025,2026';
  const years = yearsRaw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));

  return {
    years: years.length ? years : [2024, 2025, 2026],
    monthlyJournals: readInt('SEED_MONTHLY_JOURNALS', 400),
    customers: readInt('SEED_CUSTOMERS', 80),
    suppliers: readInt('SEED_SUPPLIERS', 40),
    employees: readInt('SEED_EMPLOYEES', 25),
    inventoryItems: readInt('SEED_INVENTORY_ITEMS', 120),
    auditEvents: readInt('SEED_AUDIT_EVENTS', 500),
    rngSeed: readInt('SEED_RNG_SEED', 42),
  };
}
