import { created, handleRouteError, ok, readJson } from "@/lib/api";
import { createCommitmentSchema } from "@/lib/validators/commitments";
import {
  createCommitment,
  listCommitments,
} from "@/services/commitments";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const commitments = await listCommitments(projectId);
    return ok(commitments);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await readJson(request);
    const input = createCommitmentSchema.parse(body);
    const commitment = await createCommitment(projectId, input);
    return created(commitment);
  } catch (error) {
    return handleRouteError(error);
  }
}
