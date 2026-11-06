/**
 * Monetary helpers — all amounts in the DB are integer minor units (centavos).
 * ₱1.00 = 100 centavos.
 */

/** Convert pesos (number or decimal string) to centavos */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/** Convert centavos to pesos (number) */
export function toPesos(centavos: number): number {
  return centavos / 100;
}

/** Format centavos as a PHP display string, e.g. "₱15,000.00" */
export function formatPhp(centavos: number): string {
  return `₱${toPesos(centavos).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
