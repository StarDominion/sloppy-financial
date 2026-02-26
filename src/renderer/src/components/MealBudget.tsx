import { useEffect, useState } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

type MealBudgetData = {
  id: number;
  profile_id: number;
  period_type: "weekly" | "monthly";
  budget_amount: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

interface MealBudgetProps {
  profileId: number;
}

export function MealBudget({ profileId }: MealBudgetProps) {
  const [budgets, setBudgets] = useState<MealBudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSpending, setCurrentSpending] = useState<number>(0);

  // Form state
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("monthly");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadData();
    const unsub = onDataChange("meal-budgets", loadData);
    return unsub;
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      setLoading(true);
      const data = await window.api.mealBudgets.list(profileId);
      setBudgets(data);

      // Find the active budget (most recent with a start_date <= now)
      const now = new Date().toISOString().split("T")[0];
      const active = data.find(
        (b: MealBudgetData) =>
          b.start_date <= now && (!b.end_date || b.end_date >= now),
      );

      if (active) {
        try {
          const spending = await window.api.mealBudgets.getSpending(
            profileId,
            active.start_date,
            active.end_date || now,
          );
          setCurrentSpending(spending);
        } catch {
          setCurrentSpending(0);
        }
      } else {
        setCurrentSpending(0);
      }
    } catch (err) {
      console.error("Error loading meal budgets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBudget() {
    if (!budgetAmount || !startDate) return;
    try {
      await window.api.mealBudgets.create({
        profileId,
        periodType,
        budgetAmount: parseFloat(budgetAmount),
        startDate: startDate,
        endDate: endDate || null,
      });
      emitDataChange("meal-budgets");
      setBudgetAmount("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      console.error("Error creating budget:", err);
    }
  }

  async function handleDeleteBudget(budgetId: number) {
    if (!confirm("Are you sure you want to delete this budget?")) return;
    try {
      await window.api.mealBudgets.delete(budgetId);
      emitDataChange("meal-budgets");
    } catch (err) {
      console.error("Error deleting budget:", err);
    }
  }

  // Find active budget
  const now = new Date().toISOString().split("T")[0];
  const activeBudget = budgets.find(
    (b) => b.start_date <= now && (!b.end_date || b.end_date >= now),
  );

  const spendingPercent = activeBudget
    ? (currentSpending / activeBudget.budget_amount) * 100
    : 0;

  const progressColor =
    spendingPercent > 100 ? "#cf222e" : spendingPercent >= 80 ? "#d4a017" : "#2da44e";

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading meal budgets...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2 style={{ margin: "0 0 24px 0" }}>Meal Budgets</h2>

      {/* Set Budget Form */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0" }}>Set Budget</h3>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 120 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Period Type
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as "weekly" | "monthly")}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
              }}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div style={{ minWidth: 120 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Budget Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              placeholder="$0.00"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              End Date (optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={handleCreateBudget}
            disabled={!budgetAmount || !startDate}
            style={{
              padding: "8px 20px",
              background: budgetAmount && startDate ? "#2da44e" : "#333",
              color: budgetAmount && startDate ? "#fff" : "#666",
              border: "none",
              borderRadius: 4,
              cursor: budgetAmount && startDate ? "pointer" : "not-allowed",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Save Budget
          </button>
        </div>
      </div>

      {/* Current Period Card */}
      {activeBudget && (
        <div
          style={{
            background: "#252525",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: "0 0 16px 0" }}>Current Period</h3>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: "#999" }}>
              {activeBudget.period_type === "weekly" ? "Weekly" : "Monthly"} Budget
            </span>
            <span>
              <span style={{ color: progressColor, fontWeight: "bold" }}>
                ${currentSpending.toFixed(2)}
              </span>
              {" / "}
              <span style={{ color: "#999" }}>${Number(activeBudget.budget_amount).toFixed(2)}</span>
            </span>
          </div>
          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: 20,
              background: "#1e1e1e",
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                width: `${Math.min(spendingPercent, 100)}%`,
                height: "100%",
                background: progressColor,
                borderRadius: 10,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontSize: 12,
              color: "#999",
            }}
          >
            <span>{spendingPercent.toFixed(1)}% spent</span>
            <span>
              {activeBudget.start_date}
              {activeBudget.end_date ? ` to ${activeBudget.end_date}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Budget History */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0" }}>Budget History</h3>
        {budgets.length === 0 ? (
          <p style={{ color: "#999" }}>No budgets set yet.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#999" }}>
                  Period Type
                </th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#999" }}>
                  Amount
                </th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#999" }}>Start</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#999" }}>End</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#999" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {budgets.map((budget) => (
                <tr key={budget.id} style={{ borderBottom: "1px solid #333" }}>
                  <td
                    style={{
                      padding: "8px 12px",
                      textTransform: "capitalize",
                    }}
                  >
                    {budget.period_type}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>
                    ${Number(budget.budget_amount).toFixed(2)}
                  </td>
                  <td style={{ padding: "8px 12px" }}>{budget.start_date}</td>
                  <td style={{ padding: "8px 12px", color: budget.end_date ? "#fff" : "#666" }}>
                    {budget.end_date || "Ongoing"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      style={{
                        padding: "4px 8px",
                        background: "transparent",
                        color: "#ff6b6b",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        textDecoration: "underline",
                      }}
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
    </div>
  );
}
