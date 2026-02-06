import { useEffect, useState } from "react";
import { emitDataChange } from "../dataEvents";

export default function ContactForm({
  contactId,
  onSave,
  onCancel,
  profileId,
}: {
  contactId: number | null;
  onSave: () => void;
  onCancel: () => void;
  profileId: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contactId !== null) {
      loadContact();
    }
  }, [contactId]);

  async function loadContact() {
    if (contactId === null) return;
    try {
      const contact = await window.api.contacts.get(contactId);
      if (contact) {
        setName(contact.name);
        setEmail(contact.email || "");
        setPhone(contact.phone || "");
        setAddress(contact.address || "");
        setNotes(contact.notes || "");
      }
    } catch (err) {
      console.error("Error loading contact:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };

      if (contactId === null) {
        await window.api.contacts.create({ ...data, profileId });
      } else {
        await window.api.contacts.update(contactId, data);
      }
      emitDataChange("contacts");
      onSave();
    } catch (err) {
      console.error("Error saving contact:", err);
      alert("Error saving contact");
    } finally {
      setLoading(false);
    }
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
      <h2 style={{ marginTop: 0 }}>
        {contactId === null ? "New Contact" : "Edit Contact"}
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", color: "#ccc" }}
          >
            Name <span style={{ color: "#ff6b6b" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", color: "#ccc" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", color: "#ccc" }}
          >
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", color: "#ccc" }}
          >
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
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

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "8px", color: "#ccc" }}
          >
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1e1e1e",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              fontSize: "14px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: loading ? "#555" : "#2da44e",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {loading ? "Saving..." : "Save Contact"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#444",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
