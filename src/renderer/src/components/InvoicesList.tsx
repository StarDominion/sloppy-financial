import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";

type Invoice = {
  id: number;
  contact_id: number | null;
  invoice_number: string | null;
  amount: number;
  description: string | null;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  document_path: string | null;
  created_at: string;
  contact_name?: string;
};

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

interface InvoicesListProps {
  profileId: number;
  onNewInvoice: () => void;
  onViewInvoice: (invoiceId: number) => void;
}

export function InvoicesList({
  profileId,
  onNewInvoice,
  onViewInvoice,
}: InvoicesListProps): React.JSX.Element {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadInvoices();
    return onDataChange("invoices", loadInvoices);
  }, [profileId]);

  async function loadInvoices() {
    try {
      setLoading(true);
      const data = await window.api.invoices.list(profileId);
      setInvoices(data);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (inv.contact_name || "").toLowerCase().includes(term) ||
        (inv.invoice_number || "").toLowerCase().includes(term) ||
        (inv.description || "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0,
  );
  const unpaidAmount = filteredInvoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading invoices...</p>
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
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Invoices</h2>
        <button
          onClick={onNewInvoice}
          style={{
            padding: "8px 16px",
            background: "#0969da",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          + New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
            Total
          </div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>
            ${totalAmount.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #cf222e",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
            Outstanding
          </div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#ff6b6b" }}>
            ${unpaidAmount.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
            Count
          </div>
          <div style={{ fontSize: 20, fontWeight: "bold" }}>
            {filteredInvoices.length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            flex: 1,
            maxWidth: 300,
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredInvoices.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              padding: 40,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              No invoices found
            </p>
            <p style={{ fontSize: 13 }}>
              Click &quot;+ New Invoice&quot; to create one.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #444",
                  color: "#999",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: "10px 8px" }}>Invoice #</th>
                <th style={{ padding: "10px 8px" }}>Contact</th>
                <th style={{ padding: "10px 8px" }}>Issue Date</th>
                <th style={{ padding: "10px 8px" }}>Due Date</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px", textAlign: "right" }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => onViewInvoice(invoice.id)}
                  style={{
                    borderBottom: "1px solid #333",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#2a2a2a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>
                    {invoice.invoice_number || `#${invoice.id}`}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {invoice.contact_name || "—"}
                  </td>
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                    {invoice.due_date
                      ? new Date(invoice.due_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 12,
                        background:
                          (STATUS_COLORS[invoice.status] || "#555") + "22",
                        color: STATUS_COLORS[invoice.status] || "#999",
                        border: `1px solid ${STATUS_COLORS[invoice.status] || "#555"}`,
                      }}
                    >
                      {STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    ${Number(invoice.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
