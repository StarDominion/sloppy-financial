import { useEffect, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { emitDataChange } from "../dataEvents";

type Note = {
  id: number;
  title: string;
  content: string;
  updated_at: string;
};

type NotesEditorProps = {
  initialNoteId?: number;
  profileId?: number;
  onNoteSaved?: (note: Note) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
};

export function NotesEditor({
  initialNoteId,
  profileId,
  onNoteSaved,
  onTitleChange,
  onDelete,
}: NotesEditorProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [noteId, setNoteId] = useState<number | null>(initialNoteId || null);

  // Load note if initialNoteId is provided
  useEffect(() => {
    if (initialNoteId) {
      loadNote(initialNoteId);
    }
  }, [initialNoteId]);

  const loadNote = async (id: number) => {
    const list = await window.api.notes.list(profileId!);
    const note = list.find((n) => n.id === id);
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setNoteId(note.id);
      if (onTitleChange) onTitleChange(note.title || "Untitled");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setStatus("Title required");
      return;
    }
    const saved = await window.api.notes.save({
      id: noteId ?? undefined,
      title,
      content,
      profileId: profileId!,
    });

    setNoteId(saved.id);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 2000);

    emitDataChange("notes");

    if (onNoteSaved)
      onNoteSaved({
        ...saved,
        updated_at: saved.updated_at || new Date().toISOString(),
      });
  };

  const handleDelete = async () => {
    if (!noteId) return;
    if (!confirm("Delete this note?")) return;
    await window.api.notes.delete(noteId);
    emitDataChange("notes");
    if (onDelete) onDelete();
  };

  return (
    <div className="ne-container">
      {/* Editor Area */}
      <div className="ne-editor-area" style={{ flex: 1 }}>
        <div style={{ position: "relative" }}>
          <input
            className="ne-title-input"
            placeholder="Note Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (onTitleChange) onTitleChange(e.target.value || "New Note");
            }}
          />
          <button
            onClick={handleSave}
            style={{
              position: "absolute",
              right: 90,
              top: 20,
              padding: "5px 15px",
              background: "#007acc",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Save
          </button>
          {noteId && (
            <button
              onClick={handleDelete}
              style={{
                position: "absolute",
                right: 20,
                top: 20,
                padding: "5px 15px",
                background: "#d9534f",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          )}
          {status && (
            <span
              style={{
                position: "absolute",
                right: 80,
                top: 25,
                color: "#0f0",
                fontSize: "0.8rem",
              }}
            >
              {status}
            </span>
          )}
        </div>
        <div className="ne-content-wrapper" data-color-mode="dark">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || "")}
            height="100%"
            preview="live"
            visiableDragbar={false}
            hideToolbar={false}
            style={{ border: "none", background: "transparent" }}
          />
        </div>
      </div>
    </div>
  );
}
