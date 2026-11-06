import { z } from "zod";
import { handleRouteError, ok, readJson } from "@/lib/api";
import { cuidSchema } from "@/lib/validators/common";
import { captureCustomerPaymentOrder } from "@/services/paypal/orders";

type Params = { params: Promise<{ orderId: string }> };

const bodySchema = z.object({
  projectId: cuidSchema,
  customerPaymentId: cuidSchema,
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { orderId } = await params;
    const body = bodySchema.parse(await readJson(request));
    const result = await captureCustomerPaymentOrder({
      ...body,
      orderId,
    });
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
