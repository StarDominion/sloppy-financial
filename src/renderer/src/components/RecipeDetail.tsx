import { useEffect, useState } from "react";
import { emitDataChange, onDataChange } from "../dataEvents";

type Ingredient = {
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

type RecipeIngredientRow = {
  ingredientId: number | null;
  quantity: number;
  unitOverride: string;
};

interface RecipeDetailProps {
  recipeId: number | null;
  profileId: number;
  onClose: () => void;
}

export function RecipeDetail({
  recipeId,
  profileId,
  onClose,
}: RecipeDetailProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [mealType, setMealType] = useState("dinner");
  const [servings, setServings] = useState(1);
  const [prepTime, setPrepTime] = useState<number | null>(null);
  const [cookTime, setCookTime] = useState<number | null>(null);
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");

  const [ingredientRows, setIngredientRows] = useState<RecipeIngredientRow[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditMode = recipeId !== null;

  useEffect(() => {
    loadIngredients();
    if (isEditMode) {
      loadRecipe();
    } else {
      setLoading(false);
    }
    return onDataChange("ingredients", loadIngredients);
  }, [recipeId, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadIngredients(): Promise<void> {
    try {
      const data = await window.api.ingredients.list(profileId);
      setAllIngredients(data);
    } catch (err) {
      console.error("Error loading ingredients:", err);
    }
  }

  async function loadRecipe(): Promise<void> {
    if (!recipeId) return;
    try {
      setLoading(true);
      const recipe = await window.api.recipes.get(recipeId);
      if (!recipe) {
        alert("Recipe not found");
        onClose();
        return;
      }
      setName(recipe.name);
      setMealType(recipe.meal_type);
      setServings(recipe.servings);
      setPrepTime(recipe.prep_time_minutes);
      setCookTime(recipe.cook_time_minutes);
      setInstructions(recipe.instructions || "");
      setNotes(recipe.notes || "");

      const ingredients = await window.api.recipes.getIngredients(recipeId);
      setIngredientRows(
        ingredients.map((ing) => ({
          ingredientId: ing.ingredient_id,
          quantity: ing.quantity,
          unitOverride: ing.unit_override || "",
        }))
      );
    } catch (err) {
      console.error("Error loading recipe:", err);
    } finally {
      setLoading(false);
    }
  }

  function getIngredientById(id: number | null): Ingredient | undefined {
    if (id === null) return undefined;
    return allIngredients.find((i) => i.id === id);
  }

  function calcCostContribution(row: RecipeIngredientRow): number {
    const ing = getIngredientById(row.ingredientId);
    if (!ing || ing.current_price === null) return 0;
    const pricePerUnit = ing.current_price / ing.current_price_qty;
    return pricePerUnit * row.quantity;
  }

  function calcCalorieContribution(row: RecipeIngredientRow): number {
    const ing = getIngredientById(row.ingredientId);
    if (!ing || ing.calories_per_unit === null) return 0;
    return ing.calories_per_unit * row.quantity;
  }

  function calcMacro(row: RecipeIngredientRow, macro: "protein" | "carbs" | "fat"): number {
    const ing = getIngredientById(row.ingredientId);
    if (!ing) return 0;
    const val =
      macro === "protein"
        ? ing.protein_per_unit
        : macro === "carbs"
          ? ing.carbs_per_unit
          : ing.fat_per_unit;
    if (val === null) return 0;
    return val * row.quantity;
  }

  // Summary calculations
  const totalCost = ingredientRows.reduce((sum, r) => sum + calcCostContribution(r), 0);
  const costPerServing = servings > 0 ? totalCost / servings : 0;
  const totalCalories = ingredientRows.reduce((sum, r) => sum + calcCalorieContribution(r), 0);
  const caloriesPerServing = servings > 0 ? totalCalories / servings : 0;
  const totalProtein = ingredientRows.reduce((sum, r) => sum + calcMacro(r, "protein"), 0);
  const totalCarbs = ingredientRows.reduce((sum, r) => sum + calcMacro(r, "carbs"), 0);
  const totalFat = ingredientRows.reduce((sum, r) => sum + calcMacro(r, "fat"), 0);
  const proteinPerServing = servings > 0 ? totalProtein / servings : 0;
  const carbsPerServing = servings > 0 ? totalCarbs / servings : 0;
  const fatPerServing = servings > 0 ? totalFat / servings : 0;

  function addIngredientRow(): void {
    setIngredientRows((prev) => [
      ...prev,
      { ingredientId: null, quantity: 1, unitOverride: "" },
    ]);
  }

  function updateRow(index: number, field: keyof RecipeIngredientRow, value: string | number | null): void {
    setIngredientRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function removeRow(index: number): void {
    setIngredientRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      alert("Recipe name is required");
      return;
    }
    setSaving(true);
    try {
      let id = recipeId;
      if (isEditMode && id !== null) {
        await window.api.recipes.update(id, {
          name: name.trim(),
          mealType,
          servings,
          prepTimeMinutes: prepTime,
          cookTimeMinutes: cookTime,
          instructions: instructions.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        id = await window.api.recipes.create({
          profileId,
          name: name.trim(),
          mealType,
          servings,
          prepTimeMinutes: prepTime,
          cookTimeMinutes: cookTime,
          instructions: instructions.trim() || null,
          notes: notes.trim() || null,
        });
      }
      // Save ingredients
      const validRows = ingredientRows.filter((r) => r.ingredientId !== null);
      await window.api.recipes.setIngredients(
        id!,
        validRows.map((r) => ({
          ingredientId: r.ingredientId!,
          quantity: r.quantity,
          unitOverride: r.unitOverride.trim() || null,
        }))
      );
      emitDataChange("recipes");
      onClose();
    } catch (err) {
      console.error("Error saving recipe:", err);
      alert(`Failed to save recipe: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!recipeId) return;
    if (!confirm("Are you sure you want to delete this recipe? This cannot be undone.")) return;
    try {
      await window.api.recipes.delete(recipeId);
      emitDataChange("recipes");
      onClose();
    } catch (err) {
      console.error("Error deleting recipe:", err);
      alert(`Failed to delete recipe: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    background: "#1e1e1e",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 4,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "auto" as const,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    color: "#aaa",
    fontSize: 13,
    fontWeight: 500,
  };

  const cardStyle: React.CSSProperties = {
    background: "#252525",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 16,
    textAlign: "center",
    flex: 1,
    minWidth: 120,
  };

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading recipe...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              background: "#333",
              color: "#ccc",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Back
          </button>
          <h2 style={{ margin: 0 }}>
            {isEditMode ? "Edit Recipe" : "New Recipe"}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isEditMode && (
            <button
              onClick={handleDelete}
              style={{
                padding: "8px 16px",
                background: "#3a2020",
                color: "#f48771",
                border: "1px solid #5a3030",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 16px",
              background: saving ? "#555" : "#2da44e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: 14,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Recipe"}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Metadata form */}
        <div
          style={{
            background: "#252525",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: 15, color: "#ccc" }}>
            Recipe Details
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Recipe name..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Meal Type</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                style={selectStyle}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Servings</label>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Prep Time (minutes)</label>
              <input
                type="number"
                min={0}
                value={prepTime ?? ""}
                onChange={(e) =>
                  setPrepTime(e.target.value !== "" ? parseInt(e.target.value) : null)
                }
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Cook Time (minutes)</label>
              <input
                type="number"
                min={0}
                value={cookTime ?? ""}
                onChange={(e) =>
                  setCookTime(e.target.value !== "" ? parseInt(e.target.value) : null)
                }
                placeholder="Optional"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step-by-step instructions..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        {/* Ingredients table */}
        <div
          style={{
            background: "#252525",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 15, color: "#ccc" }}>Ingredients</h3>
            <button
              onClick={addIngredientRow}
              style={{
                padding: "6px 14px",
                background: "#333",
                color: "#ccc",
                border: "1px solid #444",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              + Add Ingredient
            </button>
          </div>

          {ingredientRows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#666",
                padding: 20,
                fontSize: 13,
              }}
            >
              No ingredients added yet. Click &quot;+ Add Ingredient&quot; to start.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #444",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "8px 6px", color: "#999" }}>Ingredient</th>
                  <th style={{ padding: "8px 6px", color: "#999", width: 80 }}>Qty</th>
                  <th style={{ padding: "8px 6px", color: "#999", width: 100 }}>Unit</th>
                  <th style={{ padding: "8px 6px", color: "#999", textAlign: "right", width: 90 }}>
                    Cost
                  </th>
                  <th style={{ padding: "8px 6px", color: "#999", textAlign: "right", width: 110 }}>
                    Calories (nutr.)
                  </th>
                  <th style={{ padding: "8px 6px", width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map((row, index) => {
                  const ing = getIngredientById(row.ingredientId);
                  const displayUnit = row.unitOverride || (ing ? ing.unit : "--");
                  return (
                    <tr
                      key={index}
                      style={{ borderBottom: "1px solid #333" }}
                    >
                      <td style={{ padding: "6px" }}>
                        <select
                          value={row.ingredientId ?? ""}
                          onChange={(e) =>
                            updateRow(
                              index,
                              "ingredientId",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          style={{
                            ...selectStyle,
                            padding: "6px 8px",
                            fontSize: 13,
                          }}
                        >
                          <option value="">-- Select --</option>
                          {allIngredients.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "6px" }}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          style={{
                            ...inputStyle,
                            padding: "6px 8px",
                            fontSize: 13,
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px" }}>
                        <input
                          type="text"
                          value={row.unitOverride}
                          onChange={(e) => updateRow(index, "unitOverride", e.target.value)}
                          placeholder={ing ? ing.unit : "unit"}
                          style={{
                            ...inputStyle,
                            padding: "6px 8px",
                            fontSize: 13,
                          }}
                        />
                      </td>
                      <td
                        style={{
                          padding: "6px",
                          textAlign: "right",
                          color: "#aaa",
                          fontSize: 13,
                        }}
                      >
                        ${calcCostContribution(row).toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: "6px",
                          textAlign: "right",
                          color: "#aaa",
                          fontSize: 13,
                        }}
                      >
                        {calcCalorieContribution(row).toFixed(0)}
                        {ing?.nutrition_unit && ing.nutrition_unit !== ing.unit && (
                          <span style={{ color: "#666", fontSize: 11, marginLeft: 4 }}>
                            /{ing.nutrition_unit}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "6px", textAlign: "center" }}>
                        <button
                          onClick={() => removeRow(index)}
                          style={{
                            padding: "4px 8px",
                            background: "#3a2020",
                            color: "#f48771",
                            border: "1px solid #5a3030",
                            borderRadius: 3,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary cards */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Total Cost</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#2da44e" }}>
              ${totalCost.toFixed(2)}
            </div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
              ${costPerServing.toFixed(2)} / serving
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Total Calories</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#bf8700" }}>
              {totalCalories.toFixed(0)}
            </div>
            <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
              {caloriesPerServing.toFixed(0)} / serving
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Protein / Serving</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#0969da" }}>
              {proteinPerServing.toFixed(1)}g
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Carbs / Serving</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#8957e5" }}>
              {carbsPerServing.toFixed(1)}g
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Fat / Serving</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#cf222e" }}>
              {fatPerServing.toFixed(1)}g
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
