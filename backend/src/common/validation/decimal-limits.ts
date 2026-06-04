/**
 * Maximum values for numeric DTO fields, derived from PostgreSQL Decimal column precision.
 *
 * These constants should be used with the @Max() class-validator decorator
 * on every numeric DTO field to prevent database overflow errors (Internal Server Error)
 * when users enter extremely large numbers.
 *
 * Mapping:
 *   Decimal(18, 2)  → MAX_AMOUNT             (16 integer digits)
 *   Decimal(18, 4)  → MAX_QUANTITY            (14 integer digits)
 *   Decimal(18, 6)  → MAX_CONVERSION_FACTOR   (12 integer digits)
 *   Decimal(9, 4)   → MAX_PERCENTAGE          (5 integer digits)
 *   Decimal(5, 2)   → MAX_RATE                (3 integer digits)
 */

/** For Decimal(18, 2) columns: amounts, prices, balances, limits, costs, totals */
export const MAX_AMOUNT = 9999999999999999.99;

/** For Decimal(18, 4) columns: quantities, unit costs with 4 decimal places */
export const MAX_QUANTITY = 99999999999999.9999;

/** For Decimal(18, 6) columns: unit conversion factors */
export const MAX_CONVERSION_FACTOR = 999999999999.999999;

/** For Decimal(9, 4) columns: percentage values */
export const MAX_PERCENTAGE = 99999.9999;

/** For Decimal(5, 2) columns: commission rates, tax rates */
export const MAX_RATE = 999.99;
