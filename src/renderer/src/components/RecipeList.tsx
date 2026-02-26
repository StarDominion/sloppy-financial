import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";

type Recipe = {
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

type RecipeCost = {
  totalCost: number;
  costPerServing: number;
};

interface RecipeListProps {
  profileId: number;
  onViewRecipe: (id: number) => void;
  onNewRecipe: () => void;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "#bf8700",
  lunch: "#0969da",
  dinner: "#8957e5",
  snack: "#2da44e",
};

export function RecipeList({
  profileId,
  onViewRecipe,
  onNewRecipe,
}: RecipeListProps): React.JSX.Element {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [costs, setCosts] = useState<Record<number, RecipeCost | null>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMealType, setFilterMealType] = useState<string>("all");

  useEffect(() => {
    loadRecipes();
    return onDataChange("recipes", loadRecipes);
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRecipes(): Promise<void> {
    try {
      setLoading(true);
      const data = await window.api.recipes.list(profileId);
      setRecipes(data);
      // Load costs asynchronously for each recipe
      const costMap: Record<number, RecipeCost | null> = {};
      data.forEach((r) => {
        costMap[r.id] = null; // null = loading
      });
      setCosts(costMap);
      // Fire off all cost requests in parallel
      data.forEach((r) => {
        window.api.recipes
          .getCost(r.id)
          .then((cost) => {
            setCosts((prev) => ({ ...prev, [r.id]: cost }));
          })
          .catch(() => {
            setCosts((prev) => ({
              ...prev,
              [r.id]: { totalCost: 0, costPerServing: 0 },
            }));
          });
      });
    } catch (err) {
      console.error("Error loading recipes:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = recipes.filter((r) => {
    if (filterMealType !== "all" && r.meal_type !== filterMealType) return false;
    if (searchTerm) {
      return r.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatTime = (recipe: Recipe): string => {
    const prep = recipe.prep_time_minutes || 0;
    const cook = recipe.cook_time_minutes || 0;
    const total = prep + cook;
    if (total === 0) return "--";
    return `${total} min`;
  };

  const formatCostPerServing = (recipeId: number): string => {
    const cost = costs[recipeId];
    if (cost === null || cost === undefined) return "...";
    return `$${cost.costPerServing.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading recipes...</p>
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
        <h2 style={{ margin: 0 }}>Recipes</h2>
        <button
          onClick={onNewRecipe}
          style={{
            padding: "8px 16px",
            background: "#2da44e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          + New Recipe
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            flex: 1,
            maxWidth: 250,
          }}
        />
        <select
          value={filterMealType}
          onChange={(e) => setFilterMealType(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="all">All Meal Types</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
        <div style={{ color: "#aaa", fontSize: 14, marginLeft: "auto" }}>
          <span>({filtered.length} recipes)</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              padding: 40,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>No recipes found</p>
            <p style={{ fontSize: 13 }}>
              Click &quot;+ New Recipe&quot; to create a recipe.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #444",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "10px 8px", color: "#999" }}>Name</th>
                <th style={{ padding: "10px 8px", color: "#999" }}>Meal Type</th>
                <th style={{ padding: "10px 8px", color: "#999", textAlign: "right" }}>
                  Servings
                </th>
                <th style={{ padding: "10px 8px", color: "#999", textAlign: "right" }}>
                  Cost/Serving
                </th>
                <th style={{ padding: "10px 8px", color: "#999", textAlign: "right" }}>
                  Total Time
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((recipe) => {
                const typeColor = MEAL_TYPE_COLORS[recipe.meal_type] || "#656d76";
                return (
                  <tr
                    key={recipe.id}
                    onClick={() => onViewRecipe(recipe.id)}
                    style={{
                      borderBottom: "1px solid #333",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#2a2a2a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "10px 8px",
                        color: "#0969da",
                        fontWeight: 500,
                      }}
                    >
                      {recipe.name}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontSize: 12,
                          background: typeColor + "22",
                          color: typeColor,
                          border: `1px solid ${typeColor}`,
                        }}
                      >
                        {MEAL_TYPE_LABELS[recipe.meal_type] || recipe.meal_type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        color: "#aaa",
                      }}
                    >
                      {recipe.servings}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        color: "#aaa",
                      }}
                    >
                      {formatCostPerServing(recipe.id)}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        color: "#aaa",
                      }}
                    >
                      {formatTime(recipe)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
