import { useEffect, useState } from "react";

type Profile = {
  id: number;
  name: string;
  type: "personal" | "corporate";
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  note_count: number;
  bill_count: number;
  file_count: number;
  contact_count: number;
};

interface ProfileSelectorProps {
  onSelectProfile: (profileId: number) => void;
  onBackToWorkspace?: () => void;
}

export function ProfileSelector({
  onSelectProfile,
  onBackToWorkspace,
}: ProfileSelectorProps): React.JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"personal" | "corporate">("personal");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"personal" | "corporate">(
    "personal",
  );

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const list = await window.api.profiles.list();
      setProfiles(list);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await window.api.profiles.create({ name: newName.trim(), type: newType });
      setNewName("");
      setNewType("personal");
      setShowCreate(false);
      await loadProfiles();
    } catch (err) {
      console.error("Failed to create profile:", err);
    }
  };

  const handleSelect = async (profileId: number) => {
    await window.api.profiles.touch(profileId);
    onSelectProfile(profileId);
  };

  const handleDelete = async (id: number) => {
    if (profiles.length <= 1) {
      alert("Cannot delete the last profile.");
      return;
    }
    const profile = profiles.find((p) => p.id === id);
    if (
      !confirm(
        `Delete profile "${profile?.name}"? This will remove all associated data.`,
      )
    )
      return;
    try {
      await window.api.profiles.delete(id);
      await loadProfiles();
    } catch (err) {
      console.error("Failed to delete profile:", err);
    }
  };

  const handleEdit = async (id: number) => {
    try {
      await window.api.profiles.update(id, {
        name: editName,
        type: editType,
      });
      setEditingId(null);
      await loadProfiles();
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setEditType(profile.type);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "1.5rem",
          background: "#1e1e1e",
          color: "#fff",
          position: "relative",
        }}
      >
        {/* Change Workspace button */}
        {onBackToWorkspace && (
          <button
            onClick={onBackToWorkspace}
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              padding: "8px 16px",
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Change Workspace
          </button>
        )}

        <h1 style={{ marginBottom: 0 }}>Sloppy Financial</h1>
        <p style={{ color: "#888", marginTop: 0 }}>Select a profile to continue</p>

        {loading ? (
          <p style={{ color: "#666" }}>Loading profiles...</p>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 800,
            }}
          >
            {profiles.map((profile) => (
              <div
                key={profile.id}
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: 12,
                  padding: 20,
                  width: 220,
                  cursor: "pointer",
                  transition: "border-color 0.2s, transform 0.1s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "#007acc";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#444";
                  (e.currentTarget as HTMLDivElement).style.transform = "none";
                }}
                onClick={() => {
                  if (editingId !== profile.id) handleSelect(profile.id);
                }}
              >
                {editingId === profile.id ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        padding: 6,
                        background: "#1e1e1e",
                        border: "1px solid #555",
                        color: "#fff",
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEdit(profile.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <select
                      value={editType}
                      onChange={(e) =>
                        setEditType(
                          e.target.value as "personal" | "corporate",
                        )
                      }
                      style={{
                        padding: 6,
                        background: "#1e1e1e",
                        border: "1px solid #555",
                        color: "#fff",
                        borderRadius: 4,
                      }}
                    >
                      <option value="personal">Personal</option>
                      <option value="corporate">Corporate</option>
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleEdit(profile.id)}
                        style={{
                          flex: 1,
                          padding: "4px 8px",
                          background: "#007acc",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          flex: 1,
                          padding: "4px 8px",
                          background: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Profile icon */}
                    <div
                      style={{
                        fontSize: 36,
                        marginBottom: 8,
                        textAlign: "center",
                      }}
                    >
                      {profile.type === "corporate" ? "🏢" : "👤"}
                    </div>

                    <h3
                      style={{
                        margin: "0 0 4px",
                        textAlign: "center",
                        fontSize: 16,
                      }}
                    >
                      {profile.name}
                    </h3>

                    <div
                      style={{
                        textAlign: "center",
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background:
                            profile.type === "corporate"
                              ? "#1e3a5f"
                              : "#2d4a2d",
                          borderRadius: 10,
                          color:
                            profile.type === "corporate"
                              ? "#7cb3ff"
                              : "#7cff7c",
                        }}
                      >
                        {profile.type}
                      </span>
                    </div>

                    {/* Stats */}
                    <div
                      style={{
                        fontSize: 12,
                        color: "#aaa",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 8px",
                      }}
                    >
                      <span>📝 {profile.note_count} notes</span>
                      <span>💰 {profile.bill_count} bills</span>
                      <span>📁 {profile.file_count} files</span>
                      <span>👥 {profile.contact_count} contacts</span>
                    </div>

                    {/* Last used */}
                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        textAlign: "center",
                        marginTop: 10,
                      }}
                    >
                      Last used: {formatDate(profile.last_used_at)}
                    </div>

                    {/* Action buttons */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(profile);
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          background: "transparent",
                          border: "1px solid #555",
                          color: "#aaa",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(profile.id);
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          background: "transparent",
                          border: "1px solid #555",
                          color: "#aaa",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Create new profile card */}
            {!showCreate ? (
              <div
                onClick={() => setShowCreate(true)}
                style={{
                  background: "#2a2a2a",
                  border: "2px dashed #444",
                  borderRadius: 12,
                  padding: 20,
                  width: 220,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "border-color 0.2s",
                  minHeight: 180,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "#007acc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#444";
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
                <span style={{ color: "#888" }}>New Profile</span>
              </div>
            ) : (
              <div
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #007acc",
                  borderRadius: 12,
                  padding: 20,
                  width: 220,
                }}
              >
                <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>
                  Create Profile
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Profile name"
                    style={{
                      padding: 8,
                      background: "#1e1e1e",
                      border: "1px solid #555",
                      color: "#fff",
                      borderRadius: 4,
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") setShowCreate(false);
                    }}
                  />
                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(
                        e.target.value as "personal" | "corporate",
                      )
                    }
                    style={{
                      padding: 8,
                      background: "#1e1e1e",
                      border: "1px solid #555",
                      color: "#fff",
                      borderRadius: 4,
                    }}
                  >
                    <option value="personal">Personal</option>
                    <option value="corporate">Corporate</option>
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleCreate}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#007acc",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreate(false)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </>
  );
}
