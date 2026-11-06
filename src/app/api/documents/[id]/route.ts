import { handleRouteError, ok } from "@/lib/api";
import { getDocument } from "@/services/documents";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const document = await getDocument(id);
    return ok(document);
  } catch (error) {
    return handleRouteError(error);
  }
}
