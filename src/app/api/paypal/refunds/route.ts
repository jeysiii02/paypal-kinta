import { z } from "zod";
import { created, handleRouteError, readJson } from "@/lib/api";
import { centavosSchema, cuidSchema } from "@/lib/validators/common";
import { refundCustomerPayment } from "@/services/paypal/refunds";

const bodySchema = z.object({
  customerPaymentId: cuidSchema,
  amountCentavos: centavosSchema,
  reason: z.string().trim().min(1).max(500).optional(),
  recoveryActionId: cuidSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    const result = await refundCustomerPayment(body);
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
