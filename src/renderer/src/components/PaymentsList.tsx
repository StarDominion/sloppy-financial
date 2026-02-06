import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";

type Payment = {
  id: number;
  contact_id: number;
  amount: number;
  category: string;
  description: string | null;
  payment_date: string;
  reference: string | null;
  document_path: string | null;
  document_original_name: string | null;
  created_at: string;
  contact_name?: string;
};

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

interface PaymentsListProps {
  profileId: number;
  onNewPayment: () => void;
  onViewPayment: (paymentId: number) => void;
}

export function PaymentsList({
  profileId,
  onNewPayment,
  onViewPayment,
}: PaymentsListProps): React.JSX.Element {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPayments();
    return onDataChange("payments", loadPayments);
  }, [profileId]);

  async function loadPayments() {
    try {
      setLoading(true);
      const data = await window.api.payments.list(profileId);
      setPayments(data);
    } catch (err) {
      console.error("Error loading payments:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter((p) => {
    if (filterCategory !== "all" && p.category !== filterCategory) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (p.contact_name || "").toLowerCase().includes(term) ||
        (p.description || "").toLowerCase().includes(term) ||
        (p.reference || "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalAmount = filteredPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading payments...</p>
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
        <h2 style={{ margin: 0 }}>Income & Payments</h2>
        <button
          onClick={onNewPayment}
          style={{
            padding: "8px 16px",
            background: "#2da44e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          + New Payment
        </button>
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
          placeholder="Search payments..."
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
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div style={{ color: "#aaa", fontSize: 14, marginLeft: "auto" }}>
          <strong style={{ color: "#2da44e" }}>
            ${totalAmount.toFixed(2)}
          </strong>{" "}
          total ({filteredPayments.length} payments)
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredPayments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              padding: 40,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              No payments found
            </p>
            <p style={{ fontSize: 13 }}>
              Click &quot;+ New Payment&quot; to record income or a payment.
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
                <th style={{ padding: "10px 8px" }}>Date</th>
                <th style={{ padding: "10px 8px" }}>Contact</th>
                <th style={{ padding: "10px 8px" }}>Category</th>
                <th style={{ padding: "10px 8px" }}>Description</th>
                <th style={{ padding: "10px 8px", textAlign: "right" }}>
                  Amount
                </th>
                <th style={{ padding: "10px 8px", textAlign: "center" }}>
                  📎
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  onClick={() => onViewPayment(payment.id)}
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
                  <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {payment.contact_name || "—"}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 12,
                        background:
                          CATEGORY_COLORS[payment.category] + "22",
                        color:
                          CATEGORY_COLORS[payment.category] || "#999",
                        border: `1px solid ${CATEGORY_COLORS[payment.category] || "#555"}`,
                      }}
                    >
                      {CATEGORY_LABELS[payment.category] || payment.category}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      color: "#aaa",
                      maxWidth: 250,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {payment.description || "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: "#2da44e",
                    }}
                  >
                    ${Number(payment.amount).toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "10px 8px",
                      textAlign: "center",
                      color: payment.document_path ? "#2da44e" : "#444",
                    }}
                  >
                    {payment.document_path ? "📄" : "—"}
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
