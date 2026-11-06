import { handleRouteError, ok } from "@/lib/api";
import { deleteDependency } from "@/services/commitments";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await deleteDependency(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
