import { z } from "zod";

/** Positive integer amount in PHP centavos (minor units). */
export const centavosSchema = z
  .number()
  .int("Amount must be an integer (centavos)")
  .nonnegative("Amount cannot be negative");

/** Optional ISO date string → Date */
export const isoDateSchema = z.coerce.date({
  error: "Must be a valid ISO date",
});

export const cuidSchema = z.string().min(1, "ID is required");
