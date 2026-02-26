import { Database } from "./database/Database";

export type MealBudget = {
  id: number;
  profile_id: number;
  period_type: string;
  budget_amount: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export async function listMealBudgets(
  profileId: number,
): Promise<MealBudget[]> {
  const db = Database.getInstance();
  return db.query<MealBudget>(
    "SELECT * FROM meal_budgets WHERE profile_id = ? ORDER BY start_date DESC",
    [profileId],
  );
}

export async function createMealBudget(data: {
  profileId: number;
  periodType?: string;
  budgetAmount: number;
  startDate: string;
  endDate?: string | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO meal_budgets (profile_id, period_type, budget_amount, start_date, end_date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.profileId,
      data.periodType || "weekly",
      data.budgetAmount,
      data.startDate,
      data.endDate ?? null,
    ],
  );
  return result.insertId;
}

export async function updateMealBudget(
  id: number,
  data: {
    periodType?: string;
    budgetAmount?: number;
    startDate?: string;
    endDate?: string | null;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.periodType !== undefined) {
    fields.push("period_type = ?");
    values.push(data.periodType);
  }
  if (data.budgetAmount !== undefined) {
    fields.push("budget_amount = ?");
    values.push(data.budgetAmount);
  }
  if (data.startDate !== undefined) {
    fields.push("start_date = ?");
    values.push(data.startDate);
  }
  if (data.endDate !== undefined) {
    fields.push("end_date = ?");
    values.push(data.endDate);
  }

  if (fields.length === 0) return;

  const nowFn = db.dialect === "sqlite" ? "datetime('now')" : "NOW()";
  fields.push(`updated_at = ${nowFn}`);
  values.push(id);
  await db.execute(
    `UPDATE meal_budgets SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteMealBudget(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM meal_budgets WHERE id = ?", [id]);
}

export async function getBudgetSpending(
  profileId: number,
  startDate: string,
  endDate: string,
): Promise<number> {
  const db = Database.getInstance();

  // Sum estimated_total from shopping lists within the date range
  // If a shopping list is linked to a transaction, prefer the transaction amount
  const rows = await db.query<{ total: number }>(
    `SELECT COALESCE(SUM(
       CASE
         WHEN sl.transaction_id IS NOT NULL THEN (
           SELECT COALESCE(t.amount, sl.estimated_total)
           FROM transactions t
           WHERE t.id = sl.transaction_id
         )
         ELSE sl.estimated_total
       END
     ), 0) AS total
     FROM shopping_lists sl
     WHERE sl.profile_id = ? AND sl.created_at >= ? AND sl.created_at <= ?`,
    [profileId, startDate, endDate],
  );

  const total = rows[0]?.total ?? 0;
  return typeof total === "string" ? parseFloat(total) : total;
}
