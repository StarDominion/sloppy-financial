import { useEffect, useState } from "react";
import { Settings } from "./Settings";

interface DashboardProps {
  profileId: number;
}

export function Dashboard({ profileId }: DashboardProps): React.JSX.Element {
  const [noteCount, setNoteCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [reminderCount, setReminderCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    window.api.notes.list(profileId).then((notes) => {
      setNoteCount(notes.length);
      setRecentNotes(notes.slice(0, 3));
    });
    window.api.reminders.list(profileId).then((rems) => setReminderCount(rems.length));
  }, [profileId]);

  const openWorkspace = () => {
    window.api.window.openWorkspace();
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
          gap: "2rem",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Settings button in top right */}
        <button
          onClick={() => setShowSettings(true)}
          style={{
            position: "absolute",
            top: "50px",
            right: "20px",
            padding: "8px 16px",
            background: "#333",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ⚙️ Settings
        </button>

        <h1>Welcome Back</h1>

        <div style={{ display: "flex", gap: "2rem" }}>
          <div
            className="card"
            style={{
              background: "#222",
              padding: 20,
              borderRadius: 8,
              width: 200,
            }}
          >
            <h3>Notes</h3>
            <p>{noteCount} Total</p>
            <div
              style={{ fontSize: "0.8rem", opacity: 0.7, textAlign: "left" }}
            >
              {recentNotes.map((n) => (
                <div key={n.id}>- {n.title}</div>
              ))}
            </div>
          </div>

          <div
            className="card"
            style={{
              background: "#222",
              padding: 20,
              borderRadius: 8,
              width: 200,
            }}
          >
            <h3>Reminders</h3>
            <p>{reminderCount} Active</p>
          </div>
        </div>

        <button
          onClick={openWorkspace}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            background: "#007acc",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Open Workspace
        </button>
      </div>

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
