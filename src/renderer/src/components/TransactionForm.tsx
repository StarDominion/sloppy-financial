import React, { useEffect, useState, useRef } from "react";
import TagSelector from "./TagSelector";
import { onDataChange, emitDataChange } from "../dataEvents";

const TYPE_OPTIONS = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "transfer", label: "Transfer" },
  { value: "payment", label: "Payment" },
  { value: "refund", label: "Refund" },
  { value: "fee", label: "Fee" },
  { value: "interest", label: "Interest" },
  { value: "other", label: "Other" },
];

type BillRecord = {
  id: number;
  name: string;
  due_date: string;
  amount: number;
};

interface TransactionFormProps {
  profileId: number;
  onSave: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  profileId,
  onSave,
  onCancel,
}: TransactionFormProps): React.JSX.Element {
  const [billRecords, setBillRecords] = useState<BillRecord[]>([]);
  const [type, setType] = useState("other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reference, setReference] = useState("");
  const [billRecordId, setBillRecordId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBillRecords();
    return onDataChange("bills", loadBillRecords);
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBillRecords(): Promise<void> {
    try {
      const data = await window.api.bills.listRecords(profileId);
      setBillRecords(data);
    } catch (err) {
      console.error("Error loading bill records:", err);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const transactionId = await window.api.transactions.create({
        profileId,
        type,
        amount: parsedAmount,
        description: description || null,
        transaction_date: transactionDate,
        reference: reference || null,
        bill_record_id: billRecordId,
      });

      // Upload document if selected
      if (selectedFile) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const result = await window.api.minio.upload({
          name: selectedFile.name,
          mime: selectedFile.type,
          data: uint8Array,
        });
        await window.api.transactions.updateDocument(
          transactionId,
          result.objectName,
          result.originalName,
          result.md5Hash,
        );
      }

      // Save tags
      if (selectedTagIds.length > 0) {
        await window.api.tags.setForTransaction(transactionId, selectedTagIds);
      }

      emitDataChange("transactions");
      onSave();
    } catch (err) {
      console.error("Error saving transaction:", err);
      alert("Error saving transaction");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    background: "#1e1e1e",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 4,
    fontSize: 14,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2 style={{ marginTop: 0 }}>New Transaction</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 500,
        }}
      >
        {/* Type */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Type <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={inputStyle}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Amount <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
            required
          />
        </div>

        {/* Transaction Date */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Date <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details about this transaction..."
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
            }}
          />
        </div>

        {/* Reference */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Reference
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. confirmation #, check #"
            style={inputStyle}
          />
        </div>

        {/* Associated Bill */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Associated Bill (optional)
          </label>
          <select
            value={billRecordId ?? ""}
            onChange={(e) =>
              setBillRecordId(e.target.value ? Number(e.target.value) : null)
            }
            style={inputStyle}
          >
            <option value="">None</option>
            {billRecords.map((br) => (
              <option key={br.id} value={br.id}>
                {br.name} — ${br.amount} (due{" "}
                {new Date(br.due_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {/* Document Attachment */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Document Attachment
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "8px 16px",
                background: "#333",
                border: "1px solid #555",
                color: "#ddd",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              Choose File
            </button>
            {selectedFile && (
              <span style={{ color: "#aaa", fontSize: 13 }}>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        <TagSelector
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          profileId={profileId}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 24px",
              background: saving ? "#1a4a2e" : "#2da44e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            {saving ? "Saving..." : "Save Transaction"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "10px 24px",
              background: "#333",
              color: "#ddd",
              border: "1px solid #555",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
