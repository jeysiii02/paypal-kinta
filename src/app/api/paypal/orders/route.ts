import { z } from "zod";
import { created, handleRouteError, readJson } from "@/lib/api";
import { cuidSchema } from "@/lib/validators/common";
import { createCustomerPaymentOrder } from "@/services/paypal/orders";

const bodySchema = z.object({
  projectId: cuidSchema,
  customerPaymentId: cuidSchema,
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request));
    const result = await createCustomerPaymentOrder(body);
    return created(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
