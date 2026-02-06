import { useEffect, useState } from "react";
import { emitDataChange } from "../dataEvents";

type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

type OwedAmount = {
  id: number;
  contact_id: number;
  bill_record_id: number | null;
  amount: number;
  reason: string | null;
  is_paid: boolean;
  paid_date: string | null;
  created_at: string;
  contact_name?: string;
  bill_name?: string;
};

type BillRecord = {
  id: number;
  name: string;
  amount: number;
};

export default function ContactDetail({
  contactId,
  onClose,
  onEdit,
  profileId,
}: {
  contactId: number;
  onClose: () => void;
  onEdit: () => void;
  profileId: number;
}) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [owedAmounts, setOwedAmounts] = useState<OwedAmount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddOwed, setShowAddOwed] = useState(false);
  const [newOwedAmount, setNewOwedAmount] = useState("");
  const [newOwedReason, setNewOwedReason] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);

  useEffect(() => {
    loadContact();
    loadOwedAmounts();
    loadBills();
  }, [contactId]);

  async function loadContact() {
    try {
      const data = await window.api.contacts.get(contactId);
      setContact(data);
    } catch (err) {
      console.error("Error loading contact:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadOwedAmounts() {
    try {
      const data = await window.api.owedAmounts.getForContact(contactId);
      setOwedAmounts(data);
    } catch (err) {
      console.error("Error loading owed amounts:", err);
    }
  }

  async function loadBills() {
    try {
      const data = await window.api.bills.listRecords(profileId);
      setBills(data);
    } catch (err) {
      console.error("Error loading bills:", err);
    }
  }

  async function handleAddOwedAmount() {
    const amount = parseFloat(newOwedAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await window.api.owedAmounts.create({
        contact_id: contactId,
        amount,
        reason: newOwedReason || null,
        bill_record_id: selectedBillId,
        profileId,
      });
      setNewOwedAmount("");
      setNewOwedReason("");
      setSelectedBillId(null);
      setShowAddOwed(false);
      await loadOwedAmounts();
      emitDataChange("contacts");
    } catch (err) {
      console.error("Error creating owed amount:", err);
    }
  }

  async function handleTogglePaid(owed: OwedAmount) {
    try {
      if (owed.is_paid) {
        await window.api.owedAmounts.markUnpaid(owed.id);
      } else {
        await window.api.owedAmounts.markPaid(owed.id);
      }
      await loadOwedAmounts();
      emitDataChange("contacts");
    } catch (err) {
      console.error("Error toggling paid status:", err);
    }
  }

  async function handleDeleteOwed(id: number) {
    if (!confirm("Are you sure you want to delete this owed amount?")) return;
    try {
      await window.api.owedAmounts.delete(id);
      await loadOwedAmounts();
      emitDataChange("contacts");
    } catch (err) {
      console.error("Error deleting owed amount:", err);
    }
  }

  const totalOwed = owedAmounts
    .filter((o) => !o.is_paid)
    .reduce((sum, o) => sum + Number(o.amount), 0);

  const totalPaid = owedAmounts
    .filter((o) => o.is_paid)
    .reduce((sum, o) => sum + Number(o.amount), 0);

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#fff" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!contact) {
    return (
      <div style={{ padding: "20px", color: "#fff" }}>
        <h2>Contact not found</h2>
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            background: "#007acc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "10px",
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
        padding: "20px",
        color: "#fff",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>{contact.name}</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onEdit}
            style={{
              padding: "8px 16px",
              background: "#007acc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#444",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div
        style={{
          background: "#1e1e1e",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0", color: "#007acc" }}>
          Contact Information
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "12px",
          }}
        >
          {contact.email && (
            <>
              <div style={{ color: "#888" }}>Email:</div>
              <div>{contact.email}</div>
            </>
          )}
          {contact.phone && (
            <>
              <div style={{ color: "#888" }}>Phone:</div>
              <div>{contact.phone}</div>
            </>
          )}
          {contact.address && (
            <>
              <div style={{ color: "#888" }}>Address:</div>
              <div>{contact.address}</div>
            </>
          )}
          {contact.notes && (
            <>
              <div style={{ color: "#888" }}>Notes:</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{contact.notes}</div>
            </>
          )}
        </div>
      </div>

      {/* Owed Amounts Summary */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", marginBottom: "8px" }}>Total Owed</div>
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#ff6b6b" }}
          >
            ${totalOwed.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", marginBottom: "8px" }}>Total Paid</div>
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#2da44e" }}
          >
            ${totalPaid.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Owed Amounts List */}
      <div
        style={{
          background: "#1e1e1e",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3 style={{ margin: 0, color: "#007acc" }}>Owed Amounts</h3>
          <button
            onClick={() => setShowAddOwed(!showAddOwed)}
            style={{
              padding: "8px 16px",
              background: "#2da44e",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add Owed Amount
          </button>
        </div>

        {/* Add Owed Amount Form */}
        {showAddOwed && (
          <div
            style={{
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "15px",
            }}
          >
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    color: "#888",
                  }}
                >
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newOwedAmount}
                  onChange={(e) => setNewOwedAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#1e1e1e",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    color: "#888",
                  }}
                >
                  Reason
                </label>
                <input
                  type="text"
                  value={newOwedReason}
                  onChange={(e) => setNewOwedReason(e.target.value)}
                  placeholder="What is this for?"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#1e1e1e",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    color: "#888",
                  }}
                >
                  Link to Bill (Optional)
                </label>
                <select
                  value={selectedBillId ?? ""}
                  onChange={(e) =>
                    setSelectedBillId(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#1e1e1e",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">-- None --</option>
                  {bills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.name} - ${Number(bill.amount).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleAddOwedAmount}
                  style={{
                    padding: "10px 20px",
                    background: "#2da44e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddOwed(false);
                    setNewOwedAmount("");
                    setNewOwedReason("");
                    setSelectedBillId(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Owed Amounts Table */}
        {owedAmounts.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "20px" }}>
            No owed amounts recorded for this contact.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {owedAmounts.map((owed) => (
              <div
                key={owed.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  background: owed.is_paid ? "#1a2f1a" : "#252525",
                  border: `1px solid ${owed.is_paid ? "#2da44e" : "#444"}`,
                  borderRadius: "6px",
                }}
              >
                <input
                  type="checkbox"
                  checked={owed.is_paid}
                  onChange={() => handleTogglePaid(owed)}
                  style={{
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      textDecoration: owed.is_paid ? "line-through" : "none",
                      color: owed.is_paid ? "#888" : "#fff",
                    }}
                  >
                    ${Number(owed.amount).toFixed(2)}
                    {owed.reason && (
                      <span
                        style={{
                          fontWeight: "normal",
                          marginLeft: "8px",
                          color: "#888",
                        }}
                      >
                        — {owed.reason}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    {owed.bill_name && (
                      <span style={{ marginRight: "12px" }}>
                        📄 {owed.bill_name}
                      </span>
                    )}
                    <span>
                      Added: {new Date(owed.created_at).toLocaleDateString()}
                    </span>
                    {owed.paid_date && (
                      <span style={{ marginLeft: "12px", color: "#2da44e" }}>
                        Paid: {new Date(owed.paid_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteOwed(owed.id)}
                  style={{
                    padding: "6px 12px",
                    background: "#ff6b6b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
