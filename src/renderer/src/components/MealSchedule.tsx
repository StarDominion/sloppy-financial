import React, { useState, useEffect, useCallback } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

interface MealScheduleProps {
  mealPlanId: number;
  profileId: number;
  onGenerateShoppingList: (shoppingListId: number) => void;
  onClose: () => void;
}

type MealPlan = {
  id: number;
  profile_id: number;
  name: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MealEntry = {
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

type DailyNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDate(s: string): Date {
  if (s.includes("T")) return new Date(s);
  return new Date(s + "T00:00:00");
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getWeekDays(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(monday, i));
  }
  return days;
}

// Styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    backgroundColor: "#1e1e1e",
    color: "#fff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    backgroundColor: "#252525",
    borderBottom: "1px solid #333",
    flexShrink: 0,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  nameInput: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#fff",
    fontSize: "18px",
    fontWeight: 600 as const,
    padding: "4px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    minWidth: "150px",
  },
  nameInputFocused: {
    borderColor: "#4a9eff",
    backgroundColor: "#333",
    outline: "none",
  },
  dateRange: {
    fontSize: "13px",
    color: "#aaa",
    whiteSpace: "nowrap" as const,
  },
  navBtn: {
    background: "#333",
    border: "1px solid #444",
    color: "#ccc",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  actionBtn: {
    background: "#4a9eff",
    border: "none",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500 as const,
  },
  secondaryBtn: {
    background: "#333",
    border: "1px solid #444",
    color: "#ccc",
    padding: "6px 14px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: "20px",
    cursor: "pointer",
    padding: "4px 8px",
    lineHeight: 1,
  },
  gridWrapper: {
    flex: 1,
    overflow: "auto",
    padding: "12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "90px repeat(7, 1fr)",
    gap: "1px",
    backgroundColor: "#333",
    border: "1px solid #333",
    borderRadius: "6px",
    overflow: "hidden",
  },
  headerCell: {
    backgroundColor: "#2a2a2a",
    padding: "10px 8px",
    textAlign: "center" as const,
    fontSize: "13px",
    fontWeight: 600 as const,
    color: "#ccc",
  },
  headerCellToday: {
    color: "#4a9eff",
  },
  slotLabel: {
    backgroundColor: "#252525",
    padding: "10px 8px",
    fontSize: "12px",
    fontWeight: 500 as const,
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mealCell: {
    backgroundColor: "#252525",
    padding: "6px",
    minHeight: "70px",
    cursor: "pointer",
    position: "relative" as const,
    transition: "background-color 0.15s",
  },
  mealCellHover: {
    backgroundColor: "#2d2d2d",
  },
  entryChip: {
    backgroundColor: "#333",
    borderRadius: "4px",
    padding: "4px 6px",
    marginBottom: "3px",
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4px",
    cursor: "pointer",
  },
  entryName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
    color: "#ddd",
  },
  servingsBadge: {
    backgroundColor: "#4a9eff",
    color: "#fff",
    borderRadius: "3px",
    padding: "1px 4px",
    fontSize: "10px",
    fontWeight: 600 as const,
    flexShrink: 0,
  },
  leftoverBadge: {
    backgroundColor: "#10b981",
    color: "#fff",
    borderRadius: "3px",
    padding: "1px 4px",
    fontSize: "10px",
    fontWeight: 600 as const,
    flexShrink: 0,
  },
  addHint: {
    color: "#555",
    fontSize: "18px",
    textAlign: "center" as const,
    padding: "8px 0",
  },
  nutritionRow: {
    backgroundColor: "#1e1e1e",
    padding: "6px 4px",
    fontSize: "10px",
    color: "#888",
    textAlign: "center" as const,
    lineHeight: 1.5,
  },
  nutritionLabel: {
    backgroundColor: "#1e1e1e",
    padding: "6px 4px",
    fontSize: "10px",
    color: "#666",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 500 as const,
  },
  // Modal styles
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#252525",
    borderRadius: "8px",
    border: "1px solid #333",
    width: "480px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column" as const,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    padding: "16px",
    borderBottom: "1px solid #333",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: "16px",
    fontWeight: 600 as const,
    margin: 0,
  },
  modalBody: {
    padding: "12px 16px",
    overflowY: "auto" as const,
    flex: 1,
  },
  modalFooter: {
    padding: "12px 16px",
    borderTop: "1px solid #333",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
  searchInput: {
    width: "100%",
    padding: "8px 10px",
    backgroundColor: "#333",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#fff",
    fontSize: "13px",
    marginBottom: "8px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  filterRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "10px",
    flexWrap: "wrap" as const,
  },
  filterBtn: {
    padding: "4px 10px",
    borderRadius: "12px",
    border: "1px solid #444",
    background: "#333",
    color: "#ccc",
    fontSize: "11px",
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "#4a9eff",
    borderColor: "#4a9eff",
    color: "#fff",
  },
  recipeItem: {
    padding: "8px 10px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2px",
    fontSize: "13px",
    color: "#ddd",
  },
  recipeItemHover: {
    backgroundColor: "#333",
  },
  recipeMealType: {
    fontSize: "11px",
    color: "#888",
    textTransform: "capitalize" as const,
  },
  servingsInput: {
    width: "50px",
    padding: "4px 6px",
    backgroundColor: "#333",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#fff",
    fontSize: "13px",
    textAlign: "center" as const,
  },
  // Entry edit modal
  entryModalBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  formLabel: {
    fontSize: "12px",
    color: "#aaa",
  },
  dangerBtn: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
};

