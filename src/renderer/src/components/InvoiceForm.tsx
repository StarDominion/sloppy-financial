import React, { useEffect, useState, useRef } from "react";
import TagSelector from "./TagSelector";
import { onDataChange, emitDataChange } from "../dataEvents";

type Contact = {
  id: number;
  name: string;
};

interface InvoiceFormProps {
  profileId: number;
  onSave: () => void;
  onCancel: () => void;
  onCreateContact?: () => void;
}

export function InvoiceForm({
  profileId,
  onSave,
  onCancel,
  onCreateContact,
}: InvoiceFormProps): React.JSX.Element {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dueDate, setDueDate] = useState("");
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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSaving(true);
    try {
      const invoiceId = await window.api.invoices.create({
        profileId,
        contact_id: contactId,
        invoice_number: invoiceNumber || null,
        amount: parsedAmount,
        description: description || null,
        status: status as any,
        issue_date: issueDate,
        due_date: dueDate || null,
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
        await window.api.invoices.updateDocument(
          invoiceId,
          result.objectName,
          result.originalName,
          result.md5Hash,
        );
      }

      // Save tags
      if (selectedTagIds.length > 0) {
        await window.api.tags.setForInvoice(invoiceId, selectedTagIds);
      }

      emitDataChange("invoices");
      onSave();
    } catch (err) {
      console.error("Error saving invoice:", err);
      alert("Error saving invoice");
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
      <h2 style={{ marginTop: 0 }}>New Invoice</h2>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 500,
        }}
      >
        {/* Invoice Number */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Invoice Number
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="e.g. INV-001"
            style={inputStyle}
          />
        </div>

        {/* Contact */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Contact
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
          >
            <option value="">No contact</option>
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

        {/* Status */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Issue Date */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Issue Date <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        {/* Due Date */}
        <div>
          <label style={{ display: "block", marginBottom: 6, color: "#ccc" }}>
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={inputStyle}
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
            placeholder="Invoice details..."
            style={{
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
            }}
          />
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
              background: saving ? "#0a3069" : "#0969da",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            {saving ? "Saving..." : "Save Invoice"}
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
