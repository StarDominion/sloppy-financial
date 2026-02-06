import { useEffect, useState } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

type Note = {
  id: number;
  title: string;
  content: string;
  updated_at: string;
};

interface NotesListProps {
  onOpenNote: (noteId: number) => void;
  onNewNote: () => void;
  profileId: number;
}

export function NotesList({
  onOpenNote,
  onNewNote,
  profileId,
}: NotesListProps): React.JSX.Element {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadNotes();
    return onDataChange("notes", loadNotes);
  }, []);

  async function loadNotes() {
    try {
      const list = await window.api.notes.list(profileId);
      setNotes(list);
    } catch (err) {
      console.error("Error loading notes:", err);
    }
  }

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()),
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
        <h2 style={{ margin: 0 }}>Notes</h2>
        <button
          onClick={onNewNote}
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
          + New Note
        </button>
      </div>

      <input
        type="text"
        placeholder="Search notes..."
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
        {filteredNotes.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            {search
              ? "No notes match your search"
              : "No notes yet. Create one to get started."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onOpenNote(note.id)}
                style={{
                  background: "#1e1e1e",
                  border: "1px solid #444",
                  borderRadius: "8px",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#007acc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#444")
                }
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "8px",
                  }}
                >
                  {note.title || "Untitled"}
                </div>
                <div
                  style={{
                    color: "#888",
                    fontSize: "14px",
                    marginBottom: "8px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {note.content
                    ? note.content.substring(0, 150) +
                      (note.content.length > 150 ? "..." : "")
                    : "No content"}
                </div>
                <div style={{ color: "#666", fontSize: "12px" }}>
                  Updated: {new Date(note.updated_at).toLocaleString()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this note?")) {
                      window.api.notes.delete(note.id).then(() => {
                        emitDataChange("notes");
                        loadNotes();
                      });
                    }
                  }}
                  style={{
                    marginTop: "8px",
                    padding: "4px 12px",
                    background: "#d9534f",
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
