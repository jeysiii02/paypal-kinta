import { created, handleRouteError, ok, readJson } from "@/lib/api";
import { createSupplierSchema } from "@/lib/validators/suppliers";
import { createSupplier, listSuppliers } from "@/services/suppliers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const suppliers = await listSuppliers(projectId);
    return ok(suppliers);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await readJson(request);
    const input = createSupplierSchema.parse(body);
    const supplier = await createSupplier(projectId, input);
    return created(supplier);
  } catch (error) {
    return handleRouteError(error);
  }
}
