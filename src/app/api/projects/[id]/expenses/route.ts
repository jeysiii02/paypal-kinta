import { created, handleRouteError, ok, readJson } from "@/lib/api";
import { createExpenseSchema } from "@/lib/validators/expenses";
import { createExpense, listExpenses } from "@/services/expenses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const expenses = await listExpenses(projectId);
    return ok(expenses);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const body = await readJson(request);
    const input = createExpenseSchema.parse(body);
    const expense = await createExpense(projectId, input);
    return created(expense);
  } catch (error) {
    return handleRouteError(error);
  }
}
