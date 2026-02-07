import { useState, useEffect } from "react";

interface RecentEntry {
  path: string;
  lastOpened: string;
}

interface WorkspaceSelectorProps {
  onWorkspaceReady: () => void;
}

export function WorkspaceSelector({
  onWorkspaceReady,
}: WorkspaceSelectorProps): React.JSX.Element {
  const [recentPaths, setRecentPaths] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const paths = await window.api.workspace.listRecent();
      setRecentPaths(paths);
    } catch (err) {
      console.error("Failed to load recent workspaces:", err);
    }
  };

  const handleOpenRecent = async (folderPath: string) => {
    setLoading(true);
    setError(null);
    try {
      await window.api.workspace.open(folderPath);
      onWorkspaceReady();
    } catch (err: any) {
      setError(`Failed to open workspace: ${err.message}`);
      setLoading(false);
    }
  };

  const handleOpenExisting = async () => {
    const folderPath = await window.api.workspace.showOpenDialog();
    if (!folderPath) return;

    setLoading(true);
    setError(null);
    try {
      // Check if it has a config.json, if not create one
      try {
        await window.api.workspace.open(folderPath);
      } catch {
        // No config.json - create workspace with defaults
        await window.api.workspace.create(folderPath);
      }
      onWorkspaceReady();
    } catch (err: any) {
      setError(`Failed to open workspace: ${err.message}`);
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    const folderPath = await window.api.workspace.showCreateDialog();
    if (!folderPath) return;

    setLoading(true);
    setError(null);
    try {
      await window.api.workspace.create(folderPath);
      onWorkspaceReady();
    } catch (err: any) {
      setError(`Failed to create workspace: ${err.message}`);
      setLoading(false);
    }
  };

  const handleRemoveRecent = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    await window.api.workspace.removeRecent(path);
    await loadRecent();
  };

  const formatDate = (dateStr: string) => {
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

  const getFolderName = (fullPath: string) => {
    const parts = fullPath.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || fullPath;
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flex: 1,
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: 18, color: "#aaa" }}>Opening workspace...</div>
        <div style={{ fontSize: 13, color: "#666" }}>
          Initializing database and storage
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        flex: 1,
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <h1 style={{ marginBottom: 0 }}>Sloppy Financial</h1>
      <p style={{ color: "#888", marginTop: 0 }}>
        Select a workspace folder to get started
      </p>

      {error && (
        <div
          style={{
            padding: "10px 16px",
            background: "#3a1a1a",
            border: "1px solid #ff4444",
            borderRadius: 6,
            color: "#ff8888",
            fontSize: 13,
            maxWidth: 500,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {recentPaths.length > 0 && (
        <div style={{ width: "100%", maxWidth: 500 }}>
          <h3 style={{ fontSize: 14, color: "#aaa", marginBottom: 8 }}>
            Recent Workspaces
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentPaths.map((entry) => (
              <div
                key={entry.path}
                onClick={() => handleOpenRecent(entry.path)}
                style={{
                  background: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: 8,
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "#007acc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#444";
                }}
              >
                <div style={{ fontSize: 24 }}>📂</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {getFolderName(entry.path)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#888",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.path}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                    Last opened: {formatDate(entry.lastOpened)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveRecent(e, entry.path)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: "4px 8px",
                    fontSize: 16,
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#ff6666";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                  title="Remove from recent"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: recentPaths.length > 0 ? 8 : 0,
        }}
      >
        <button
          onClick={handleOpenExisting}
          style={{
            padding: "10px 20px",
            background: "#007acc",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Open Folder
        </button>
        <button
          onClick={handleCreateNew}
          style={{
            padding: "10px 20px",
            background: "#333",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Create New Workspace
        </button>
      </div>
    </div>
  );
}
