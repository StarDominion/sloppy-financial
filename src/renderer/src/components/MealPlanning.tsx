import { useState } from "react";
import { IngredientList } from "./IngredientList";
import { RecipeList } from "./RecipeList";
import { MealBudget } from "./MealBudget";
import { MealAnalytics } from "./MealAnalytics";

type SubTab = "ingredients" | "recipes" | "meal-plans" | "shopping-lists" | "budget";

interface MealPlanningProps {
  profileId: number;
  onOpenTab: (type: string, data?: any) => void;
}

export function MealPlanning({ profileId, onOpenTab }: MealPlanningProps): React.JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("ingredients");
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [shoppingLists, setShoppingLists] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanStart, setNewPlanStart] = useState(new Date().toISOString().slice(0, 10));
  const [newPlanEnd, setNewPlanEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });

  const loadMealPlans = async () => {
    setLoadingPlans(true);
    try {
      const plans = await window.api.mealPlans.list(profileId);
      setMealPlans(plans);
    } catch (e) {
      console.error("Failed to load meal plans:", e);
    }
    setLoadingPlans(false);
  };

  const loadShoppingLists = async () => {
    setLoadingLists(true);
    try {
      const lists = await window.api.shoppingLists.list(profileId);
      setShoppingLists(lists);
    } catch (e) {
      console.error("Failed to load shopping lists:", e);
    }
    setLoadingLists(false);
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;
    try {
      const id = await window.api.mealPlans.create({
        profileId,
        name: newPlanName,
        startDate: newPlanStart,
        endDate: newPlanEnd,
      });
      setShowCreatePlan(false);
      setNewPlanName("");
      onOpenTab("meal-plan-detail", { mealPlanId: id });
    } catch (e) {
      console.error("Failed to create meal plan:", e);
    }
  };

  const handleCreateShoppingList = async () => {
    try {
      const id = await window.api.shoppingLists.create({
        profileId,
        name: `Shopping List - ${new Date().toISOString().slice(0, 10)}`,
      });
      onOpenTab("shopping-list-detail", { shoppingListId: id });
    } catch (e) {
      console.error("Failed to create shopping list:", e);
    }
  };

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "ingredients", label: "Ingredients" },
    { key: "recipes", label: "Recipes" },
    { key: "meal-plans", label: "Meal Plans" },
    { key: "shopping-lists", label: "Shopping Lists" },
    { key: "budget", label: "Budget & Analytics" },
  ];

  return (
    <div style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 16, borderBottom: "1px solid #333" }}>
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveSubTab(tab.key);
              if (tab.key === "meal-plans") loadMealPlans();
              if (tab.key === "shopping-lists") loadShoppingLists();
            }}
            style={{
              padding: "8px 16px",
              background: activeSubTab === tab.key ? "#333" : "transparent",
              color: activeSubTab === tab.key ? "#fff" : "#aaa",
              border: "none",
              borderBottom: activeSubTab === tab.key ? "2px solid #4a9eff" : "2px solid transparent",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {activeSubTab === "ingredients" && (
          <IngredientList
            profileId={profileId}
            onViewIngredient={(id) => onOpenTab("ingredient-detail", { ingredientId: id })}
            onNewIngredient={() => onOpenTab("create-ingredient")}
          />
        )}

        {activeSubTab === "recipes" && (
          <RecipeList
            profileId={profileId}
            onViewRecipe={(id) => onOpenTab("recipe-detail", { recipeId: id })}
            onNewRecipe={() => onOpenTab("create-recipe")}
          />
        )}

        {activeSubTab === "meal-plans" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#fff" }}>Meal Plans</h3>
              <button
                onClick={() => setShowCreatePlan(true)}
                style={{
                  padding: "6px 14px",
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + New Meal Plan
              </button>
            </div>

            {showCreatePlan && (
              <div style={{ background: "#252525", padding: 16, borderRadius: 6, marginBottom: 16, border: "1px solid #333" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Name</label>
                    <input
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="Week plan name..."
                      style={{ padding: "6px 10px", background: "#1e1e1e", color: "#fff", border: "1px solid #444", borderRadius: 4, width: 200 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Start</label>
                    <input
                      type="date"
                      value={newPlanStart}
                      onChange={(e) => setNewPlanStart(e.target.value)}
                      style={{ padding: "6px 10px", background: "#1e1e1e", color: "#fff", border: "1px solid #444", borderRadius: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>End</label>
                    <input
                      type="date"
                      value={newPlanEnd}
                      onChange={(e) => setNewPlanEnd(e.target.value)}
                      style={{ padding: "6px 10px", background: "#1e1e1e", color: "#fff", border: "1px solid #444", borderRadius: 4 }}
                    />
                  </div>
                  <button
                    onClick={handleCreatePlan}
                    style={{ padding: "6px 14px", background: "#4a9eff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreatePlan(false)}
                    style={{ padding: "6px 14px", background: "#444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {loadingPlans ? (
              <div style={{ color: "#aaa", padding: 20 }}>Loading...</div>
            ) : mealPlans.length === 0 ? (
              <div style={{ color: "#aaa", padding: 20 }}>No meal plans yet. Create one to get started.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Start</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>End</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mealPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      style={{ borderBottom: "1px solid #2a2a2a", cursor: "pointer" }}
                      onClick={() => onOpenTab("meal-plan-detail", { mealPlanId: plan.id })}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "8px 12px", color: "#4a9eff" }}>{plan.name}</td>
                      <td style={{ padding: "8px 12px", color: "#ccc" }}>{plan.start_date?.slice(0, 10)}</td>
                      <td style={{ padding: "8px 12px", color: "#ccc" }}>{plan.end_date?.slice(0, 10)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete plan "${plan.name}"?`)) {
                              window.api.mealPlans.delete(plan.id).then(loadMealPlans);
                            }
                          }}
                          style={{ padding: "3px 8px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeSubTab === "shopping-lists" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: "#fff" }}>Shopping Lists</h3>
              <button
                onClick={handleCreateShoppingList}
                style={{
                  padding: "6px 14px",
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + New Shopping List
              </button>
            </div>

            {loadingLists ? (
              <div style={{ color: "#aaa", padding: 20 }}>Loading...</div>
            ) : shoppingLists.length === 0 ? (
              <div style={{ color: "#aaa", padding: 20 }}>No shopping lists yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Status</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Est. Total</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "#aaa", fontSize: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingLists.map((list) => (
                    <tr
                      key={list.id}
                      style={{ borderBottom: "1px solid #2a2a2a", cursor: "pointer" }}
                      onClick={() => onOpenTab("shopping-list-detail", { shoppingListId: list.id })}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "8px 12px", color: "#4a9eff" }}>{list.name}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            background: list.status === "completed" ? "#27ae6033" : "#4a9eff33",
                            color: list.status === "completed" ? "#27ae60" : "#4a9eff",
                          }}
                        >
                          {list.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#4caf50" }}>
                        {list.estimated_total != null ? `$${Number(list.estimated_total).toFixed(2)}` : "-"}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete list "${list.name}"?`)) {
                              window.api.shoppingLists.delete(list.id).then(loadShoppingLists);
                            }
                          }}
                          style={{ padding: "3px 8px", background: "#c0392b", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 11 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeSubTab === "budget" && (
          <div>
            <MealBudget profileId={profileId} />
            <div style={{ marginTop: 24 }}>
              <MealAnalytics profileId={profileId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
