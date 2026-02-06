import React, { useState, useEffect } from "react";
import TagSelector from "./TagSelector";
import { emitDataChange } from "../dataEvents";

const DayGrid = ({
  selected,
  onToggle,
  label,
}: {
  selected: string;
  onToggle: (day: number) => void;
  label: string;
}) => {
  // Parse selected string "1,5,10" into array of numbers
  const selectedDays = selected
    .split(",")
    .filter((x) => x.trim() !== "")
    .map((x) => parseInt(x.trim()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ color: "#ccc", fontSize: "0.9rem" }}>{label}</label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <div
            key={d}
            onClick={() => onToggle(d)}
            style={{
              padding: "6px 4px",
              textAlign: "center",
              fontSize: "0.8rem",
              cursor: "pointer",
              background: selectedDays.includes(d) ? "#007acc" : "#2d2d2d",
              color: selectedDays.includes(d) ? "#fff" : "#aaa",
              border: selectedDays.includes(d)
                ? "1px solid #005a9e"
                : "1px solid #444",
              borderRadius: 3,
              userSelect: "none",
            }}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
};

interface AutoBillFormProps {
  initialData?: any;
  profileId: number;
  onSave: () => void;
  onCancel: () => void;
}

export function AutoBillForm({
  initialData,
  profileId,
  onSave,
  onCancel,
}: AutoBillFormProps): React.JSX.Element {
  const [newBill, setNewBill] = useState({
    name: "",
    amount: "0",
    description: "",
    frequency: "monthly",
    due_day: "1",
    due_dates: "",
    generation_days: "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (initialData) {
      setNewBill({
        name: initialData.name,
        amount: initialData.amount.toString(),
        description: initialData.description || "",
        frequency: initialData.frequency,
        due_day: initialData.due_day.toString(),
        due_dates: initialData.due_dates || "",
        generation_days: initialData.generation_days || "",
      });
      // Load existing tags
      loadTags();
    }
  }, [initialData]);

  async function loadTags() {
    if (initialData?.id) {
      try {
        const tags = await window.api.tags.getForAutomaticBill(initialData.id);
        setSelectedTagIds(tags.map((t) => t.id));
      } catch (err) {
        console.error("Error loading tags:", err);
      }
    }
  }

  const handleCreateAuto = async () => {
    let billId: number;
    if (initialData?.id) {
      await window.api.bills.updateAutomatic(initialData.id, {
        name: newBill.name,
        amount: parseFloat(newBill.amount),
        description: newBill.description,
        due_dates: newBill.due_dates || undefined,
        generation_days: newBill.generation_days || undefined,
      });
      billId = initialData.id;
    } else {
      billId = await window.api.bills.createAutomatic({
        name: newBill.name,
        amount: parseFloat(newBill.amount),
        description: newBill.description,
        frequency: "monthly",
        due_day: 1,
        due_dates: newBill.due_dates || undefined,
        generation_days: newBill.generation_days || undefined,
        profileId,
      });
    }
    // Save tags
    await window.api.tags.setForAutomaticBill(billId, selectedTagIds);
    emitDataChange("auto-bills");
    onSave();
  };

  const toggleDay = (day: number, field: "due_dates" | "generation_days") => {
    const currentStr = newBill[field] || "";
    let days = currentStr
      .split(",")
      .filter((d) => d.trim() !== "")
      .map((d) => parseInt(d));

    if (days.includes(day)) {
      days = days.filter((d) => d !== day);
    } else {
      days.push(day);
    }

    setNewBill({ ...newBill, [field]: days.join(",") });
  };

  return (
    <div
      style={{
        padding: 20,
        color: "#f8fafc",
        background: "#0f172a",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2>{initialData ? "Edit Automatic Bill" : "New Automatic Bill"}</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 15,
          maxWidth: 500,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>Name</label>
          <input
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
            }}
            value={newBill.name}
            onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
            placeholder="e.g. Rent"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>Amount</label>
          <input
            type="number"
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
            }}
            value={newBill.amount}
            onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>
            Description
          </label>
          <textarea
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
              minHeight: 60,
            }}
            value={newBill.description}
            onChange={(e) =>
              setNewBill({ ...newBill, description: e.target.value })
            }
            placeholder="Optional notes..."
          />
        </div>

        <DayGrid
          label="Generation Days (When the bill is created)"
          selected={newBill.generation_days}
          onToggle={(d) => toggleDay(d, "generation_days")}
        />

        <DayGrid
          label="Due Days (When the bill is due)"
          selected={newBill.due_dates}
          onToggle={(d) => toggleDay(d, "due_dates")}
        />

        <TagSelector
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          profileId={profileId}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 10,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #555",
              color: "#ccc",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateAuto}
            style={{
              padding: "8px 16px",
              background: "#007acc",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {initialData ? "Save Changes" : "Create Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}
