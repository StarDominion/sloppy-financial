import { useEffect, useState } from "react";
import TagSelector from "./TagSelector";
import { onDataChange, emitDataChange } from "../dataEvents";

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

type AutomaticBill = {
  id: number;
  name: string;
  amount: number;
  description: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  due_day: number;
  due_dates: string | null;
  generation_days: string | null;
  next_due_date: string | null;
  created_at: string;
};

type Tag = {
  id: number;
  name: string;
  color: string;
  created_at: string;
};

type Contact = {
  id: number;
  name: string;
};

export default function BillDetail({
  billId,
  profileId,
  onClose,
  onCreateContact,
}: {
  billId: number;
  profileId: number;
  onClose: () => void;
  onCreateContact?: () => void;
}) {
  const [bill, setBill] = useState<BillRecord | null>(null);
  const [automaticBill, setAutomaticBill] = useState<AutomaticBill | null>(
    null,
  );
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [owedBy, setOwedBy] = useState<{
    contact_id: number;
    contact_name: string;
  } | null>(null);
  const [showOwedBySelector, setShowOwedBySelector] = useState(false);
  const [owedTo, setOwedTo] = useState<{
    contact_id: number;
    contact_name: string;
  } | null>(null);
  const [showOwedToSelector, setShowOwedToSelector] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState("");
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (billId == null) {
      setError("No bill ID provided");
      setLoading(false);
      return;
    }
    loadBillDetails();
    loadContacts();
    return onDataChange("contacts", loadContacts);
  }, [billId]);

  async function loadContacts() {
    try {
      const data = await window.api.contacts.list(profileId);
      setContacts(data);
    } catch (err) {
      console.error("Error loading contacts:", err);
    }
  }

  async function loadBillDetails() {
    try {
      setLoading(true);
      setError(null);
      // Get all bill records and find the one we need
      const records = await window.api.bills.listRecords(profileId);
      const foundBill = records.find((r) => r.id === billId);

      if (!foundBill) {
        console.error("Bill not found");
        setLoading(false);
        return;
      }

      setBill(foundBill);

      // Load tags
      const billTags = await window.api.tags.getForBillRecord(billId);
      setTags(billTags);

      // Load owed by contact
      const owedByData = await window.api.billOwedBy.get(billId);
      setOwedBy(owedByData);

      // Load owed to contact
      const owedToData = await window.api.billOwedTo.get(billId);
      setOwedTo(owedToData);

      // Load automatic bill if linked
      if (foundBill.automatic_bill_id) {
        const autoBills = await window.api.bills.listAutomatic(profileId);
        const linkedAutoBill = autoBills.find(
          (ab) => ab.id === foundBill.automatic_bill_id,
        );
        if (linkedAutoBill) {
          setAutomaticBill(linkedAutoBill);
        }
      }
    } catch (err) {
      console.error("Error loading bill details:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load bill details",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSetOwedBy(contactId: number | null) {
    if (!bill) return;
    try {
      if (contactId) {
        // Create owed amount and set owed by
        await window.api.owedAmounts.createFromBill(bill.id, contactId, profileId);
      } else {
        // Just clear the owed by
        await window.api.billOwedBy.set(bill.id, null);
      }
      await loadBillDetails();
      setShowOwedBySelector(false);
      emitDataChange("bills");
      emitDataChange("contacts");
    } catch (err) {
      console.error("Error setting owed by:", err);
    }
  }

  async function handleSetOwedTo(contactId: number | null) {
    if (!bill) return;
    try {
      await window.api.billOwedTo.set(bill.id, contactId);
      await loadBillDetails();
      setShowOwedToSelector(false);
      emitDataChange("bills");
    } catch (err) {
      console.error("Error setting owed to:", err);
    }
  }

  async function handleSaveDescription() {
    if (!bill) return;
    try {
      await window.api.bills.updateRecord(bill.id, {
        description: descriptionInput || null,
      });
      await loadBillDetails();
      emitDataChange("bills");
      setEditingDescription(false);
    } catch (err) {
      console.error("Error saving description:", err);
    }
  }

  async function handleSaveTags() {
    if (!bill) return;
    try {
      await window.api.tags.setForBillRecord(bill.id, selectedTagIds);
      await loadBillDetails();
      emitDataChange("bills");
      setEditingTags(false);
    } catch (err) {
      console.error("Error saving tags:", err);
    }
  }

  async function handleMarkPaid() {
    if (!bill) return;
    try {
      await window.api.bills.payRecord(bill.id);
      await loadBillDetails();
      emitDataChange("bills");
    } catch (err) {
      console.error("Error marking bill as paid:", err);
    }
  }

  async function handleUploadDocument() {
    if (!bill) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const result = await window.api.minio.upload({
          name: file.name,
          mime: file.type,
          data: uint8Array,
        });
        await window.api.bills.updateRecordDocument(bill.id, result.objectName, result.originalName, result.md5Hash);
        await loadBillDetails();
        emitDataChange("bills");
      } catch (err) {
        console.error("Error uploading document:", err);
      }
    };
    input.click();
  }

  async function handlePreviewDocument() {
    if (!bill?.document_path) return;

    try {
      setPreviewLoading(true);
      const result = await window.api.minio.download(bill.document_path);
      const uint8Array = new Uint8Array(result.data);
      const blob = new Blob([uint8Array], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType(result.contentType);
    } catch (err) {
      console.error("Error loading document preview:", err);
      setError("Failed to load document preview");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewType(null);
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#fff" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "#fff" }}>
        <h2>Error</h2>
        <p style={{ color: "#ff6b6b" }}>{error}</p>
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

  if (!bill) {
    return (
      <div style={{ padding: "20px", color: "#fff" }}>
        <h2>Bill not found</h2>
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
        <h2 style={{ margin: 0 }}>Bill Details</h2>
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

      <div
        style={{
          background: "#1e1e1e",
          border: "1px solid #444",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#007acc" }}>
            {bill.name}
          </h3>
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#2da44e" }}
          >
            ${Number(bill.amount ?? 0).toFixed(2)}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 1fr",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div style={{ color: "#888" }}>Status:</div>
          <div>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "14px",
                background: bill.status === "paid" ? "#2da44e" : "#ff6b6b",
                color: "#fff",
              }}
            >
              {bill.status}
            </span>
          </div>

          <div style={{ color: "#888" }}>Due Date:</div>
          <div>
            {bill.due_date
              ? new Date(bill.due_date).toLocaleDateString()
              : "N/A"}
          </div>

          {bill.paid_date && (
            <>
              <div style={{ color: "#888" }}>Paid Date:</div>
              <div>{new Date(bill.paid_date).toLocaleDateString()}</div>
            </>
          )}

          <div style={{ color: "#888" }}>Created:</div>
          <div>
            {bill.created_at
              ? new Date(bill.created_at).toLocaleDateString()
              : "N/A"}
          </div>

          <div style={{ color: "#888" }}>Description:</div>
          <div>
            {editingDescription ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Add description or context..."
                  style={{
                    padding: "8px",
                    background: "#252525",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    fontSize: "14px",
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleSaveDescription}
                    style={{
                      padding: "6px 12px",
                      background: "#2da44e",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDescription(false)}
                    style={{
                      padding: "6px 12px",
                      background: "#444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : bill.description ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ whiteSpace: "pre-wrap" }}>{bill.description}</span>
                <button
                  onClick={() => {
                    setDescriptionInput(bill.description || "");
                    setEditingDescription(true);
                  }}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    color: "#007acc",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                  }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDescriptionInput("");
                  setEditingDescription(true);
                }}
                style={{
                  padding: "6px 12px",
                  background: "#444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Add Description
              </button>
            )}
          </div>

          <div style={{ color: "#888" }}>Document:</div>
          <div>
            {bill.document_path ? (
              <button
                onClick={handlePreviewDocument}
                disabled={previewLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007acc",
                  cursor: previewLoading ? "wait" : "pointer",
                  textDecoration: "underline",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                {previewLoading ? "Loading..." : bill.document_path}
              </button>
            ) : (
              "No document attached"
            )}
          </div>

          <div style={{ color: "#888" }}>Tags:</div>
          <div>
            {tags.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      background: tag.color,
                      color: "#fff",
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                <button
                  onClick={() => {
                    setSelectedTagIds(tags.map((t) => t.id));
                    setEditingTags(true);
                  }}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    color: "#007acc",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                  }}
                >
                  Edit
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setSelectedTagIds([]);
                  setEditingTags(true);
                }}
                style={{
                  padding: "6px 12px",
                  background: "#444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Add Tags
              </button>
            )}
          </div>

          <div style={{ color: "#888" }}>Owed By:</div>
          <div>
            {showOwedBySelector ? (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <select
                  defaultValue={owedBy?.contact_id ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__create_new__") {
                      e.target.value = owedBy?.contact_id?.toString() ?? "";
                      onCreateContact?.();
                      return;
                    }
                    handleSetOwedBy(value ? parseInt(value) : null);
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "#252525",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">-- None --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {onCreateContact && (
                    <option value="__create_new__">+ Create new contact</option>
                  )}
                </select>
                <button
                  onClick={() => setShowOwedBySelector(false)}
                  style={{
                    padding: "6px 12px",
                    background: "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : owedBy ? (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    background: "#6b46c1",
                    color: "#fff",
                  }}
                >
                  {owedBy.contact_name}
                </span>
                <button
                  onClick={() => setShowOwedBySelector(true)}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    color: "#007acc",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                  }}
                >
                  Change
                </button>
                <button
                  onClick={() => handleSetOwedBy(null)}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    color: "#ff6b6b",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOwedBySelector(true)}
                style={{
                  padding: "6px 12px",
                  background: "#6b46c1",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Assign Contact
              </button>
            )}
          </div>

          <div style={{ color: "#888" }}>Owed To:</div>
          <div>
            {showOwedToSelector ? (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <select
                  defaultValue={owedTo?.contact_id ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__create_new__") {
                      e.target.value = owedTo?.contact_id?.toString() ?? "";
                      onCreateContact?.();
                      return;
                    }
                    handleSetOwedTo(value ? parseInt(value) : null);
                  }}
                  style={{
                    padding: "6px 10px",
                    background: "#252525",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">-- None --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {onCreateContact && (
                    <option value="__create_new__">+ Create new contact</option>
                  )}
                </select>
                <button
                  onClick={() => setShowOwedToSelector(false)}
                  style={{
                    padding: "6px 12px",
                    background: "#444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : owedTo ? (
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    background: "#2563eb",
                    color: "#fff",
                  }}
                >
                  {owedTo.contact_name}
                </span>
                <button
                  onClick={() => setShowOwedToSelector(true)}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    color: "#007acc",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                  }}
                >
                  Change
                </button>
                <button
                  onClick={() => handleSetOwedTo(null)}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    color: "#ff6b6b",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowOwedToSelector(true)}
                style={{
                  padding: "6px 12px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Assign Contact
              </button>
            )}
          </div>
        </div>

        {automaticBill && (
          <div
            style={{
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: "1px solid #444",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#007acc" }}>
              Linked Automatic Bill
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr",
                gap: "12px",
              }}
            >
              <div style={{ color: "#888" }}>Name:</div>
              <div>{automaticBill.name}</div>

              <div style={{ color: "#888" }}>Frequency:</div>
              <div style={{ textTransform: "capitalize" }}>
                {automaticBill.frequency}
              </div>

              {automaticBill.description && (
                <>
                  <div style={{ color: "#888" }}>Description:</div>
                  <div>{automaticBill.description}</div>
                </>
              )}

              {automaticBill.due_dates && (
                <>
                  <div style={{ color: "#888" }}>Due Dates:</div>
                  <div>Day(s): {automaticBill.due_dates}</div>
                </>
              )}

              {automaticBill.generation_days && (
                <>
                  <div style={{ color: "#888" }}>Generation Days:</div>
                  <div>Day(s): {automaticBill.generation_days}</div>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          {bill.status === "unpaid" && (
            <button
              onClick={handleMarkPaid}
              style={{
                padding: "10px 20px",
                background: "#2da44e",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Mark as Paid
            </button>
          )}
          <button
            onClick={handleUploadDocument}
            style={{
              padding: "10px 20px",
              background: "#007acc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {bill.document_path ? "Replace Document" : "Upload Document"}
          </button>
        </div>
      </div>

      {/* Edit Tags Modal */}
      {editingTags && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setEditingTags(false)}
        >
          <div
            style={{
              background: "#1e1e1e",
              border: "1px solid #444",
              borderRadius: 8,
              padding: 24,
              minWidth: 350,
              maxWidth: 450,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0" }}>Edit Tags</h3>
            <TagSelector
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              profileId={profileId}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={handleSaveTags}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  background: "#2da44e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingTags(false)}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  background: "#333",
                  color: "#ddd",
                  border: "1px solid #555",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "#1e1e1e",
              borderBottom: "1px solid #444",
            }}
          >
            <span style={{ color: "#fff", fontSize: "16px" }}>
              Document Preview
            </span>
            <button
              onClick={closePreview}
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
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "auto",
              padding: "20px",
            }}
          >
            {previewType?.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt="Document preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : previewType === "application/pdf" ? (
              <iframe
                src={previewUrl}
                title="PDF preview"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#fff",
                }}
              />
            ) : (
              <div style={{ color: "#fff", textAlign: "center" }}>
                <p>Preview not available for this file type.</p>
                <a
                  href={previewUrl}
                  download
                  style={{
                    color: "#007acc",
                    textDecoration: "underline",
                  }}
                >
                  Download file
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
