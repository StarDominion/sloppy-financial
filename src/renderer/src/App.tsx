import { useEffect, useState } from "react";
import { WorkspaceSelector } from "./components/WorkspaceSelector";
import { ProfileSelector } from "./components/ProfileSelector";
import { Workspace } from "./components/Workspace";
import { NotesEditor } from "./components/NotesEditor";

function App(): React.JSX.Element {
  const [view, setView] = useState<"workspace-select" | "profile-select" | "workspace" | "notes">(
    "workspace-select",
  );
  const [noteParams, setNoteParams] = useState<{ id?: number }>({});
  const [profileId, setProfileId] = useState<number | null>(null);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;

      if (hash.startsWith("#/workspace")) {
        setView("workspace");
      } else if (hash.startsWith("#/notes")) {
        setView("notes");
        const params = new URLSearchParams(hash.split("?")[1] || "");
        const id = params.get("id");
        setNoteParams({ id: id ? parseInt(id) : undefined });
      } else {
        setView("workspace-select");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  if (view === "workspace" && profileId) {
    return (
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <div className="titlebar">
          <div className="window-controls">
            <button
              className="window-controls__button"
              onClick={() => window.api.window.minimize()}
            >
              -
            </button>
            <button
              className="window-controls__button"
              onClick={() => window.api.window.toggleMaximize()}
            >
              [ ]
            </button>
            <button
              className="window-controls__button window-controls__button--close"
              onClick={() => window.api.window.close()}
            >
              X
            </button>
          </div>
        </div>
        <Workspace profileId={profileId} onSwitchProfile={() => { setProfileId(null); setView("profile-select"); }} />
      </div>
    );
  }

  if (view === "notes") {
    return (
      // Legacy window support: Full screen notes editor
      <div
        style={{
          height: "100vh",
          background: "#1e1e1e",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="titlebar">
          <div className="window-controls">
            <button
              className="window-controls__button"
              onClick={() => window.api.window.minimize()}
            >
              &#xE921;
            </button>
            <button
              className="window-controls__button window-controls__button--close"
              onClick={() => window.api.window.close()}
            >
              &#xE8BB;
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <NotesEditor initialNoteId={noteParams.id} />
        </div>
      </div>
    );
  }

  // Shared shell for workspace-select and profile-select views
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#1e1e1e",
        color: "#fff",
      }}
    >
      <div className="titlebar">
        <div className="window-controls">
          <button
            className="window-controls__button"
            onClick={() => window.api.window.minimize()}
          >
            &#xE921;
          </button>
          <button
            className="window-controls__button window-controls__button--close"
            onClick={() => window.api.window.close()}
          >
            &#xE8BB;
          </button>
        </div>
      </div>
      {view === "workspace-select" ? (
        <WorkspaceSelector
          onWorkspaceReady={() => setView("profile-select")}
        />
      ) : (
        <ProfileSelector
          onSelectProfile={(id) => {
            setProfileId(id);
            setView("workspace");
          }}
          onBackToWorkspace={() => setView("workspace-select")}
        />
      )}
    </div>
  );
}

export default App;
