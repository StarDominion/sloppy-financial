import React, { useEffect, useState, useRef } from "react";
import { emitDataChange } from "../dataEvents";

const CATEGORY_LABELS: Record<string, string> = {
  employment_income: "Employment Income",
  freelance_income: "Freelance Income",
  investment_income: "Investment Income",
  rental_income: "Rental Income",
  pay_back: "Pay Back",
  reimbursement: "Reimbursement",
  gift: "Gift",
  refund: "Refund",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  employment_income: "#2da44e",
  freelance_income: "#8957e5",
  investment_income: "#0969da",
  rental_income: "#bf8700",
  pay_back: "#cf222e",
  reimbursement: "#1a7f37",
  gift: "#d4a72c",
  refund: "#fa4549",
  other: "#656d76",
};

type Payment = {
  id: number;
  contact_id: number;
  amount: number;
  category: string;
  description: string | null;
  payment_date: string;
  reference: string | null;
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

interface PaymentDetailProps {
  paymentId: number;
  profileId: number;
  onClose: () => void;
}

export function PaymentDetail({
  paymentId,
  profileId,
  onClose,
}: PaymentDetailProps): React.JSX.Element {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPayment();
    loadTags();
  }, [paymentId]);

  async function loadPayment() {
    try {
      setLoading(true);
      const data = await window.api.payments.get(paymentId);
      setPayment(data);
    } catch (err) {
      console.error("Error loading payment:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags() {
    try {
      const data = await window.api.tags.getForPayment(paymentId);
      setTags(data);
    } catch (err) {
      console.error("Error loading tags:", err);
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
      await window.api.payments.updateDocument(
        paymentId,
        result.objectName,
        result.originalName,
        result.md5Hash,
      );
      await loadPayment();
      emitDataChange("payments");
    } catch (err) {
      console.error("Error uploading document:", err);
      alert("Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function handleViewDocument() {
    if (!payment?.document_storage_key) return;
    try {
      const url = await window.api.minio.getUrl(payment.document_storage_key);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error getting document URL:", err);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this payment?")) return;
    try {
      await window.api.payments.delete(paymentId);
      emitDataChange("payments");
      onClose();
    } catch (err) {
      console.error("Error deleting payment:", err);
      alert("Error deleting payment");
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
        <p>Loading payment...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <h2>Payment not found</h2>
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
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            ${Number(payment.amount).toFixed(2)}
          </h2>
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 12,
                fontSize: 13,
                background:
                  (CATEGORY_COLORS[payment.category] || "#555") + "22",
                color: CATEGORY_COLORS[payment.category] || "#999",
                border: `1px solid ${CATEGORY_COLORS[payment.category] || "#555"}`,
              }}
            >
              {CATEGORY_LABELS[payment.category] || payment.category}
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
            <div style={{ fontSize: 15 }}>
              {payment.contact_name || "Unknown"}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Payment Date</div>
            <div style={{ fontSize: 15 }}>
              {new Date(payment.payment_date).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Reference</div>
            <div style={{ fontSize: 15, color: payment.reference ? "#fff" : "#666" }}>
              {payment.reference || "None"}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Created</div>
            <div style={{ fontSize: 15 }}>
              {new Date(payment.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        {payment.description && (
          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>Description</div>
            <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>
              {payment.description}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Tags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
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
        {payment.document_storage_key ? (
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
                {payment.document_original_name || payment.document_path}
              </div>
              {payment.document_md5_hash && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  MD5: {payment.document_md5_hash}
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
