import { handleRouteError, ok, readJson } from "@/lib/api";
import { updateSupplierSchema } from "@/lib/validators/suppliers";
import {
  deleteSupplier,
  getSupplier,
  updateSupplier,
} from "@/services/suppliers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supplier = await getSupplier(id);
    return ok(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = updateSupplierSchema.parse(body);
    const supplier = await updateSupplier(id, input);
    return ok(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await deleteSupplier(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
