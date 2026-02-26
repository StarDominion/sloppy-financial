import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  current_price: number | null;
  current_price_qty: number | null;
  calories_per_unit: number | null;
  dietary_tags: string | null;
  created_at: string;
};

const DIETARY_TAG_OPTIONS = [
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "keto",
  "low-carb",
];

interface IngredientListProps {
  profileId: number;
  onViewIngredient: (id: number) => void;
  onNewIngredient: () => void;
}

export function IngredientList({
  profileId,
  onViewIngredient,
  onNewIngredient,
}: IngredientListProps): React.JSX.Element {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");

  useEffect(() => {
    loadIngredients();
    return onDataChange("ingredients", loadIngredients);
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadIngredients(): Promise<void> {
    try {
      setLoading(true);
      const data = await window.api.ingredients.list(profileId);
      setIngredients(data);
    } catch (err) {
      console.error("Error loading ingredients:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = ingredients.filter((ing) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!ing.name.toLowerCase().includes(term)) return false;
    }
    if (dietaryFilter !== "all") {
      const tags = ing.dietary_tags
        ? ing.dietary_tags.split(",").map((t) => t.trim().toLowerCase())
        : [];
      if (!tags.includes(dietaryFilter.toLowerCase())) return false;
    }
    return true;
  });

  const formatPrice = (ing: Ingredient): string => {
    if (ing.current_price == null) return "--";
    const qty = ing.current_price_qty ?? 1;
    return `$${Number(ing.current_price).toFixed(2)}/${qty} ${ing.unit}`;
  };

  const parseDietaryTags = (tags: string | null): string[] => {
    if (!tags) return [];
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  };

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading ingredients...</p>
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
        <h2 style={{ margin: 0 }}>Ingredients</h2>
        <button
          onClick={onNewIngredient}
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
          + New Ingredient
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
          placeholder="Search ingredients..."
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
          value={dietaryFilter}
          onChange={(e) => setDietaryFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="all">All Dietary Tags</option>
          {DIETARY_TAG_OPTIONS.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <div style={{ color: "#aaa", fontSize: 14, marginLeft: "auto" }}>
          ({filtered.length} ingredient{filtered.length !== 1 ? "s" : ""})
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
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              No ingredients found
            </p>
            <p style={{ fontSize: 13 }}>
              Click &quot;+ New Ingredient&quot; to add an ingredient.
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
                <th style={{ padding: "10px 8px", color: "#999" }}>Unit</th>
                <th style={{ padding: "10px 8px", color: "#999" }}>Price</th>
                <th style={{ padding: "10px 8px", color: "#999" }}>
                  Calories/unit
                </th>
                <th style={{ padding: "10px 8px", color: "#999" }}>
                  Dietary Tags
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ing) => {
                const tags = parseDietaryTags(ing.dietary_tags);
                return (
                  <tr
                    key={ing.id}
                    onClick={() => onViewIngredient(ing.id)}
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
                      {ing.name}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#aaa" }}>
                      {ing.unit}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#aaa" }}>
                      {formatPrice(ing)}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#aaa" }}>
                      {ing.calories_per_unit != null
                        ? ing.calories_per_unit
                        : "--"}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      {tags.length > 0 ? (
                        <div
                          style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                        >
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                padding: "1px 6px",
                                borderRadius: 8,
                                fontSize: 11,
                                background: "#0e639c22",
                                color: "#0e639c",
                                border: "1px solid #0e639c",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#555" }}>--</span>
                      )}
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
