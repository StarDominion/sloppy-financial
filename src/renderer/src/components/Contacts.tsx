import { useEffect, useState } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

export default function Contacts({
  onEdit,
  onView,
  profileId,
}: {
  onEdit: (id: number | null) => void;
  onView: (id: number) => void;
  profileId: number;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadContacts();
    return onDataChange("contacts", loadContacts);
  }, []);

  async function loadContacts() {
    try {
      const data = await window.api.contacts.list(profileId);
      setContacts(data);
    } catch (err) {
      console.error("Error loading contacts:", err);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await window.api.contacts.delete(id);
      await loadContacts();
      emitDataChange("contacts");
    } catch (err) {
      console.error("Error deleting contact:", err);
    }
  }

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
        <h2 style={{ margin: 0 }}>Contacts</h2>
        <button
          onClick={() => onEdit(null)}
          style={{
            padding: "10px 20px",
            background: "#2da44e",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          + New Contact
        </button>
      </div>

      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: "10px",
          background: "#1e1e1e",
          color: "#fff",
          border: "1px solid #444",
          borderRadius: "4px",
          marginBottom: "20px",
          fontSize: "14px",
        }}
      />

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredContacts.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            {search
              ? "No contacts match your search"
              : "No contacts yet. Create one to get started."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  background: "#1e1e1e",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      marginBottom: "8px",
                    }}
                  >
                    {contact.name}
                  </div>
                  {contact.email && (
                    <div style={{ color: "#888", marginBottom: "4px" }}>
                      Email:{" "}
                      <span style={{ color: "#fff" }}>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div style={{ color: "#888", marginBottom: "4px" }}>
                      Phone:{" "}
                      <span style={{ color: "#fff" }}>{contact.phone}</span>
                    </div>
                  )}
                  {contact.address && (
                    <div style={{ color: "#888", marginBottom: "4px" }}>
                      Address:{" "}
                      <span style={{ color: "#fff" }}>{contact.address}</span>
                    </div>
                  )}
                  {contact.notes && (
                    <div
                      style={{
                        color: "#888",
                        marginTop: "8px",
                        fontSize: "14px",
                      }}
                    >
                      {contact.notes}
                    </div>
                  )}
                </div>
                <div
                  style={{ display: "flex", gap: "8px", marginLeft: "16px" }}
                >
                  <button
                    onClick={() => onView(contact.id)}
                    style={{
                      padding: "6px 12px",
                      background: "#2da44e",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => onEdit(contact.id)}
                    style={{
                      padding: "6px 12px",
                      background: "#007acc",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    style={{
                      padding: "6px 12px",
                      background: "#ff6b6b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
