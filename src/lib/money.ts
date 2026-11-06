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
  // Deterministic grouping avoids Node vs browser locale hydration mismatches.
  const [whole, fraction = "00"] = toPesos(centavos).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₱${grouped}.${fraction}`;
}
