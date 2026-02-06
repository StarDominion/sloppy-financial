import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";

type BillRecord = {
  id: number;
  automatic_bill_id: number | null;
  name: string;
  amount: number;
  description: string | null;
  due_date: string;
  status: "paid" | "unpaid";
  paid_date: string | null;
  document_path: string | null;
  created_at: string;
};

interface MonthlySummaryProps {
  onViewBill?: (billId: number) => void;
  profileId: number;
}

export function MonthlySummary({
  onViewBill,
  profileId,
}: MonthlySummaryProps): React.JSX.Element {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
    return onDataChange("bills", loadBills);
  }, []);

  async function loadBills() {
    try {
      setLoading(true);
      const data = await window.api.bills.listRecords(profileId);
      setBills(data);
    } catch (err) {
      console.error("Error loading bills:", err);
    } finally {
      setLoading(false);
    }
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Filter bills for selected month
  const filteredBills = bills.filter((bill) => {
    const dueDate = new Date(bill.due_date);
    return (
      dueDate.getFullYear() === selectedYear &&
      dueDate.getMonth() === selectedMonth
    );
  });

  // Calculate totals
  const totalAmount = filteredBills.reduce(
    (sum, b) => sum + Number(b.amount),
    0,
  );
  const paidAmount = filteredBills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const unpaidAmount = filteredBills
    .filter((b) => b.status === "unpaid")
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const paidCount = filteredBills.filter((b) => b.status === "paid").length;
  const unpaidCount = filteredBills.filter((b) => b.status === "unpaid").length;

  // Generate year options (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Monthly Summary</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: "8px 12px",
              background: "#1e1e1e",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: "8px 12px",
              background: "#1e1e1e",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", marginBottom: "8px", fontSize: "14px" }}>
            Total Bills
          </div>
          <div style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>
            {filteredBills.length}
          </div>
        </div>
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", marginBottom: "8px", fontSize: "14px" }}>
            Total Amount
          </div>
          <div
            style={{ fontSize: "28px", fontWeight: "bold", color: "#007acc" }}
          >
            ${totalAmount.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #2da44e",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", marginBottom: "8px", fontSize: "14px" }}>
            Paid ({paidCount})
          </div>
          <div
            style={{ fontSize: "28px", fontWeight: "bold", color: "#2da44e" }}
          >
            ${paidAmount.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #ff6b6b",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", marginBottom: "8px", fontSize: "14px" }}>
            Unpaid ({unpaidCount})
          </div>
          <div
            style={{ fontSize: "28px", fontWeight: "bold", color: "#ff6b6b" }}
          >
            ${unpaidAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#1e1e1e",
          border: "1px solid #444",
          borderRadius: "8px",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            Loading...
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            No bills for {monthNames[selectedMonth]} {selectedYear}
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", color: "#fff" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #444" }}>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    color: "#888",
                    fontWeight: "normal",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    color: "#888",
                    fontWeight: "normal",
                  }}
                >
                  Due Date
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    color: "#888",
                    fontWeight: "normal",
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    color: "#888",
                    fontWeight: "normal",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    color: "#888",
                    fontWeight: "normal",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBills
                .sort(
                  (a, b) =>
                    new Date(a.due_date).getTime() -
                    new Date(b.due_date).getTime(),
                )
                .map((bill) => (
                  <tr
                    key={bill.id}
                    style={{ borderBottom: "1px solid #333" }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: "bold" }}>{bill.name}</div>
                      {bill.description && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#888",
                            marginTop: "4px",
                          }}
                        >
                          {bill.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {new Date(bill.due_date).toLocaleDateString()}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      ${Number(bill.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          background:
                            bill.status === "paid" ? "#2da44e" : "#ff6b6b",
                          color: "#fff",
                        }}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {onViewBill && (
                        <button
                          onClick={() => onViewBill(bill.id)}
                          style={{
                            padding: "6px 12px",
                            background: "#007acc",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          View
                        </button>
                      )}
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
