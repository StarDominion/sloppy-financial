import { Database } from "./database/Database";
import { getRecipeIngredients, getRecipe } from "./recipes";
import { createCalendarEvent } from "./calendar-events";

export type MealPlan = {
  id: number;
  profile_id: number;
  name: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanEntry = {
  id: number;
  meal_plan_id: number;
  recipe_id: number;
  plan_date: string;
  meal_slot: string;
  servings_to_eat: number;
  sort_order: number;
  created_at: string;
  recipe_name?: string;
  recipe_servings?: number;
  recipe_meal_type?: string;
};

export type DailyNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export async function listMealPlans(profileId: number): Promise<MealPlan[]> {
  const db = Database.getInstance();
  return db.query<MealPlan>(
    "SELECT * FROM meal_plans WHERE profile_id = ? ORDER BY start_date DESC",
    [profileId],
  );
}

export async function getMealPlan(id: number): Promise<MealPlan | null> {
  const db = Database.getInstance();
  const rows = await db.query<MealPlan>(
    "SELECT * FROM meal_plans WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createMealPlan(data: {
  profileId: number;
  name: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO meal_plans (profile_id, name, start_date, end_date, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [data.profileId, data.name, data.startDate, data.endDate, data.notes || null],
  );
  return result.insertId;
}

export async function updateMealPlan(
  id: number,
  data: {
    name?: string;
    startDate?: string;
    endDate?: string;
    notes?: string | null;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.startDate !== undefined) {
    fields.push("start_date = ?");
    values.push(data.startDate);
  }
  if (data.endDate !== undefined) {
    fields.push("end_date = ?");
    values.push(data.endDate);
  }
  if (data.notes !== undefined) {
    fields.push("notes = ?");
    values.push(data.notes);
  }

  if (fields.length === 0) return;

  const nowFn = db.dialect === "sqlite" ? "datetime('now')" : "NOW()";
  fields.push(`updated_at = ${nowFn}`);
  values.push(id);
  await db.execute(
    `UPDATE meal_plans SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteMealPlan(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM meal_plans WHERE id = ?", [id]);
}

export async function listMealPlanEntries(
  mealPlanId: number,
): Promise<MealPlanEntry[]> {
  const db = Database.getInstance();
  return db.query<MealPlanEntry>(
    `SELECT mpe.*, r.name AS recipe_name, r.servings AS recipe_servings, r.meal_type AS recipe_meal_type
     FROM meal_plan_entries mpe
     JOIN recipes r ON r.id = mpe.recipe_id
     WHERE mpe.meal_plan_id = ?
     ORDER BY mpe.plan_date ASC, mpe.sort_order ASC`,
    [mealPlanId],
  );
}

export async function createMealPlanEntry(data: {
  mealPlanId: number;
  recipeId: number;
  planDate: string;
  mealSlot?: string;
  servingsToEat?: number;
  sortOrder?: number;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, plan_date, meal_slot, servings_to_eat, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.mealPlanId,
      data.recipeId,
      data.planDate,
      data.mealSlot || "dinner",
      data.servingsToEat ?? 1,
      data.sortOrder ?? 0,
    ],
  );
  return result.insertId;
}

export async function updateMealPlanEntry(
  id: number,
  data: {
    recipeId?: number;
    planDate?: string;
    mealSlot?: string;
    servingsToEat?: number;
    sortOrder?: number;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.recipeId !== undefined) {
    fields.push("recipe_id = ?");
    values.push(data.recipeId);
  }
  if (data.planDate !== undefined) {
    fields.push("plan_date = ?");
    values.push(data.planDate);
  }
  if (data.mealSlot !== undefined) {
    fields.push("meal_slot = ?");
    values.push(data.mealSlot);
  }
  if (data.servingsToEat !== undefined) {
    fields.push("servings_to_eat = ?");
    values.push(data.servingsToEat);
  }
  if (data.sortOrder !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sortOrder);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(
    `UPDATE meal_plan_entries SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteMealPlanEntry(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM meal_plan_entries WHERE id = ?", [id]);
}

export async function getDailyNutrition(
  mealPlanId: number,
  date: string,
): Promise<DailyNutrition> {
  const db = Database.getInstance();
  const entries = await db.query<{
    recipe_id: number;
    servings_to_eat: number;
    recipe_servings: number;
  }>(
    `SELECT mpe.recipe_id, mpe.servings_to_eat, r.servings AS recipe_servings
     FROM meal_plan_entries mpe
     JOIN recipes r ON r.id = mpe.recipe_id
     WHERE mpe.meal_plan_id = ? AND mpe.plan_date = ?`,
    [mealPlanId, date],
  );

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const entry of entries) {
    const servingsToEat =
      typeof entry.servings_to_eat === "string"
        ? parseFloat(entry.servings_to_eat)
        : entry.servings_to_eat;
    const recipeServings =
      typeof entry.recipe_servings === "string"
        ? parseFloat(entry.recipe_servings)
        : entry.recipe_servings;
    const scale = servingsToEat / recipeServings;

    const ingredients = await getRecipeIngredients(entry.recipe_id);
    for (const ri of ingredients) {
      const qty = typeof ri.quantity === "string" ? parseFloat(ri.quantity) : ri.quantity;
      calories += (ri.calories_per_unit ?? 0) * qty * scale;
      protein += (ri.protein_per_unit ?? 0) * qty * scale;
      carbs += (ri.carbs_per_unit ?? 0) * qty * scale;
      fat += (ri.fat_per_unit ?? 0) * qty * scale;
    }
  }

  return { calories, protein, carbs, fat };
}

export async function getLeftovers(
  mealPlanId: number,
  date: string,
  recipeId: number,
): Promise<number> {
  const db = Database.getInstance();
  const recipe = await getRecipe(recipeId);
  if (!recipe) return 0;

  // Find the first date this recipe appears in the plan on or before the given date
  const firstEntry = await db.query<{ plan_date: string }>(
    `SELECT plan_date FROM meal_plan_entries
     WHERE meal_plan_id = ? AND recipe_id = ? AND plan_date <= ?
     ORDER BY plan_date ASC LIMIT 1`,
    [mealPlanId, recipeId, date],
  );
  if (firstEntry.length === 0) return 0;

  // Sum all servings_to_eat for this recipe from the first cook date up to and including the given date
  const rows = await db.query<{ total_eaten: number }>(
    `SELECT COALESCE(SUM(servings_to_eat), 0) AS total_eaten
     FROM meal_plan_entries
     WHERE meal_plan_id = ? AND recipe_id = ? AND plan_date >= ? AND plan_date <= ?`,
    [mealPlanId, recipeId, firstEntry[0].plan_date, date],
  );

  const totalEaten =
    typeof rows[0].total_eaten === "string"
      ? parseFloat(rows[0].total_eaten)
      : rows[0].total_eaten;

  return Math.max(0, recipe.servings - totalEaten);
}

const MEAL_SLOT_TIMES: Record<string, string> = {
  breakfast: "08:00:00",
  lunch: "12:00:00",
  dinner: "18:00:00",
  snack: "15:00:00",
};

export async function syncMealPlanToCalendar(
  mealPlanId: number,
  profileId: number,
): Promise<void> {
  const entries = await listMealPlanEntries(mealPlanId);

  for (const entry of entries) {
    const recipe = await getRecipe(entry.recipe_id);
    if (!recipe) continue;

    const time = MEAL_SLOT_TIMES[entry.meal_slot] || "12:00:00";
    const startTime = `${entry.plan_date} ${time}`;
    const duration = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0) || 30;

    await createCalendarEvent({
      profileId,
      title: `Meal: ${recipe.name}`,
      description: `${entry.meal_slot} - ${entry.servings_to_eat} serving(s)`,
      startTime,
      durationMinutes: duration,
      color: "#4caf50",
    });
  }
}
