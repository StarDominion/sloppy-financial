import React, { useEffect, useState, useRef } from "react";
import { emitDataChange } from "../dataEvents";

const STATUS_COLORS: Record<string, string> = {
  draft: "#656d76",
  sent: "#0969da",
  paid: "#2da44e",
  overdue: "#cf222e",
  cancelled: "#888",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

type Invoice = {
  id: number;
  contact_id: number | null;
  invoice_number: string | null;
  amount: number;
  description: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  document_path: string | null;
  document_storage_key: string | null;
  document_original_name: string | null;
  document_md5_hash: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
};

type Tag = {
  id: number;
  name: string;
  color: string;
};

interface InvoiceDetailProps {
  invoiceId: number;
  profileId: number;
  onClose: () => void;
}

export function InvoiceDetail({
  invoiceId,
  profileId,
  onClose,
}: InvoiceDetailProps): React.JSX.Element {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInvoice();
    loadTags();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      setLoading(true);
      const data = await window.api.invoices.get(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error("Error loading invoice:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags() {
    try {
      const data = await window.api.tags.getForInvoice(invoiceId);
      setTags(data);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true);
    try {
      if (newStatus === "paid") {
        await window.api.invoices.markPaid(invoiceId);
      } else {
        await window.api.invoices.update(invoiceId, {
          status: newStatus as any,
          paid_date: null,
        });
      }
      await loadInvoice();
      emitDataChange("invoices");
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      await window.api.invoices.updateDocument(
        invoiceId,
        result.objectName,
        result.originalName,
        result.md5Hash,
      );
      await loadInvoice();
      emitDataChange("invoices");
    } catch (err) {
      console.error("Error uploading document:", err);
      alert("Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function handleViewDocument() {
    if (!invoice?.document_storage_key) return;
    try {
      const url = await window.api.minio.getUrl(invoice.document_storage_key);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error getting document URL:", err);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await window.api.invoices.delete(invoiceId);
      emitDataChange("invoices");
      onClose();
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert("Error deleting invoice");
    }
  }

  const sectionStyle: React.CSSProperties = {
    background: "#1e1e1e",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <h2>Invoice not found</h2>
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            background: "#007acc",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Close
        </button>
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            {invoice.invoice_number || `Invoice #${invoice.id}`}
          </h2>
          <div
            style={{
              fontSize: 28,
              fontWeight: "bold",
              marginTop: 4,
            }}
          >
            ${Number(invoice.amount).toFixed(2)}
          </div>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 13,
                background:
                  (STATUS_COLORS[invoice.status] || "#555") + "22",
                color: STATUS_COLORS[invoice.status] || "#999",
                border: `1px solid ${STATUS_COLORS[invoice.status] || "#555"}`,
              }}
            >
              {STATUS_LABELS[invoice.status] || invoice.status}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#333",
              color: "#ddd",
              border: "1px solid #555",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: "8px 16px",
              background: "#cf222e22",
              color: "#ff6b6b",
              border: "1px solid #cf222e",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status Actions */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Update Status</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              disabled={updatingStatus || invoice.status === key}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 13,
                cursor:
                  updatingStatus || invoice.status === key
                    ? "not-allowed"
                    : "pointer",
                background:
                  invoice.status === key
                    ? STATUS_COLORS[key]
                    : "#2a2a2a",
                color:
                  invoice.status === key
                    ? "#fff"
                    : STATUS_COLORS[key],
                border: `1px solid ${STATUS_COLORS[key]}`,
                opacity: invoice.status === key ? 1 : 0.7,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div style={sectionStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <div style={labelStyle}>Contact</div>
            <div style={{ fontSize: 15, color: invoice.contact_name ? "#fff" : "#666" }}>
              {invoice.contact_name || "None"}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Issue Date</div>
            <div style={{ fontSize: 15 }}>
              {new Date(invoice.issue_date).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Due Date</div>
            <div style={{ fontSize: 15, color: invoice.due_date ? "#fff" : "#666" }}>
              {invoice.due_date
                ? new Date(invoice.due_date).toLocaleDateString()
                : "Not set"}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Paid Date</div>
            <div style={{ fontSize: 15, color: invoice.paid_date ? "#2da44e" : "#666" }}>
              {invoice.paid_date
                ? new Date(invoice.paid_date).toLocaleDateString()
                : "Not paid"}
            </div>
          </div>
        </div>
        {invoice.description && (
          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>Description</div>
            <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>
              {invoice.description}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Tags</div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 13,
                  background: tag.color,
                  color: "#fff",
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Document */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Document Attachment</div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
        {invoice.document_storage_key ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>
                {invoice.document_original_name || invoice.document_path}
              </div>
              {invoice.document_md5_hash && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  MD5: {invoice.document_md5_hash}
                </div>
              )}
            </div>
            <button
              onClick={handleViewDocument}
              style={{
                padding: "6px 14px",
                background: "#007acc",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              View
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "6px 14px",
                background: "#333",
                color: "#ddd",
                border: "1px solid #555",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Replace
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "8px 16px",
                background: "#333",
                color: "#ddd",
                border: "1px solid #555",
                borderRadius: 4,
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Attach Document"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
