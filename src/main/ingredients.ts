import { Database } from "./database/Database";

export type Ingredient = {
  id: number;
  profile_id: number;
  name: string;
  unit: string;
  nutrition_unit: string | null;
  current_price: number | null;
  current_price_qty: number;
  calories_per_unit: number | null;
  protein_per_unit: number | null;
  carbs_per_unit: number | null;
  fat_per_unit: number | null;
  dietary_tags: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type IngredientPriceHistory = {
  id: number;
  ingredient_id: number;
  price: number;
  qty: number;
  store: string | null;
  recorded_date: string;
  created_at: string;
};

export async function listIngredients(profileId: number): Promise<Ingredient[]> {
  const db = Database.getInstance();
  return db.query<Ingredient>(
    "SELECT * FROM ingredients WHERE profile_id = ? ORDER BY name ASC",
    [profileId],
  );
}

export async function getIngredient(id: number): Promise<Ingredient | null> {
  const db = Database.getInstance();
  const rows = await db.query<Ingredient>(
    "SELECT * FROM ingredients WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createIngredient(data: {
  profileId: number;
  name: string;
  unit?: string;
  nutritionUnit?: string | null;
  currentPrice?: number | null;
  currentPriceQty?: number;
  caloriesPerUnit?: number | null;
  proteinPerUnit?: number | null;
  carbsPerUnit?: number | null;
  fatPerUnit?: number | null;
  dietaryTags?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO ingredients (profile_id, name, unit, nutrition_unit, current_price, current_price_qty, calories_per_unit, protein_per_unit, carbs_per_unit, fat_per_unit, dietary_tags, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.profileId,
      data.name,
      data.unit || "unit",
      data.nutritionUnit || null,
      data.currentPrice ?? null,
      data.currentPriceQty ?? 1,
      data.caloriesPerUnit ?? null,
      data.proteinPerUnit ?? null,
      data.carbsPerUnit ?? null,
      data.fatPerUnit ?? null,
      data.dietaryTags || null,
      data.notes || null,
    ],
  );
  return result.insertId;
}

export async function updateIngredient(
  id: number,
  data: {
    name?: string;
    unit?: string;
    nutritionUnit?: string | null;
    currentPrice?: number | null;
    currentPriceQty?: number;
    caloriesPerUnit?: number | null;
    proteinPerUnit?: number | null;
    carbsPerUnit?: number | null;
    fatPerUnit?: number | null;
    dietaryTags?: string | null;
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
  if (data.unit !== undefined) {
    fields.push("unit = ?");
    values.push(data.unit);
  }
  if (data.nutritionUnit !== undefined) {
    fields.push("nutrition_unit = ?");
    values.push(data.nutritionUnit);
  }
  if (data.currentPrice !== undefined) {
    fields.push("current_price = ?");
    values.push(data.currentPrice);
  }
  if (data.currentPriceQty !== undefined) {
    fields.push("current_price_qty = ?");
    values.push(data.currentPriceQty);
  }
  if (data.caloriesPerUnit !== undefined) {
    fields.push("calories_per_unit = ?");
    values.push(data.caloriesPerUnit);
  }
  if (data.proteinPerUnit !== undefined) {
    fields.push("protein_per_unit = ?");
    values.push(data.proteinPerUnit);
  }
  if (data.carbsPerUnit !== undefined) {
    fields.push("carbs_per_unit = ?");
    values.push(data.carbsPerUnit);
  }
  if (data.fatPerUnit !== undefined) {
    fields.push("fat_per_unit = ?");
    values.push(data.fatPerUnit);
  }
  if (data.dietaryTags !== undefined) {
    fields.push("dietary_tags = ?");
    values.push(data.dietaryTags);
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
    `UPDATE ingredients SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteIngredient(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM ingredients WHERE id = ?", [id]);
}

export async function listPriceHistory(
  ingredientId: number,
): Promise<IngredientPriceHistory[]> {
  const db = Database.getInstance();
  return db.query<IngredientPriceHistory>(
    "SELECT * FROM ingredient_price_history WHERE ingredient_id = ? ORDER BY recorded_date DESC",
    [ingredientId],
  );
}

export async function addPriceHistory(data: {
  ingredientId: number;
  price: number;
  qty?: number;
  store?: string | null;
  recordedDate: string;
}): Promise<number> {
  const db = Database.getInstance();
  const qty = data.qty ?? 1;
  const result = await db.execute(
    `INSERT INTO ingredient_price_history (ingredient_id, price, qty, store, recorded_date)
     VALUES (?, ?, ?, ?, ?)`,
    [data.ingredientId, data.price, qty, data.store || null, data.recordedDate],
  );

  // Update current price on the ingredient
  const nowFn = db.dialect === "sqlite" ? "datetime('now')" : "NOW()";
  await db.execute(
    `UPDATE ingredients SET current_price = ?, current_price_qty = ?, updated_at = ${nowFn} WHERE id = ?`,
    [data.price, qty, data.ingredientId],
  );

  return result.insertId;
}

export async function deletePriceHistory(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM ingredient_price_history WHERE id = ?", [id]);
}

// --- Brands ---

export type IngredientBrand = {
  id: number;
  ingredient_id: number;
  name: string;
  url: string | null;
  created_at: string;
};

export async function listBrands(ingredientId: number): Promise<IngredientBrand[]> {
  const db = Database.getInstance();
  return db.query<IngredientBrand>(
    "SELECT * FROM ingredient_brands WHERE ingredient_id = ? ORDER BY name ASC",
    [ingredientId],
  );
}

export async function addBrand(data: {
  ingredientId: number;
  name: string;
  url?: string | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    "INSERT INTO ingredient_brands (ingredient_id, name, url) VALUES (?, ?, ?)",
    [data.ingredientId, data.name, data.url || null],
  );
  return result.insertId;
}

export async function updateBrand(
  id: number,
  data: { name?: string; url?: string | null },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.url !== undefined) {
    fields.push("url = ?");
    values.push(data.url);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(
    `UPDATE ingredient_brands SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteBrand(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM ingredient_brands WHERE id = ?", [id]);
}
