import React, { useEffect, useState, useRef } from "react";
import { emitDataChange } from "../dataEvents";
import TagSelector from "./TagSelector";

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
};

const TYPE_COLORS: Record<string, string> = {
  deposit: "#2da44e",
  withdrawal: "#cf222e",
};

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  reference: string | null;
  bill_record_id: number | null;
  document_path: string | null;
  document_storage_key: string | null;
  document_original_name: string | null;
  document_md5_hash: string | null;
  created_at: string;
  updated_at: string;
  bill_name?: string;
};

type Tag = {
  id: number;
  name: string;
  color: string;
};

interface TransactionDetailProps {
  transactionId: number;
  profileId: number;
  onClose: () => void;
}

export function TransactionDetail({
  transactionId,
  profileId,
  onClose,
}: TransactionDetailProps): React.JSX.Element {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTransaction();
    loadTags();
    loadAllTags();
  }, [transactionId, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTransaction(): Promise<void> {
    try {
      setLoading(true);
      const data = await window.api.transactions.get(transactionId);
      setTransaction(data);
    } catch (err) {
      console.error("Error loading transaction:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags(): Promise<void> {
    try {
      const data = await window.api.tags.getForTransaction(transactionId);
      setTags(data);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  }

  async function loadAllTags(): Promise<void> {
    try {
      const data = await window.api.tags.list(profileId);
      setAllTags(data);
    } catch (err) {
      console.error("Error loading all tags:", err);
    }
  }

  async function handleTagsChange(tagIds: number[]): Promise<void> {
    try {
      await window.api.tags.setForTransaction(transactionId, tagIds);
      await loadTags();
      emitDataChange("transactions");
    } catch (err) {
      console.error("Failed to update tags:", err);
      alert("Failed to update tags");
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await window.api.transactions.delete(transactionId);
      emitDataChange("transactions");
      onClose();
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const result = await window.api.minio.upload({
        name: file.name,
        mime: file.type,
        data: uint8Array,
      });
      await window.api.transactions.updateDocument(
        transactionId,
        result.objectName,
        result.originalName,
        result.md5Hash,
      );
      emitDataChange("transactions");
      loadTransaction();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadDocument(): Promise<void> {
    if (!transaction?.document_storage_key) return;
    try {
      const result = await window.api.minio.download(
        transaction.document_storage_key,
      );
      const blob = new Blob([new Uint8Array(result.data)], {
        type: result.contentType,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = transaction.document_original_name || "transaction-document";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading transaction...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Transaction not found.</p>
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            background: "#333",
            color: "#ddd",
            border: "1px solid #555",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  const typeColor = TYPE_COLORS[transaction.type] || "#656d76";

  const detailRow = (
    label: string,
    value: React.ReactNode,
  ): React.JSX.Element => (
    <div
      style={{
        display: "flex",
        padding: "12px 0",
        borderBottom: "1px solid #333",
      }}
    >
      <div style={{ width: 180, color: "#999", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1 }}>{value}</div>
    </div>
  );

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0, marginBottom: 8 }}>Transaction Details</h2>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: 10,
              fontSize: 13,
              background: typeColor + "22",
              color: typeColor,
              border: `1px solid ${typeColor}`,
            }}
          >
            {TYPE_LABELS[transaction.type] || transaction.type}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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

      {/* Details */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: "4px 20px",
          maxWidth: 600,
        }}
      >
        {detailRow(
          "Amount",
          <span style={{ fontWeight: "bold", fontSize: 18, color: typeColor }}>
            ${Number(transaction.amount).toFixed(2)}
          </span>,
        )}
        {detailRow(
          "Date",
          new Date(transaction.transaction_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        )}
        {detailRow(
          "Description",
          transaction.description || (
            <span style={{ color: "#666" }}>No description</span>
          ),
        )}
        {detailRow(
          "Reference",
          transaction.reference || <span style={{ color: "#666" }}>None</span>,
        )}
        {detailRow(
          "Associated Bill",
          transaction.bill_name ? (
            <span style={{ color: "#0969da" }}>{transaction.bill_name}</span>
          ) : (
            <span style={{ color: "#666" }}>None</span>
          ),
        )}
        {detailRow(
          "Tags",
          editingTags ? (
            <div
              style={{
                position: "relative",
                background: "#2a2a2a",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid #444",
                maxWidth: 400,
              }}
            >
              <TagSelector
                selectedTagIds={tags.map((t) => t.id)}
                onChange={handleTagsChange}
                profileId={profileId}
              />
              <button
                onClick={() => setEditingTags(false)}
                style={{
                  marginTop: 8,
                  padding: "6px 12px",
                  background: "#0969da",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingTags(true)}
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
                display: "inline-flex",
                gap: 6,
                flexWrap: "wrap",
                alignItems: "center",
                transition: "background 0.15s",
                margin: "-4px -8px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#333")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 12,
                      background: tag.color,
                      color: "#fff",
                    }}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <span style={{ color: "#666", fontSize: 13 }}>
                  Click to add tags
                </span>
              )}
            </div>
          ),
        )}
        {detailRow(
          "Document",
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {transaction.document_path ? (
              <>
                <span style={{ color: "#2da44e" }}>
                  📄 {transaction.document_original_name || "Attached"}
                </span>
                <button
                  onClick={handleDownloadDocument}
                  style={{
                    padding: "4px 10px",
                    background: "#333",
                    border: "1px solid #555",
                    color: "#ddd",
                    cursor: "pointer",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  Download
                </button>
              </>
            ) : (
              <span style={{ color: "#666" }}>No document</span>
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "4px 10px",
                background: "#333",
                border: "1px solid #555",
                color: "#ddd",
                cursor: uploading ? "not-allowed" : "pointer",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {uploading
                ? "Uploading..."
                : transaction.document_path
                  ? "Change"
                  : "Upload"}
            </button>
          </div>,
        )}
        {detailRow(
          "Created",
          new Date(transaction.created_at).toLocaleString(),
        )}
        {detailRow(
          "Updated",
          new Date(transaction.updated_at).toLocaleString(),
        )}
      </div>
    </div>
  );
}
