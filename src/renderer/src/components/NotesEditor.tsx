import { useEffect, useState, useRef } from "react";
import { marked } from "marked";
import { LexicalEditorComponent } from "./LexicalEditor";
import { emitDataChange } from "../dataEvents";

type Note = {
  id: number;
  title: string;
  content: string;
  updated_at: string;
};

type NotesEditorProps = {
  tabId: string;
  initialNoteId?: number;
  profileId?: number;
  onNoteSaved?: (note: Note) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
};

/** Detect whether a string is already HTML (vs legacy markdown). */
function isLikelyHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Convert legacy markdown content to HTML. */
async function ensureHtml(text: string): Promise<string> {
  if (!text || !text.trim()) return "";
  if (isLikelyHtml(text)) return text;
  return await marked.parse(text);
}

export function NotesEditor({
  tabId,
  initialNoteId,
  profileId,
  onNoteSaved,
  onTitleChange,
  onDelete,
}: NotesEditorProps): React.JSX.Element {
  const draftKey = `note-draft-${profileId}-${tabId}`;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentKey, setContentKey] = useState(""); // changes when we load a different note
  const [status, setStatus] = useState("");
  const [noteId, setNoteId] = useState<number | null>(initialNoteId || null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Load note from DB then overlay any saved draft
  useEffect(() => {
    if (initialNoteId) {
      loadNote(initialNoteId);
    } else {
      // New note — restore draft if any
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved);
          setTitle(draft.title || "");
          ensureHtml(draft.content || "").then((html) => {
            setContent(html);
            setContentKey(`new-draft-${Date.now()}`);
          });
          if (onTitleChange) onTitleChange(draft.title || "New Note");
        } else {
          setContentKey(`new-${Date.now()}`);
        }
      } catch {
        setContentKey(`new-${Date.now()}`);
      }
    }
  }, [initialNoteId]);

  const loadNote = async (id: number) => {
    const list = await window.api.notes.list(profileId!);
    const note = list.find((n) => n.id === id);
    if (note) {
      // Check for a draft that overrides the DB version
      try {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved);
          setTitle(draft.title ?? note.title);
          const html = await ensureHtml(draft.content ?? note.content);
          setContent(html);
          setNoteId(note.id);
          setContentKey(`note-${note.id}-draft-${Date.now()}`);
          if (onTitleChange) onTitleChange(draft.title || note.title || "Untitled");
          return;
        }
      } catch { /* ignore */ }

      setTitle(note.title);
      const html = await ensureHtml(note.content);
      setContent(html);
      setNoteId(note.id);
      setContentKey(`note-${note.id}-${Date.now()}`);
      if (onTitleChange) onTitleChange(note.title || "Untitled");
    }
  };

  // Save draft to localStorage on every edit
  const saveDraft = (t: string, c: string) => {
    localStorage.setItem(draftKey, JSON.stringify({ title: t, content: c }));
  };

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setStatus("Title required");
      return;
    }
    const saved = await window.api.notes.save({
      id: noteId ?? undefined,
      title,
      content: contentRef.current,
      profileId: profileId!,
    });

    setNoteId(saved.id);
    setStatus("Saved");
    clearDraft();
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
    clearDraft();
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
              saveDraft(e.target.value, contentRef.current);
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
        <div className="ne-content-wrapper">
          <LexicalEditorComponent
            content={content}
            contentKey={contentKey}
            onUpdate={(html) => {
              contentRef.current = html;
              saveDraft(title, html);
            }}
            placeholder="Start writing..."
          />
        </div>
      </div>
    </div>
  );
}