export function MealSchedule({
  mealPlanId,
  profileId,
  onGenerateShoppingList,
  onClose,
}: MealScheduleProps): React.JSX.Element {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dailyNutrition, setDailyNutrition] = useState<Record<string, DailyNutrition>>({});
  const [leftovers, setLeftovers] = useState<Record<string, number>>({});
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Recipe picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState("");
  const [pickerSlot, setPickerSlot] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState("all");
  const [pickerServings, setPickerServings] = useState(1);
  const [hoveredRecipe, setHoveredRecipe] = useState<number | null>(null);

  // Entry edit modal
  const [editEntry, setEditEntry] = useState<MealEntry | null>(null);
  const [editServings, setEditServings] = useState(1);

  // Hover tracking for cells
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const plan = await window.api.mealPlans.get(mealPlanId);
    if (plan) {
      setMealPlan(plan);
      setNameValue(plan.name);
    }
    const ents = await window.api.mealPlans.listEntries(mealPlanId);
    setEntries(ents);
  }, [mealPlanId]);

  const loadRecipes = useCallback(async () => {
    const r = await window.api.recipes.list(profileId);
    setRecipes(r);
  }, [profileId]);

  // Load nutrition for the visible week
  const loadNutrition = useCallback(async () => {
    if (!mealPlan) return;
    const days = getWeekDays(weekStart);
    const nutritionMap: Record<string, DailyNutrition> = {};
    for (const day of days) {
      const dateStr = formatDateStr(day);
      try {
        const n = await window.api.mealPlans.getDailyNutrition(mealPlanId, dateStr);
        nutritionMap[dateStr] = n;
      } catch {
        nutritionMap[dateStr] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
    }
    setDailyNutrition(nutritionMap);
  }, [mealPlanId, mealPlan, weekStart]);

  // Load leftovers for visible entries
  const loadLeftovers = useCallback(async () => {
    const leftoverMap: Record<string, number> = {};
    const days = getWeekDays(weekStart);
    for (const day of days) {
      const dateStr = formatDateStr(day);
      const dayEntries = entries.filter((e) => e.plan_date === dateStr || e.plan_date.startsWith(dateStr));
      const seenRecipes = new Set<number>();
      for (const entry of dayEntries) {
        if (seenRecipes.has(entry.recipe_id)) continue;
        seenRecipes.add(entry.recipe_id);
        try {
          const count = await window.api.mealPlans.getLeftovers(mealPlanId, dateStr, entry.recipe_id);
          leftoverMap[`${dateStr}-${entry.recipe_id}`] = count;
        } catch {
          // ignore
        }
      }
    }
    setLeftovers(leftoverMap);
  }, [mealPlanId, entries, weekStart]);

  useEffect(() => {
    loadData();
    loadRecipes();
    const unsub = onDataChange("meal-plans", loadData);
    const unsub2 = onDataChange("recipes", loadRecipes);
    return () => {
      unsub();
      unsub2();
    };
  }, [loadData, loadRecipes]);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  useEffect(() => {
    loadLeftovers();
  }, [loadLeftovers]);

  // Clamp week to plan date range on plan load
  useEffect(() => {
    if (mealPlan) {
      const planStart = parseDate(mealPlan.start_date);
      const planMonday = getMonday(planStart);
      setWeekStart(planMonday);
    }
  }, [mealPlan?.id]);

  const weekDays = getWeekDays(weekStart);
  const todayStr = formatDateStr(new Date());

  // Navigation
  const canGoPrev = mealPlan
    ? getMonday(addDays(weekStart, -7)) >= getMonday(parseDate(mealPlan.start_date))
    : false;
  const canGoNext = mealPlan
    ? weekStart < getMonday(parseDate(mealPlan.end_date))
    : false;

  const goWeek = (dir: number) => {
    const newStart = addDays(weekStart, dir * 7);
    setWeekStart(getMonday(newStart));
  };

  // Name editing
  const handleNameBlur = async () => {
    setEditingName(false);
    if (mealPlan && nameValue.trim() && nameValue.trim() !== mealPlan.name) {
      await window.api.mealPlans.update(mealPlanId, { name: nameValue.trim() });
      emitDataChange("meal-plans");
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setNameValue(mealPlan?.name || "");
      setEditingName(false);
    }
  };

  // Get entries for a specific cell
  const getCellEntries = (dateStr: string, slot: string): MealEntry[] => {
    return entries.filter((e) => {
      const entryDate = e.plan_date.includes("T") ? e.plan_date.split("T")[0] : e.plan_date;
      return entryDate === dateStr && e.meal_slot === slot;
    });
  };

  // Open recipe picker
  const openPicker = (dateStr: string, slot: string) => {
    setPickerDate(dateStr);
    setPickerSlot(slot);
    setPickerSearch("");
    setPickerFilter("all");
    setPickerServings(1);
    setPickerOpen(true);
  };

  // Assign recipe
  const assignRecipe = async (recipeId: number) => {
    await window.api.mealPlans.createEntry({
      mealPlanId,
      recipeId,
      planDate: pickerDate,
      mealSlot: pickerSlot,
      servingsToEat: pickerServings,
    });
    emitDataChange("meal-plans");
    setPickerOpen(false);
  };

  // Edit entry
  const openEntryEdit = (entry: MealEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditEntry(entry);
    setEditServings(entry.servings_to_eat);
  };

  const saveEntryEdit = async () => {
    if (!editEntry) return;
    await window.api.mealPlans.updateEntry(editEntry.id, {
      servingsToEat: editServings,
    });
    emitDataChange("meal-plans");
    setEditEntry(null);
  };

  const deleteEntry = async () => {
    if (!editEntry) return;
    await window.api.mealPlans.deleteEntry(editEntry.id);
    emitDataChange("meal-plans");
    setEditEntry(null);
  };

  // Actions
  const handleSyncCalendar = async () => {
    await window.api.mealPlans.syncToCalendar(mealPlanId, profileId);
    emitDataChange("calendar-events");
  };

  const handleGenerateShoppingList = async () => {
    const newListId = await window.api.shoppingLists.generateFromPlan(mealPlanId, profileId);
    emitDataChange("shopping-lists");
    onGenerateShoppingList(newListId);
  };

  // Filter recipes for picker
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(pickerSearch.toLowerCase());
    const matchesFilter = pickerFilter === "all" || r.meal_type === pickerFilter;
    return matchesSearch && matchesFilter;
  });

  const mealTypes = Array.from(new Set(recipes.map((r) => r.meal_type))).filter(Boolean);

  // Format date range display
  const dateRangeLabel = mealPlan
    ? `${parseDate(mealPlan.start_date).toLocaleDateString([], { month: "short", day: "numeric" })} - ${parseDate(mealPlan.end_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
    : "";

  const weekLabel = `${weekDays[0].toLocaleDateString([], { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString([], { month: "short", day: "numeric" })}`;

  if (!mealPlan) {
    return (
      <div style={{ ...styles.container, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Loading meal plan...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <input
            style={{
              ...styles.nameInput,
              ...(editingName ? styles.nameInputFocused : {}),
            }}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onFocus={() => setEditingName(true)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
          />
          <span style={styles.dateRange}>{dateRangeLabel}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "12px" }}>
            <button
              style={{ ...styles.navBtn, opacity: canGoPrev ? 1 : 0.4 }}
              onClick={() => canGoPrev && goWeek(-1)}
              disabled={!canGoPrev}
            >
              &#8249;
            </button>
            <span style={{ fontSize: "13px", color: "#aaa", minWidth: "140px", textAlign: "center" }}>
              {weekLabel}
            </span>
            <button
              style={{ ...styles.navBtn, opacity: canGoNext ? 1 : 0.4 }}
              onClick={() => canGoNext && goWeek(1)}
              disabled={!canGoNext}
            >
              &#8250;
            </button>
          </div>
        </div>
        <div style={styles.topBarRight}>
          <button style={styles.secondaryBtn} onClick={handleSyncCalendar}>
            Sync to Calendar
          </button>
          <button style={styles.actionBtn} onClick={handleGenerateShoppingList}>
            Generate Shopping List
          </button>
          <button style={styles.closeBtn} onClick={onClose}>
            &#215;
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={styles.gridWrapper}>
        <div style={styles.grid}>
          {/* Header row */}
          <div style={styles.headerCell} />
          {weekDays.map((day, i) => {
            const dateStr = formatDateStr(day);
            const isToday = dateStr === todayStr;
            return (
              <div
                key={i}
                style={{
                  ...styles.headerCell,
                  ...(isToday ? styles.headerCellToday : {}),
                }}
              >
                <div>{DAY_LABELS[i]}</div>
                <div style={{ fontSize: "16px", fontWeight: 700, marginTop: "2px" }}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}

          {/* Meal slot rows */}
          {MEAL_SLOTS.map((slot) => (
            <React.Fragment key={slot}>
              <div style={styles.slotLabel}>{slot}</div>
              {weekDays.map((day, i) => {
                const dateStr = formatDateStr(day);
                const cellKey = `${dateStr}-${slot}`;
                const cellEntries = getCellEntries(dateStr, slot);
                const isHovered = hoveredCell === cellKey;
                return (
                  <div
                    key={i}
                    style={{
                      ...styles.mealCell,
                      ...(isHovered ? styles.mealCellHover : {}),
                    }}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => openPicker(dateStr, slot)}
                  >
                    {cellEntries.map((entry) => {
                      const leftoverKey = `${dateStr}-${entry.recipe_id}`;
                      const leftoverCount = leftovers[leftoverKey];
                      return (
                        <div
                          key={entry.id}
                          style={styles.entryChip}
                          onClick={(e) => openEntryEdit(entry, e)}
                          title={`${entry.recipe_name || "Recipe"} - ${entry.servings_to_eat} serving(s)`}
                        >
                          <span style={styles.entryName}>
                            {entry.recipe_name || `Recipe #${entry.recipe_id}`}
                          </span>
                          <span style={styles.servingsBadge}>{entry.servings_to_eat}s</span>
                          {leftoverCount !== undefined && leftoverCount > 0 && (
                            <span style={styles.leftoverBadge} title={`${leftoverCount} leftover(s)`}>
                              +{leftoverCount}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {cellEntries.length === 0 && isHovered && (
                      <div style={styles.addHint}>+</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* Daily nutrition totals row */}
          <div style={styles.nutritionLabel}>Totals</div>
          {weekDays.map((day, i) => {
            const dateStr = formatDateStr(day);
            const n = dailyNutrition[dateStr];
            return (
              <div key={i} style={styles.nutritionRow}>
                {n ? (
                  <>
                    <div>{Math.round(n.calories)} cal</div>
                    <div>P: {Math.round(n.protein)}g</div>
                    <div>C: {Math.round(n.carbs)}g</div>
                    <div>F: {Math.round(n.fat)}g</div>
                  </>
                ) : (
                  <div style={{ color: "#555" }}>--</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recipe Picker Modal */}
      {pickerOpen && (
        <div style={styles.overlay} onClick={() => setPickerOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Add Recipe - {pickerSlot} ({pickerDate})
              </h3>
              <button style={styles.closeBtn} onClick={() => setPickerOpen(false)}>
                &#215;
              </button>
            </div>
            <div style={styles.modalBody}>
              <input
                style={styles.searchInput}
                placeholder="Search recipes..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />
              <div style={styles.filterRow}>
                <button
                  style={{
                    ...styles.filterBtn,
                    ...(pickerFilter === "all" ? styles.filterBtnActive : {}),
                  }}
                  onClick={() => setPickerFilter("all")}
                >
                  All
                </button>
                {mealTypes.map((mt) => (
                  <button
                    key={mt}
                    style={{
                      ...styles.filterBtn,
                      ...(pickerFilter === mt ? styles.filterBtnActive : {}),
                    }}
                    onClick={() => setPickerFilter(mt)}
                  >
                    {mt}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", color: "#aaa" }}>Servings:</span>
                <input
                  type="number"
                  min={1}
                  style={styles.servingsInput}
                  value={pickerServings}
                  onChange={(e) => setPickerServings(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {filteredRecipes.length === 0 && (
                  <div style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                    No recipes found
                  </div>
                )}
                {filteredRecipes.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      ...styles.recipeItem,
                      ...(hoveredRecipe === r.id ? styles.recipeItemHover : {}),
                    }}
                    onMouseEnter={() => setHoveredRecipe(r.id)}
                    onMouseLeave={() => setHoveredRecipe(null)}
                    onClick={() => assignRecipe(r.id)}
                  >
                    <span>{r.name}</span>
                    <span style={styles.recipeMealType}>{r.meal_type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entry Edit Modal */}
      {editEntry && (
        <div style={styles.overlay} onClick={() => setEditEntry(null)}>
          <div
            style={{ ...styles.modal, width: "340px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editEntry.recipe_name || `Recipe #${editEntry.recipe_id}`}
              </h3>
              <button style={styles.closeBtn} onClick={() => setEditEntry(null)}>
                &#215;
              </button>
            </div>
            <div style={styles.entryModalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Servings to eat</label>
                <input
                  type="number"
                  min={1}
                  style={{ ...styles.servingsInput, width: "80px" }}
                  value={editServings}
                  onChange={(e) => setEditServings(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>
                Meal slot: {editEntry.meal_slot}
                <br />
                Date: {editEntry.plan_date}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.dangerBtn} onClick={deleteEntry}>
                Delete
              </button>
              <div style={{ flex: 1 }} />
              <button style={styles.secondaryBtn} onClick={() => setEditEntry(null)}>
                Cancel
              </button>
              <button style={styles.actionBtn} onClick={saveEntryEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
