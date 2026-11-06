import { handleRouteError, ok } from "@/lib/api";
import { getPayPalOrder } from "@/services/paypal/orders";

type Params = { params: Promise<{ orderId: string }> };

/** GET /api/paypal/orders/:orderId — Orders v2 show order details */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orderId } = await params;
    const order = await getPayPalOrder(orderId);
    return ok(order);
  } catch (error) {
    return handleRouteError(error);
  }
}
