import React, { useEffect, useState } from "react";
import { emitDataChange } from "../dataEvents";

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  nutrition_unit: string | null;
  current_price: number | null;
  current_price_qty: number | null;
  calories_per_unit: number | null;
  protein_per_unit: number | null;
  carbs_per_unit: number | null;
  fat_per_unit: number | null;
  dietary_tags: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PriceHistoryEntry = {
  id: number;
  ingredient_id: number;
  price: number;
  qty: number;
  store: string | null;
  recorded_date: string;
};

type Brand = {
  id: number;
  ingredient_id: number;
  name: string;
  url: string | null;
  created_at: string;
};

const UNIT_OPTIONS = [
  "g",
  "kg",
  "ml",
  "L",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "each",
  "unit",
];

const DIETARY_TAG_OPTIONS = [
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "keto",
  "low-carb",
];

interface IngredientDetailProps {
  ingredientId: number | null;
  profileId: number;
  onClose: () => void;
}

export function IngredientDetail({
  ingredientId,
  profileId,
  onClose,
}: IngredientDetailProps): React.JSX.Element {
  const isCreateMode = ingredientId === null;

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [nutritionUnit, setNutritionUnit] = useState("g");
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentPriceQty, setCurrentPriceQty] = useState("1");
  const [caloriesPerUnit, setCaloriesPerUnit] = useState("");
  const [proteinPerUnit, setProteinPerUnit] = useState("");
  const [carbsPerUnit, setCarbsPerUnit] = useState("");
  const [fatPerUnit, setFatPerUnit] = useState("");
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Price history
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [newPriceDate, setNewPriceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newPriceValue, setNewPriceValue] = useState("");
  const [newPriceQty, setNewPriceQty] = useState("1");
  const [newPriceStore, setNewPriceStore] = useState("");

  // Brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandUrl, setNewBrandUrl] = useState("");
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [editBrandUrl, setEditBrandUrl] = useState("");

  useEffect(() => {
    if (!isCreateMode) {
      loadIngredient();
      loadPriceHistory();
      loadBrands();
    }
  }, [ingredientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadIngredient(): Promise<void> {
    try {
      setLoading(true);
      const data: Ingredient = await window.api.ingredients.get(ingredientId!);
      setName(data.name);
      setUnit(data.unit);
      setNutritionUnit(data.nutrition_unit || data.unit || "g");
      setCurrentPrice(data.current_price != null ? String(data.current_price) : "");
      setCurrentPriceQty(
        data.current_price_qty != null ? String(data.current_price_qty) : "1",
      );
      setCaloriesPerUnit(
        data.calories_per_unit != null ? String(data.calories_per_unit) : "",
      );
      setProteinPerUnit(
        data.protein_per_unit != null ? String(data.protein_per_unit) : "",
      );
      setCarbsPerUnit(
        data.carbs_per_unit != null ? String(data.carbs_per_unit) : "",
      );
      setFatPerUnit(
        data.fat_per_unit != null ? String(data.fat_per_unit) : "",
      );
      setDietaryTags(
        data.dietary_tags
          ? data.dietary_tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      );
      setNotes(data.notes || "");
    } catch (err) {
      console.error("Error loading ingredient:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPriceHistory(): Promise<void> {
    if (ingredientId == null) return;
    try {
      const data = await window.api.ingredients.listPriceHistory(ingredientId);
      setPriceHistory(data);
    } catch (err) {
      console.error("Error loading price history:", err);
    }
  }

  async function handleSave(): Promise<void> {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        unit,
        nutritionUnit: nutritionUnit || null,
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
        currentPriceQty: currentPriceQty ? parseFloat(currentPriceQty) : undefined,
        caloriesPerUnit: caloriesPerUnit ? parseFloat(caloriesPerUnit) : null,
        proteinPerUnit: proteinPerUnit ? parseFloat(proteinPerUnit) : null,
        carbsPerUnit: carbsPerUnit ? parseFloat(carbsPerUnit) : null,
        fatPerUnit: fatPerUnit ? parseFloat(fatPerUnit) : null,
        dietaryTags: dietaryTags.length > 0 ? dietaryTags.join(", ") : null,
        notes: notes.trim() || null,
        profileId,
      };

      if (isCreateMode) {
        await window.api.ingredients.create(payload);
      } else {
        await window.api.ingredients.update(ingredientId!, payload);
      }
      emitDataChange("ingredients");
      onClose();
    } catch (err) {
      console.error("Error saving ingredient:", err);
      setError("Failed to save ingredient.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirm("Are you sure you want to delete this ingredient?")) return;
    try {
      await window.api.ingredients.delete(ingredientId!);
      emitDataChange("ingredients");
      onClose();
    } catch (err) {
      console.error("Error deleting ingredient:", err);
      setError("Failed to delete ingredient.");
    }
  }

  async function handleAddPrice(): Promise<void> {
    setError(null);
    if (!newPriceValue) {
      setError("Price is required.");
      return;
    }
    try {
      await window.api.ingredients.addPriceHistory({
        ingredientId: ingredientId!,
        price: parseFloat(newPriceValue),
        qty: newPriceQty ? parseFloat(newPriceQty) : 1,
        store: newPriceStore.trim() || null,
        recordedDate: newPriceDate,
      });
      setNewPriceValue("");
      setNewPriceQty("1");
      setNewPriceStore("");
      setNewPriceDate(new Date().toISOString().split("T")[0]);
      await loadPriceHistory();
      emitDataChange("ingredients");
    } catch (err) {
      console.error("Error adding price history:", err);
      setError("Failed to add price entry.");
    }
  }

  async function handleDeletePrice(priceId: number): Promise<void> {
    try {
      await window.api.ingredients.deletePriceHistory(priceId);
      await loadPriceHistory();
    } catch (err) {
      console.error("Error deleting price history:", err);
    }
  }

  async function loadBrands(): Promise<void> {
    if (ingredientId == null) return;
    try {
      const data = await window.api.ingredients.listBrands(ingredientId);
      setBrands(data);
    } catch (err) {
      console.error("Error loading brands:", err);
    }
  }

  async function handleAddBrand(): Promise<void> {
    setError(null);
    if (!newBrandName.trim()) {
      setError("Brand name is required.");
      return;
    }
    try {
      await window.api.ingredients.addBrand({
        ingredientId: ingredientId!,
        name: newBrandName.trim(),
        url: newBrandUrl.trim() || null,
      });
      setNewBrandName("");
      setNewBrandUrl("");
      await loadBrands();
    } catch (err) {
      console.error("Error adding brand:", err);
      setError("Failed to add brand.");
    }
  }

  async function handleUpdateBrand(brandId: number): Promise<void> {
    setError(null);
    if (!editBrandName.trim()) {
      setError("Brand name is required.");
      return;
    }
    try {
      await window.api.ingredients.updateBrand(brandId, {
        name: editBrandName.trim(),
        url: editBrandUrl.trim() || null,
      });
      setEditingBrandId(null);
      await loadBrands();
    } catch (err) {
      console.error("Error updating brand:", err);
      setError("Failed to update brand.");
    }
  }

  async function handleDeleteBrand(brandId: number): Promise<void> {
    try {
      await window.api.ingredients.deleteBrand(brandId);
      await loadBrands();
    } catch (err) {
      console.error("Error deleting brand:", err);
    }
  }

  function startEditBrand(brand: Brand): void {
    setEditingBrandId(brand.id);
    setEditBrandName(brand.name);
    setEditBrandUrl(brand.url || "");
  }

  function toggleDietaryTag(tag: string): void {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#999",
    fontSize: 13,
    marginBottom: 4,
  };

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: 14,
  };

  // Build price chart data
  const sortedHistory = [...priceHistory].sort(
    (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime(),
  );
  const pricePerUnits = sortedHistory.map((h) => {
    const p = typeof h.price === "string" ? parseFloat(h.price) : h.price;
    const q = typeof h.qty === "string" ? parseFloat(h.qty) : h.qty;
    return q > 0 ? p / q : p;
  });
  const maxPpu = pricePerUnits.length > 0 ? Math.max(...pricePerUnits) : 0;
  const minPpu = pricePerUnits.length > 0 ? Math.min(...pricePerUnits) : 0;

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading ingredient...</p>
      </div>
    );
  }

  // SVG line chart for price over time
  function renderPriceChart(): React.JSX.Element | null {
    if (sortedHistory.length < 2) return null;

    const chartW = 400;
    const chartH = 160;
    const padL = 50;
    const padR = 16;
    const padT = 16;
    const padB = 32;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    const range = maxPpu - minPpu;
    const yMin = range > 0 ? minPpu - range * 0.1 : minPpu - 0.5;
    const yMax = range > 0 ? maxPpu + range * 0.1 : maxPpu + 0.5;
    const yRange = yMax - yMin;

    const times = sortedHistory.map((h) => new Date(h.recorded_date).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const tRange = tMax - tMin || 1;

    const points = sortedHistory.map((_, i) => {
      const x = padL + (plotW * (times[i] - tMin)) / tRange;
      const y = padT + plotH - (plotH * (pricePerUnits[i] - yMin)) / yRange;
      return { x, y };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

    // Y-axis labels (3 ticks)
    const yTicks = [yMin, (yMin + yMax) / 2, yMax];

    // X-axis labels (first and last date)
    const firstDate = new Date(times[0]).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const lastDate = new Date(times[times.length - 1]).toLocaleDateString(undefined, { month: "short", day: "numeric" });

    return (
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 8px 0", color: "#999", fontSize: 13 }}>
          Price Over Time (per {unit})
        </h4>
        <svg
          width="100%"
          viewBox={`0 0 ${chartW} ${chartH}`}
          style={{ background: "#1a1a1a", borderRadius: 6, border: "1px solid #333" }}
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = padT + plotH - (plotH * (tick - yMin)) / yRange;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#333" strokeWidth={1} />
                <text x={padL - 6} y={y + 4} textAnchor="end" fill="#666" fontSize={10}>
                  ${tick.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          <text x={padL} y={chartH - 6} textAnchor="start" fill="#666" fontSize={10}>
            {firstDate}
          </text>
          <text x={padL + plotW} y={chartH - 6} textAnchor="end" fill="#666" fontSize={10}>
            {lastDate}
          </text>

          {/* Area fill */}
          <polygon
            points={`${points[0].x},${padT + plotH} ${polyline} ${points[points.length - 1].x},${padT + plotH}`}
            fill="#0e639c"
            opacity={0.15}
          />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#4a9eff"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#4a9eff" stroke="#1a1a1a" strokeWidth={1.5} />
          ))}
        </svg>
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
          alignItems: "flex-start",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0 }}>
          {isCreateMode ? "New Ingredient" : "Edit Ingredient"}
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {!isCreateMode && (
            <button
              onClick={handleDelete}
              style={{
                padding: "8px 16px",
                background: "#d9534f",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#333",
              color: "#ddd",
              border: "1px solid #555",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#3a2020",
            border: "1px solid #5a3030",
            color: "#f48771",
            padding: "10px 14px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Left column: Form */}
        <div
          style={{
            flex: isCreateMode ? 1 : "0 0 420px",
            maxWidth: isCreateMode ? 600 : 420,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#252525",
              borderRadius: 8,
              padding: 20,
            }}
          >
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ingredient name"
                style={inputStyle}
              />
            </div>

            {/* Pricing Section */}
            <div
              style={{
                border: "1px solid #333",
                borderRadius: 6,
                padding: 16,
                marginBottom: 18,
                background: "#1e1e1e",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", color: "#2da44e", fontSize: 14 }}>
                Price per Unit
              </h4>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Price Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={inputStyle}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Current Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Price Qty ({unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentPriceQty}
                    onChange={(e) => setCurrentPriceQty(e.target.value)}
                    placeholder="1"
                    style={inputStyle}
                  />
                </div>
              </div>
              {currentPrice && currentPriceQty && parseFloat(currentPriceQty) > 0 && (
                <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
                  = ${(parseFloat(currentPrice) / parseFloat(currentPriceQty)).toFixed(4)} per {unit}
                </div>
              )}
            </div>

            {/* Nutrition Section */}
            <div
              style={{
                border: "1px solid #333",
                borderRadius: 6,
                padding: 16,
                marginBottom: 18,
                background: "#1e1e1e",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", color: "#bf8700", fontSize: 14 }}>
                Nutrition per Unit
              </h4>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Nutrition Unit</label>
                <select
                  value={nutritionUnit}
                  onChange={(e) => setNutritionUnit(e.target.value)}
                  style={inputStyle}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Calories / {nutritionUnit}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={caloriesPerUnit}
                    onChange={(e) => setCaloriesPerUnit(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Protein (g) / {nutritionUnit}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={proteinPerUnit}
                    onChange={(e) => setProteinPerUnit(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Carbs (g) / {nutritionUnit}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={carbsPerUnit}
                    onChange={(e) => setCarbsPerUnit(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Fat (g) / {nutritionUnit}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fatPerUnit}
                    onChange={(e) => setFatPerUnit(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Dietary Tags</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {DIETARY_TAG_OPTIONS.map((tag) => {
                  const selected = dietaryTags.includes(tag);
                  return (
                    <label
                      key={tag}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        background: selected ? "#0e639c22" : "#1e1e1e",
                        border: `1px solid ${selected ? "#0e639c" : "#444"}`,
                        borderRadius: 4,
                        cursor: "pointer",
                        userSelect: "none",
                        color: selected ? "#4da6ff" : "#999",
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDietaryTag(tag)}
                        style={{ cursor: "pointer" }}
                      />
                      {tag}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 24px",
                background: saving ? "#555" : "#2da44e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: 14,
                width: "100%",
              }}
            >
              {saving
                ? "Saving..."
                : isCreateMode
                  ? "Create Ingredient"
                  : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Right column: Price History (edit mode only) */}
        {!isCreateMode && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                background: "#252525",
                borderRadius: 8,
                padding: 20,
              }}
            >
              <h3 style={{ margin: "0 0 16px 0" }}>Price History</h3>

              {/* Price Over Time Chart */}
              {renderPriceChart()}

              {/* Add Price Form */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Date</label>
                  <input
                    type="date"
                    value={newPriceDate}
                    onChange={(e) => setNewPriceDate(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: 140,
                    }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPriceValue}
                    onChange={(e) => setNewPriceValue(e.target.value)}
                    placeholder="0.00"
                    style={{
                      ...inputStyle,
                      width: 90,
                    }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Qty ({unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPriceQty}
                    onChange={(e) => setNewPriceQty(e.target.value)}
                    placeholder="1"
                    style={{
                      ...inputStyle,
                      width: 70,
                    }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Store</label>
                  <input
                    type="text"
                    value={newPriceStore}
                    onChange={(e) => setNewPriceStore(e.target.value)}
                    placeholder="Store name"
                    style={{
                      ...inputStyle,
                      width: 130,
                    }}
                  />
                </div>
                <button
                  onClick={handleAddPrice}
                  style={{
                    padding: "8px 16px",
                    background: "#0e639c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    height: 36,
                  }}
                >
                  Add Price
                </button>
              </div>

              {/* Price History Table */}
              {priceHistory.length === 0 ? (
                <p style={{ color: "#666", fontSize: 13 }}>
                  No price history recorded yet.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #444", textAlign: "left" }}>
                      <th style={{ padding: "8px 6px", color: "#999" }}>Date</th>
                      <th style={{ padding: "8px 6px", color: "#999" }}>Price</th>
                      <th style={{ padding: "8px 6px", color: "#999" }}>Qty</th>
                      <th style={{ padding: "8px 6px", color: "#999" }}>$/unit</th>
                      <th style={{ padding: "8px 6px", color: "#999" }}>Store</th>
                      <th style={{ padding: "8px 6px", color: "#999", textAlign: "center", width: 60 }}>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((entry) => {
                      const p = typeof entry.price === "string" ? parseFloat(entry.price) : entry.price;
                      const q = typeof entry.qty === "string" ? parseFloat(entry.qty) : entry.qty;
                      const ppu = q > 0 ? p / q : p;
                      return (
                        <tr
                          key={entry.id}
                          style={{ borderBottom: "1px solid #333" }}
                        >
                          <td style={{ padding: "8px 6px", color: "#aaa" }}>
                            {new Date(entry.recorded_date).toLocaleDateString()}
                          </td>
                          <td style={{ padding: "8px 6px", color: "#2da44e", fontWeight: 500 }}>
                            ${p.toFixed(2)}
                          </td>
                          <td style={{ padding: "8px 6px", color: "#aaa" }}>
                            {q} {unit}
                          </td>
                          <td style={{ padding: "8px 6px", color: "#4a9eff", fontWeight: 500 }}>
                            ${ppu.toFixed(4)}
                          </td>
                          <td style={{ padding: "8px 6px", color: "#aaa" }}>
                            {entry.store || "--"}
                          </td>
                          <td style={{ padding: "8px 6px", textAlign: "center" }}>
                            <button
                              onClick={() => handleDeletePrice(entry.id)}
                              style={{
                                padding: "2px 8px",
                                background: "#3a2020",
                                color: "#f48771",
                                border: "1px solid #555",
                                borderRadius: 3,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Brands Section */}
            <div
              style={{
                background: "#252525",
                borderRadius: 8,
                padding: 20,
                marginTop: 16,
              }}
            >
              <h3 style={{ margin: "0 0 16px 0" }}>Brands</h3>

              {/* Add Brand Form */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 140px" }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Brand Name</label>
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Brand name"
                    style={{ ...inputStyle, width: "100%" }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                  />
                </div>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>URL</label>
                  <input
                    type="text"
                    value={newBrandUrl}
                    onChange={(e) => setNewBrandUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ ...inputStyle, width: "100%" }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                  />
                </div>
                <button
                  onClick={handleAddBrand}
                  style={{
                    padding: "8px 16px",
                    background: "#0e639c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    height: 36,
                    whiteSpace: "nowrap",
                  }}
                >
                  Add Brand
                </button>
              </div>

              {/* Brands Table */}
              {brands.length === 0 ? (
                <p style={{ color: "#666", fontSize: 13 }}>
                  No brands added yet.
                </p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid #444", textAlign: "left" }}>
                      <th style={{ padding: "8px 6px", color: "#999" }}>Brand</th>
                      <th style={{ padding: "8px 6px", color: "#999" }}>URL</th>
                      <th style={{ padding: "8px 6px", color: "#999", textAlign: "center", width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {brands.map((brand) => (
                      <tr key={brand.id} style={{ borderBottom: "1px solid #333" }}>
                        {editingBrandId === brand.id ? (
                          <>
                            <td style={{ padding: "6px" }}>
                              <input
                                type="text"
                                value={editBrandName}
                                onChange={(e) => setEditBrandName(e.target.value)}
                                style={{ ...inputStyle, padding: "4px 8px", fontSize: 13 }}
                                onKeyDown={(e) => e.key === "Enter" && handleUpdateBrand(brand.id)}
                              />
                            </td>
                            <td style={{ padding: "6px" }}>
                              <input
                                type="text"
                                value={editBrandUrl}
                                onChange={(e) => setEditBrandUrl(e.target.value)}
                                style={{ ...inputStyle, padding: "4px 8px", fontSize: 13 }}
                                onKeyDown={(e) => e.key === "Enter" && handleUpdateBrand(brand.id)}
                              />
                            </td>
                            <td style={{ padding: "6px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                <button
                                  onClick={() => handleUpdateBrand(brand.id)}
                                  style={{
                                    padding: "2px 8px",
                                    background: "#2da44e",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    fontSize: 12,
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingBrandId(null)}
                                  style={{
                                    padding: "2px 8px",
                                    background: "#333",
                                    color: "#aaa",
                                    border: "1px solid #555",
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    fontSize: 12,
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: "8px 6px", color: "#ddd" }}>
                              {brand.name}
                            </td>
                            <td style={{ padding: "8px 6px", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {brand.url ? (
                                <a
                                  href={brand.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#4a9eff", textDecoration: "none" }}
                                  title={brand.url}
                                >
                                  {brand.url.replace(/^https?:\/\//, "").slice(0, 40)}
                                  {brand.url.replace(/^https?:\/\//, "").length > 40 ? "..." : ""}
                                </a>
                              ) : (
                                <span style={{ color: "#555" }}>--</span>
                              )}
                            </td>
                            <td style={{ padding: "8px 6px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                                <button
                                  onClick={() => startEditBrand(brand)}
                                  style={{
                                    padding: "2px 8px",
                                    background: "#1e1e1e",
                                    color: "#aaa",
                                    border: "1px solid #555",
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    fontSize: 12,
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteBrand(brand.id)}
                                  style={{
                                    padding: "2px 8px",
                                    background: "#3a2020",
                                    color: "#f48771",
                                    border: "1px solid #555",
                                    borderRadius: 3,
                                    cursor: "pointer",
                                    fontSize: 12,
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
