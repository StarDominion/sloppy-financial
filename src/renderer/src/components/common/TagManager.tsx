import { useEffect, useState } from "react";

type Tag = {
  id: number;
  name: string;
  color: string;
  created_at: string;
};

type TagUsage = {
  bill_records: number;
  automatic_bills: number;
  tax_documents: number;
  payments: number;
  invoices: number;
  transactions: number;
};

interface TagManagerProps {
  profileId: number;
}

export function TagManager({ profileId }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [usage, setUsage] = useState<Record<number, TagUsage>>({});
  const [expandedTagId, setExpandedTagId] = useState<number | null>(null);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#007acc");
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);

  useEffect(() => {
    loadTags();
  }, [profileId]);

  async function loadTags() {
    try {
      const data = await window.api.tags.list(profileId);
      setTags(data);
      const usageMap: Record<number, TagUsage> = {};
      for (const tag of data) {
        usageMap[tag.id] = await window.api.tags.getUsage(tag.id);
      }
      setUsage(usageMap);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  }

  function getTotalUsage(tagId: number): number {
    const u = usage[tagId];
    if (!u) return 0;
    return u.bill_records + u.automatic_bills + u.tax_documents + u.payments + u.invoices + u.transactions;
  }

  async function handleDelete(tagId: number) {
    try {
      await window.api.tags.delete(tagId);
      setDeletingTagId(null);
      setExpandedTagId(null);
      await loadTags();
    } catch (err) {
      console.error("Error deleting tag:", err);
    }
  }

  async function handleUpdate(tagId: number) {
    if (!editName.trim()) return;
    try {
      await window.api.tags.update(tagId, { name: editName.trim(), color: editColor });
      setEditingTagId(null);
      await loadTags();
    } catch (err) {
      console.error("Error updating tag:", err);
    }
  }

  async function handleCreate() {
    if (!newTagName.trim()) return;
    try {
      await window.api.tags.create({ name: newTagName.trim(), color: newTagColor, profileId });
      setNewTagName("");
      setNewTagColor("#007acc");
      setShowCreateForm(false);
      await loadTags();
    } catch (err) {
      console.error("Error creating tag:", err);
    }
  }

  const usageLabels: { key: keyof TagUsage; label: string }[] = [
    { key: "transactions", label: "Transactions" },
    { key: "bill_records", label: "Bill Records" },
    { key: "automatic_bills", label: "Automatic Bills" },
    { key: "payments", label: "Payments" },
    { key: "invoices", label: "Invoices" },
    { key: "tax_documents", label: "Tax Documents" },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "0 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#ddd" }}>Tag Manager</h2>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: "6px 14px",
              background: "#007acc",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            + New Tag
          </button>
        )}
      </div>

      {showCreateForm && (
        <div style={{ background: "#252525", border: "1px solid #444", borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 4, color: "#ccc", fontSize: 13 }}>Name</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, color: "#ccc", fontSize: 13 }}>Color</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  style={{ width: 36, height: 32, border: "1px solid #444", borderRadius: 4, cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  style={{
                    width: 80,
                    padding: "6px 8px",
                    background: "#2a2a2a",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              style={{ padding: "6px 14px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setNewTagName(""); setNewTagColor("#007acc"); }}
              style={{ padding: "6px 14px", background: "#444", color: "#fff", border: "1px solid #666", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tags.length === 0 ? (
        <div style={{ color: "#888", textAlign: "center", padding: 40 }}>
          No tags yet. Create one to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {tags.map((tag) => {
            const total = getTotalUsage(tag.id);
            const isExpanded = expandedTagId === tag.id;
            const isEditing = editingTagId === tag.id;
            const isDeleting = deletingTagId === tag.id;
            const u = usage[tag.id];

            return (
              <div key={tag.id} style={{ background: "#252525", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
                {/* Tag row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 14px",
                    cursor: "pointer",
                    gap: 12,
                  }}
                  onClick={() => setExpandedTagId(isExpanded ? null : tag.id)}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: tag.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, color: "#ddd", fontSize: 14, fontWeight: 500 }}>{tag.name}</span>
                  <span style={{ color: "#888", fontSize: 13 }}>
                    {total === 0 ? "Unused" : `${total} item${total !== 1 ? "s" : ""}`}
                  </span>
                  <span style={{ color: "#666", fontSize: 12 }}>{isExpanded ? "\u25B2" : "\u25BC"}</span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid #333" }}>
                    {/* Usage breakdown */}
                    {u && total > 0 && (
                      <div style={{ marginTop: 12, marginBottom: 12 }}>
                        <div style={{ color: "#aaa", fontSize: 13, marginBottom: 8 }}>Used by:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {usageLabels.map(({ key, label }) =>
                            u[key] > 0 ? (
                              <span
                                key={key}
                                style={{
                                  padding: "4px 10px",
                                  background: "#1e1e1e",
                                  border: "1px solid #444",
                                  borderRadius: 12,
                                  fontSize: 13,
                                  color: "#ccc",
                                }}
                              >
                                {u[key]} {label}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </div>
                    )}

                    {u && total === 0 && (
                      <div style={{ marginTop: 12, marginBottom: 12, color: "#888", fontSize: 13 }}>
                        This tag is not used by any items.
                      </div>
                    )}

                    {/* Edit form */}
                    {isEditing ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: 4, color: "#ccc", fontSize: 13 }}>Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              background: "#2a2a2a",
                              color: "#fff",
                              border: "1px solid #444",
                              borderRadius: 4,
                              fontSize: 14,
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: 4, color: "#ccc", fontSize: 13 }}>Color</label>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input
                              type="color"
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              style={{ width: 36, height: 32, border: "1px solid #444", borderRadius: 4, cursor: "pointer" }}
                            />
                            <input
                              type="text"
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              style={{
                                width: 80,
                                padding: "6px 8px",
                                background: "#2a2a2a",
                                color: "#fff",
                                border: "1px solid #444",
                                borderRadius: 4,
                                fontSize: 14,
                              }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleUpdate(tag.id)}
                          style={{ padding: "6px 14px", background: "#2da44e", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTagId(null)}
                          style={{ padding: "6px 14px", background: "#444", color: "#fff", border: "1px solid #666", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : isDeleting ? (
                      <div style={{ marginTop: 8, background: "#3a1c1c", border: "1px solid #6b3030", borderRadius: 6, padding: 14 }}>
                        <div style={{ color: "#f88", fontSize: 14, marginBottom: 8 }}>
                          Are you sure you want to delete "{tag.name}"?
                        </div>
                        {total > 0 && (
                          <div style={{ color: "#e88", fontSize: 13, marginBottom: 12 }}>
                            This will remove the tag from {total} item{total !== 1 ? "s" : ""}:
                            {usageLabels
                              .filter(({ key }) => u && u[key] > 0)
                              .map(({ key, label }) => ` ${u![key]} ${label}`)
                              .join(",")}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            style={{ padding: "6px 14px", background: "#b33", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeletingTagId(null)}
                            style={{ padding: "6px 14px", background: "#444", color: "#fff", border: "1px solid #666", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            setEditingTagId(tag.id);
                            setEditName(tag.name);
                            setEditColor(tag.color);
                          }}
                          style={{ padding: "6px 14px", background: "#333", color: "#ddd", border: "1px solid #555", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingTagId(tag.id)}
                          style={{ padding: "6px 14px", background: "#333", color: "#f88", border: "1px solid #553030", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
