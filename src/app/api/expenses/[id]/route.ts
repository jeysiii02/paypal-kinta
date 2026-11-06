import { handleRouteError, ok, readJson } from "@/lib/api";
import { updateExpenseSchema } from "@/lib/validators/expenses";
import {
  deleteExpense,
  getExpense,
  updateExpense,
} from "@/services/expenses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const expense = await getExpense(id);
    return ok(expense);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const input = updateExpenseSchema.parse(body);
    const expense = await updateExpense(id, input);
    return ok(expense);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await deleteExpense(id);
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
