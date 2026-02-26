import { Database } from "./database/Database";
import { listMealPlanEntries, getMealPlan } from "./meal-plans";
import { getRecipeIngredients, getRecipe } from "./recipes";

export type ShoppingList = {
  id: number;
  profile_id: number;
  meal_plan_id: number | null;
  transaction_id: number | null;
  name: string;
  status: string;
  estimated_total: number | null;
  created_at: string;
  updated_at: string;
};

export type ShoppingListItem = {
  id: number;
  shopping_list_id: number;
  ingredient_id: number | null;
  name: string;
  quantity: number;
  unit: string | null;
  estimated_price: number | null;
  checked: number;
  sort_order: number;
};

export async function listShoppingLists(
  profileId: number,
): Promise<ShoppingList[]> {
  const db = Database.getInstance();
  return db.query<ShoppingList>(
    "SELECT * FROM shopping_lists WHERE profile_id = ? ORDER BY created_at DESC",
    [profileId],
  );
}

export async function getShoppingList(
  id: number,
): Promise<ShoppingList | null> {
  const db = Database.getInstance();
  const rows = await db.query<ShoppingList>(
    "SELECT * FROM shopping_lists WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createShoppingList(data: {
  profileId: number;
  name: string;
  mealPlanId?: number | null;
  transactionId?: number | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO shopping_lists (profile_id, name, meal_plan_id, transaction_id)
     VALUES (?, ?, ?, ?)`,
    [
      data.profileId,
      data.name,
      data.mealPlanId ?? null,
      data.transactionId ?? null,
    ],
  );
  return result.insertId;
}

export async function updateShoppingList(
  id: number,
  data: {
    name?: string;
    status?: string;
    estimatedTotal?: number | null;
    transactionId?: number | null;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.status !== undefined) {
    fields.push("status = ?");
    values.push(data.status);
  }
  if (data.estimatedTotal !== undefined) {
    fields.push("estimated_total = ?");
    values.push(data.estimatedTotal);
  }
  if (data.transactionId !== undefined) {
    fields.push("transaction_id = ?");
    values.push(data.transactionId);
  }

  if (fields.length === 0) return;

  const nowFn = db.dialect === "sqlite" ? "datetime('now')" : "NOW()";
  fields.push(`updated_at = ${nowFn}`);
  values.push(id);
  await db.execute(
    `UPDATE shopping_lists SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteShoppingList(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM shopping_lists WHERE id = ?", [id]);
}

export async function listShoppingListItems(
  shoppingListId: number,
): Promise<ShoppingListItem[]> {
  const db = Database.getInstance();
  return db.query<ShoppingListItem>(
    "SELECT * FROM shopping_list_items WHERE shopping_list_id = ? ORDER BY checked ASC, sort_order ASC, name ASC",
    [shoppingListId],
  );
}

export async function addShoppingListItem(data: {
  shoppingListId: number;
  ingredientId?: number | null;
  name: string;
  quantity?: number;
  unit?: string | null;
  estimatedPrice?: number | null;
  sortOrder?: number;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    `INSERT INTO shopping_list_items (shopping_list_id, ingredient_id, name, quantity, unit, estimated_price, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.shoppingListId,
      data.ingredientId ?? null,
      data.name,
      data.quantity ?? 1,
      data.unit || null,
      data.estimatedPrice ?? null,
      data.sortOrder ?? 0,
    ],
  );
  return result.insertId;
}

export async function updateShoppingListItem(
  id: number,
  data: {
    name?: string;
    quantity?: number;
    unit?: string | null;
    estimatedPrice?: number | null;
    checked?: number;
    sortOrder?: number;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.quantity !== undefined) {
    fields.push("quantity = ?");
    values.push(data.quantity);
  }
  if (data.unit !== undefined) {
    fields.push("unit = ?");
    values.push(data.unit);
  }
  if (data.estimatedPrice !== undefined) {
    fields.push("estimated_price = ?");
    values.push(data.estimatedPrice);
  }
  if (data.checked !== undefined) {
    fields.push("checked = ?");
    values.push(data.checked);
  }
  if (data.sortOrder !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sortOrder);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(
    `UPDATE shopping_list_items SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteShoppingListItem(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM shopping_list_items WHERE id = ?", [id]);
}

export async function generateFromMealPlan(
  mealPlanId: number,
  profileId: number,
): Promise<number> {
  const plan = await getMealPlan(mealPlanId);
  const entries = await listMealPlanEntries(mealPlanId);

  // Aggregate ingredients across all entries, scaled by servings
  const aggregated = new Map<
    number,
    { name: string; unit: string; quantity: number; pricePerUnit: number }
  >();

  for (const entry of entries) {
    const recipe = await getRecipe(entry.recipe_id);
    if (!recipe) continue;

    const servingsToEat =
      typeof entry.servings_to_eat === "string"
        ? parseFloat(entry.servings_to_eat)
        : entry.servings_to_eat;
    const recipeServings =
      typeof recipe.servings === "string"
        ? parseFloat(recipe.servings as any)
        : recipe.servings;
    const scale = servingsToEat / recipeServings;

    const ingredients = await getRecipeIngredients(entry.recipe_id);
    for (const ri of ingredients) {
      const qty =
        (typeof ri.quantity === "string" ? parseFloat(ri.quantity) : ri.quantity) * scale;

      const existing = aggregated.get(ri.ingredient_id);
      if (existing) {
        existing.quantity += qty;
      } else {
        let pricePerUnit = 0;
        if (ri.current_price != null && ri.current_price_qty > 0) {
          const price =
            typeof ri.current_price === "string"
              ? parseFloat(ri.current_price)
              : ri.current_price;
          const priceQty =
            typeof ri.current_price_qty === "string"
              ? parseFloat(ri.current_price_qty)
              : ri.current_price_qty;
          pricePerUnit = price / priceQty;
        }
        aggregated.set(ri.ingredient_id, {
          name: ri.ingredient_name,
          unit: ri.unit_override || ri.ingredient_unit,
          quantity: qty,
          pricePerUnit,
        });
      }
    }
  }

  // Calculate estimated total
  let estimatedTotal = 0;
  for (const item of aggregated.values()) {
    estimatedTotal += item.pricePerUnit * item.quantity;
  }

  // Create shopping list
  const listName = plan
    ? `Shopping List - ${plan.name}`
    : `Shopping List - ${new Date().toISOString().slice(0, 10)}`;

  const listId = await createShoppingList({
    profileId,
    name: listName,
    mealPlanId,
  });

  // Update estimated total
  await updateShoppingList(listId, { estimatedTotal });

  // Create items
  let sortOrder = 0;
  for (const [ingredientId, item] of aggregated.entries()) {
    await addShoppingListItem({
      shoppingListId: listId,
      ingredientId,
      name: item.name,
      quantity: Math.ceil(item.quantity * 100) / 100, // Round up to 2 decimals
      unit: item.unit,
      estimatedPrice:
        item.pricePerUnit > 0
          ? Math.ceil(item.pricePerUnit * item.quantity * 100) / 100
          : null,
      sortOrder: sortOrder++,
    });
  }

  return listId;
}

export async function linkTransaction(
  shoppingListId: number,
  transactionId: number,
): Promise<void> {
  await updateShoppingList(shoppingListId, { transactionId });
}
