import { Database } from "./database/Database";

export type Recipe = {
  id: number;
  profile_id: number;
  name: string;
  meal_type: string;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  instructions: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  quantity: number;
  unit_override: string | null;
  notes: string | null;
  ingredient_name: string;
  ingredient_unit: string;
  nutrition_unit: string | null;
  current_price: number | null;
  current_price_qty: number;
  calories_per_unit: number | null;
  protein_per_unit: number | null;
  carbs_per_unit: number | null;
  fat_per_unit: number | null;
};

export type RecipeNutrition = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type RecipeCost = {
  totalCost: number;
  costPerServing: number;
};

export async function listRecipes(profileId: number): Promise<Recipe[]> {
  const db = Database.getInstance();
  return db.query<Recipe>(
    "SELECT * FROM recipes WHERE profile_id = ? ORDER BY name ASC",
    [profileId],
  );
}

export async function getRecipe(id: number): Promise<Recipe | null> {
  const db = Database.getInstance();
  const rows = await db.query<Recipe>(
    "SELECT * FROM recipes WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createRecipe(data: {
  profileId: number;
  name: string;
  mealType?: string;
  servings?: number;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  instructions?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO recipes (profile_id, name, meal_type, servings, prep_time_minutes, cook_time_minutes, instructions, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.profileId,
      data.name,
      data.mealType || "dinner",
      data.servings ?? 1,
      data.prepTimeMinutes ?? null,
      data.cookTimeMinutes ?? null,
      data.instructions || null,
      data.notes || null,
    ],
  );
  return result.insertId;
}

export async function updateRecipe(
  id: number,
  data: {
    name?: string;
    mealType?: string;
    servings?: number;
    prepTimeMinutes?: number | null;
    cookTimeMinutes?: number | null;
    instructions?: string | null;
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
  if (data.mealType !== undefined) {
    fields.push("meal_type = ?");
    values.push(data.mealType);
  }
  if (data.servings !== undefined) {
    fields.push("servings = ?");
    values.push(data.servings);
  }
  if (data.prepTimeMinutes !== undefined) {
    fields.push("prep_time_minutes = ?");
    values.push(data.prepTimeMinutes);
  }
  if (data.cookTimeMinutes !== undefined) {
    fields.push("cook_time_minutes = ?");
    values.push(data.cookTimeMinutes);
  }
  if (data.instructions !== undefined) {
    fields.push("instructions = ?");
    values.push(data.instructions);
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
    `UPDATE recipes SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteRecipe(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM recipes WHERE id = ?", [id]);
}

export async function getRecipeIngredients(
  recipeId: number,
): Promise<RecipeIngredient[]> {
  const db = Database.getInstance();
  return db.query<RecipeIngredient>(
    `SELECT ri.*, i.name AS ingredient_name, i.unit AS ingredient_unit,
            i.nutrition_unit, i.current_price, i.current_price_qty,
            i.calories_per_unit, i.protein_per_unit, i.carbs_per_unit, i.fat_per_unit
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ?
     ORDER BY ri.id ASC`,
    [recipeId],
  );
}

export async function setRecipeIngredients(
  recipeId: number,
  items: Array<{
    ingredientId: number;
    quantity: number;
    unitOverride?: string | null;
    notes?: string | null;
  }>,
): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", [
    recipeId,
  ]);
  for (const item of items) {
    await db.execute(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_override, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        recipeId,
        item.ingredientId,
        item.quantity,
        item.unitOverride || null,
        item.notes || null,
      ],
    );
  }
}

export async function getRecipeNutrition(
  recipeId: number,
): Promise<RecipeNutrition> {
  const db = Database.getInstance();
  const recipe = await getRecipe(recipeId);
  const servings = recipe?.servings ?? 1;

  const ingredients = await getRecipeIngredients(recipeId);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const ri of ingredients) {
    const qty = typeof ri.quantity === "string" ? parseFloat(ri.quantity) : ri.quantity;
    totalCalories += (ri.calories_per_unit ?? 0) * qty;
    totalProtein += (ri.protein_per_unit ?? 0) * qty;
    totalCarbs += (ri.carbs_per_unit ?? 0) * qty;
    totalFat += (ri.fat_per_unit ?? 0) * qty;
  }

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    perServing: {
      calories: totalCalories / servings,
      protein: totalProtein / servings,
      carbs: totalCarbs / servings,
      fat: totalFat / servings,
    },
  };
}

export async function getRecipeCost(recipeId: number): Promise<RecipeCost> {
  const db = Database.getInstance();
  const recipe = await getRecipe(recipeId);
  const servings = recipe?.servings ?? 1;

  const ingredients = await getRecipeIngredients(recipeId);

  let totalCost = 0;
  for (const ri of ingredients) {
    if (ri.current_price != null && ri.current_price_qty > 0) {
      const qty = typeof ri.quantity === "string" ? parseFloat(ri.quantity) : ri.quantity;
      const pricePerUnit =
        (typeof ri.current_price === "string" ? parseFloat(ri.current_price) : ri.current_price) /
        (typeof ri.current_price_qty === "string" ? parseFloat(ri.current_price_qty) : ri.current_price_qty);
      totalCost += pricePerUnit * qty;
    }
  }

  return {
    totalCost,
    costPerServing: totalCost / servings,
  };
}
