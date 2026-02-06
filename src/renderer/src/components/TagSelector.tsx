import { useEffect, useState } from "react";

type Tag = {
  id: number;
  name: string;
  color: string;
  created_at: string;
};

export default function TagSelector({
  selectedTagIds,
  onChange,
  profileId,
}: {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  profileId: number;
}) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#007acc");

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const tags = await window.api.tags.list(profileId);
      setAllTags(tags);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  }

  function toggleTag(tagId: number) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) {
      alert("Tag name is required");
      return;
    }

    try {
      await window.api.tags.create({
        name: newTagName.trim(),
        color: newTagColor,
        profileId,
      });
      setNewTagName("");
      setNewTagColor("#007acc");
      setShowCreateForm(false);
      await loadTags();
    } catch (err) {
      console.error("Error creating tag:", err);
      alert("Error creating tag");
    }
  }

  return (
    <div>
      <label style={{ display: "block", marginBottom: "8px", color: "#ccc" }}>
        Tags
      </label>

      {allTags.length === 0 && !showCreateForm ? (
        <div style={{ color: "#888", marginBottom: "8px" }}>
          No tags available
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "12px",
                fontSize: "14px",
                background: selectedTagIds.includes(tag.id)
                  ? tag.color
                  : "#1e1e1e",
                color: "#fff",
                border: `2px solid ${tag.color}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {showCreateForm ? (
        <div
          style={{
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "12px",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                color: "#ccc",
                fontSize: "14px",
              }}
            >
              Tag Name
            </label>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Enter tag name"
              style={{
                width: "100%",
                padding: "6px",
                background: "#2a2a2a",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "4px",
                color: "#ccc",
                fontSize: "14px",
              }}
            >
              Color
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                style={{
                  width: "60px",
                  height: "30px",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />
              <input
                type="text"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px",
                  background: "#2a2a2a",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCreateTag}
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
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewTagName("");
                setNewTagColor("#007acc");
              }}
              style={{
                padding: "6px 12px",
                background: "#444",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
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
          + Create New Tag
        </button>
      )}
    </div>
  );
}
