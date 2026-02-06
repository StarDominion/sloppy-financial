import React, { useEffect, useState, useRef } from "react";
import TagSelector from "./TagSelector";
import { onDataChange, emitDataChange } from "../dataEvents";

const CATEGORY_OPTIONS = [
  { value: "employment_income", label: "Employment Income" },
  { value: "freelance_income", label: "Freelance Income" },
  { value: "investment_income", label: "Investment Income" },
  { value: "rental_income", label: "Rental Income" },
  { value: "pay_back", label: "Pay Back" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "gift", label: "Gift" },
  { value: "refund", label: "Refund" },
  { value: "other", label: "Other" },
];

type Contact = {
  id: number;
  name: string;
};

interface PaymentFormProps {
  profileId: number;
  onSave: () => void;
  onCancel: () => void;
  onCreateContact?: () => void;
}

export function PaymentForm({
  profileId,
  onSave,
  onCancel,
  onCreateContact,
}: PaymentFormProps): React.JSX.Element {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reference, setReference] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
    return onDataChange("contacts", loadContacts);
  }, [profileId]);

  async function loadContacts() {
    try {
      const data = await window.api.contacts.list(profileId);
      setContacts(data);
    } catch (err) {
      console.error("Error loading contacts:", err);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (contactId === null) {
      alert("Please select a contact");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const paymentId = await window.api.payments.create({
        profileId,
        contact_id: contactId,
        amount: parsedAmount,
        category,
        description: description || null,
        payment_date: paymentDate,
        reference: reference || null,
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
        await window.api.payments.updateDocument(
          paymentId,
          result.objectName,
          result.originalName,
          result.md5Hash,
        );
      }

      // Save tags
      if (selectedTagIds.length > 0) {
        await window.api.tags.setForPayment(paymentId, selectedTagIds);
      }

      emitDataChange("payments");
      onSave();
    } catch (err) {
      console.error("Error saving payment:", err);
      alert("Error saving payment");
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
      <h2 style={{ marginTop: 0 }}>New Payment</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 500,
        }}
      >
        {/* Contact */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
            Contact <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <select
            value={contactId ?? ""}
            onChange={(e) => {
              if (e.target.value === "__create_new__") {
                e.target.value = contactId?.toString() ?? "";
                onCreateContact?.();
                return;
              }
              setContactId(e.target.value ? Number(e.target.value) : null);
            }}
            style={inputStyle}
            required
          >
            <option value="">Select a contact...</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {onCreateContact && (
              <option value="__create_new__">+ Create new contact</option>
            )}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
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

        {/* Category */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
            Category <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Date */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
            Payment Date <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details about this payment..."
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
            }}
          />
        </div>

        {/* Reference */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
            Reference / Invoice #
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. INV-001, check #1234"
            style={inputStyle}
          />
        </div>

        {/* Document Attachment */}
        <div>
          <label
            style={{ display: "block", marginBottom: 6, color: "#ccc" }}
          >
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
                {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(1)} KB)
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
            {saving ? "Saving..." : "Save Payment"}
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
