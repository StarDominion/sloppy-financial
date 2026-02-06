import React, { useState } from "react";
import TagSelector from "./TagSelector";
import { emitDataChange } from "../dataEvents";

interface ManualBillFormProps {
  onSave: () => void;
  onCancel: () => void;
  profileId: number;
}

export function ManualBillForm({
  onSave,
  onCancel,
  profileId,
}: ManualBillFormProps): React.JSX.Element {
  const [manualBill, setManualBill] = useState({
    name: "",
    amount: "0",
    description: "",
    due_date: new Date().toISOString().split("T")[0],
    status: "unpaid",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const handleCreateManual = async () => {
    const billId = await window.api.bills.createRecord({
      name: manualBill.name,
      amount: parseFloat(manualBill.amount),
      description: manualBill.description || null,
      due_date: manualBill.due_date,
      status: manualBill.status as "paid" | "unpaid",
      profileId,
    });
    // Save tags
    await window.api.tags.setForBillRecord(billId, selectedTagIds);
    emitDataChange("bills");
    onSave();
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
      <h2>New Manual Bill Record</h2>
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
            value={manualBill.name}
            onChange={(e) =>
              setManualBill({ ...manualBill, name: e.target.value })
            }
            placeholder="e.g. Utilities"
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
            value={manualBill.amount}
            onChange={(e) =>
              setManualBill({ ...manualBill, amount: e.target.value })
            }
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>
            Description / Context
          </label>
          <textarea
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
              minHeight: 80,
              resize: "vertical",
            }}
            value={manualBill.description}
            onChange={(e) =>
              setManualBill({ ...manualBill, description: e.target.value })
            }
            placeholder="Optional notes or context for this bill..."
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>Date</label>
          <input
            type="date"
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
            }}
            value={manualBill.due_date}
            onChange={(e) =>
              setManualBill({ ...manualBill, due_date: e.target.value })
            }
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>Status</label>
          <select
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
            }}
            value={manualBill.status}
            onChange={(e) =>
              setManualBill({ ...manualBill, status: e.target.value })
            }
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
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
            onClick={handleCreateManual}
            style={{
              padding: "8px 16px",
              background: "#007acc",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            Create Record
          </button>
        </div>
      </div>
    </div>
  );
}
