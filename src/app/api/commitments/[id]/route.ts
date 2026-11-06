import { handleRouteError, ok, readJson } from "@/lib/api";
import { updateCommitmentSchema } from "@/lib/validators/commitments";
import { getCommitment, updateCommitment } from "@/services/commitments";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const commitment = await getCommitment(id);
    return ok(commitment);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = updateCommitmentSchema.parse(body);
    const commitment = await updateCommitment(id, input);
    return ok(commitment);
  } catch (error) {
    return handleRouteError(error);
  }
}
