import { useEffect, useState } from "react";

type Recipe = {
  id: number;
  name: string;
  servings: number;
  ingredients?: RecipeIngredient[];
};

type RecipeCost = {
  totalCost: number;
  costPerServing: number;
};

type RecipeIngredient = {
  id: number;
  ingredient_name: string;
  quantity: number | null;
  ingredient_unit: string | null;
};

type MealBudgetData = {
  id: number;
  period_type: "weekly" | "monthly";
  budget_amount: number;
  start_date: string;
  end_date: string | null;
};

type BudgetSpendingEntry = {
  budget: MealBudgetData;
  spending: number;
};

type IngredientCount = {
  name: string;
  count: number;
};

interface MealAnalyticsProps {
  profileId: number;
}

export function MealAnalytics({ profileId }: MealAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [costData, setCostData] = useState<
    { name: string; costPerServing: number }[]
  >([]);
  const [budgetSpending, setBudgetSpending] = useState<BudgetSpendingEntry[]>([]);
  const [topIngredients, setTopIngredients] = useState<IngredientCount[]>([]);

  useEffect(() => {
    loadAllData();
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAllData() {
    try {
      setLoading(true);
      await Promise.all([
        loadCostPerServing(),
        loadBudgetVsSpending(),
        loadTopIngredients(),
      ]);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCostPerServing() {
    try {
      const recipes: Recipe[] = await window.api.recipes.list(profileId);
      const costs: { name: string; costPerServing: number }[] = [];

      for (const recipe of recipes) {
        try {
          const cost: RecipeCost = await window.api.recipes.getCost(recipe.id);
          costs.push({
            name: recipe.name,
            costPerServing: cost.costPerServing,
          });
        } catch {
          // skip recipes without cost data
        }
      }

      costs.sort((a, b) => b.costPerServing - a.costPerServing);
      setCostData(costs);
    } catch (err) {
      console.error("Error loading cost data:", err);
    }
  }

  async function loadBudgetVsSpending() {
    try {
      const budgets: MealBudgetData[] = await window.api.mealBudgets.list(profileId);
      const entries: BudgetSpendingEntry[] = [];

      for (const budget of budgets) {
        try {
          const now = new Date().toISOString().split("T")[0];
          const spending = await window.api.mealBudgets.getSpending(
            profileId,
            budget.start_date,
            budget.end_date || now,
          );
          entries.push({ budget, spending });
        } catch {
          entries.push({ budget, spending: 0 });
        }
      }

      setBudgetSpending(entries);
    } catch (err) {
      console.error("Error loading budget spending:", err);
    }
  }

  async function loadTopIngredients() {
    try {
      const recipes: Recipe[] = await window.api.recipes.list(profileId);
      const ingredientMap = new Map<string, number>();

      for (const recipe of recipes) {
        try {
          const ingredients: RecipeIngredient[] =
            await window.api.recipes.getIngredients(recipe.id);
          for (const ing of ingredients) {
            const name = ing.ingredient_name.toLowerCase().trim();
            ingredientMap.set(name, (ingredientMap.get(name) || 0) + 1);
          }
        } catch {
          // skip
        }
      }

      const sorted = Array.from(ingredientMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopIngredients(sorted);
    } catch (err) {
      console.error("Error loading ingredients:", err);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const maxCost = costData.length > 0
    ? Math.max(...costData.map((d) => d.costPerServing))
    : 1;

  const maxSpendingOrBudget = budgetSpending.length > 0
    ? Math.max(
        ...budgetSpending.map((e) => Math.max(e.budget.budget_amount, e.spending)),
      )
    : 1;

  const maxIngredientCount = topIngredients.length > 0
    ? topIngredients[0].count
    : 1;

  const barColors = [
    "#0969da",
    "#2da44e",
    "#d4a017",
    "#cf222e",
    "#6b46c1",
    "#e05d44",
    "#1f9bcf",
    "#36a64f",
    "#c678dd",
    "#e5c07b",
  ];

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2 style={{ margin: "0 0 24px 0" }}>Meal Analytics</h2>

      {/* Cost Per Serving Chart */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0" }}>Cost Per Serving</h3>
        {costData.length === 0 ? (
          <p style={{ color: "#999" }}>
            No recipe cost data available. Add recipes with ingredients and prices to see
            analytics.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {costData.map((item, idx) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 140,
                    fontSize: 13,
                    color: "#ccc",
                    textAlign: "right",
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      width: `${(item.costPerServing / maxCost) * 100}%`,
                      height: 24,
                      background: barColors[idx % barColors.length],
                      borderRadius: 4,
                      minWidth: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 70,
                    fontSize: 13,
                    color: "#999",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  ${item.costPerServing.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget vs Spending Chart */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0" }}>Budget vs Spending</h3>
        {budgetSpending.length === 0 ? (
          <p style={{ color: "#999" }}>No budget data available.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {budgetSpending.map((entry) => {
              const label = `${entry.budget.period_type} (${entry.budget.start_date})`;
              return (
                <div key={entry.budget.id}>
                  <div style={{ fontSize: 13, color: "#ccc", marginBottom: 6 }}>
                    {label}
                  </div>
                  {/* Budget bar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ width: 60, fontSize: 12, color: "#999" }}>Budget</span>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div
                        style={{
                          width: `${(entry.budget.budget_amount / maxSpendingOrBudget) * 100}%`,
                          height: 18,
                          background: "#0969da",
                          borderRadius: 4,
                          minWidth: 2,
                        }}
                      />
                    </div>
                    <span style={{ width: 70, fontSize: 12, color: "#999", textAlign: "right" }}>
                      ${Number(entry.budget.budget_amount).toFixed(2)}
                    </span>
                  </div>
                  {/* Spending bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 60, fontSize: 12, color: "#999" }}>Spent</span>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div
                        style={{
                          width: `${(entry.spending / maxSpendingOrBudget) * 100}%`,
                          height: 18,
                          background:
                            entry.spending > entry.budget.budget_amount
                              ? "#cf222e"
                              : entry.spending >= entry.budget.budget_amount * 0.8
                                ? "#d4a017"
                                : "#2da44e",
                          borderRadius: 4,
                          minWidth: 2,
                        }}
                      />
                    </div>
                    <span style={{ width: 70, fontSize: 12, color: "#999", textAlign: "right" }}>
                      ${entry.spending.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 12, color: "#999" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, background: "#0969da", borderRadius: 2 }} />
            Budget
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, background: "#2da44e", borderRadius: 2 }} />
            Under 80%
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, background: "#d4a017", borderRadius: 2 }} />
            80-100%
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, background: "#cf222e", borderRadius: 2 }} />
            Over 100%
          </div>
        </div>
      </div>

      {/* Top Ingredients by Usage */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0" }}>Top Ingredients by Usage</h3>
        {topIngredients.length === 0 ? (
          <p style={{ color: "#999" }}>
            No ingredient data available. Add recipes with ingredients to see analytics.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topIngredients.map((item, idx) => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 140,
                    fontSize: 13,
                    color: "#ccc",
                    textAlign: "right",
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textTransform: "capitalize",
                  }}
                  title={item.name}
                >
                  {item.name}
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <div
                    style={{
                      width: `${(item.count / maxIngredientCount) * 100}%`,
                      height: 24,
                      background: barColors[idx % barColors.length],
                      borderRadius: 4,
                      minWidth: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 50,
                    fontSize: 13,
                    color: "#999",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {item.count}x
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
