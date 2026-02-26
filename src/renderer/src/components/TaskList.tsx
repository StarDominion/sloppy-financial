import { useEffect, useState } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

type Task = {
  id: number;
  profile_id: number;
  title: string;
  description: string | null;
  completed: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

interface TaskListProps {
  profileId: number;
}

export function TaskList({ profileId }: TaskListProps): React.JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function loadTasks(): Promise<void> {
    try {
      const list = await window.api.tasks.list(profileId);
      setTasks(list);
    } catch (err) {
      console.error("Error loading tasks:", err);
    }
  }

  useEffect(() => {
    loadTasks();
    return onDataChange("tasks", loadTasks);
  }, [profileId]);

  async function handleCreate(): Promise<void> {
    if (!newTaskTitle.trim()) return;
    try {
      await window.api.tasks.create({ title: newTaskTitle.trim(), profileId });
      setNewTaskTitle("");
      await loadTasks();
      emitDataChange("tasks");
    } catch (err) {
      console.error("Error creating task:", err);
    }
  }

  async function handleToggleComplete(task: Task): Promise<void> {
    try {
      await window.api.tasks.update(task.id, {
        completed: task.completed ? 0 : 1,
      });
      await loadTasks();
      emitDataChange("tasks");
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await window.api.tasks.delete(id);
      await loadTasks();
      emitDataChange("tasks");
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  }

  function startEditing(task: Task): void {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    if (!expandedIds.has(task.id)) {
      setExpandedIds((prev) => new Set(prev).add(task.id));
    }
  }

  async function handleSaveEdit(): Promise<void> {
    if (editingId === null) return;
    try {
      await window.api.tasks.update(editingId, {
        title: editTitle,
        description: editDescription || null,
      });
      setEditingId(null);
      await loadTasks();
      emitDataChange("tasks");
    } catch (err) {
      console.error("Error updating task:", err);
    }
  }

  function handleCancelEdit(): void {
    setEditingId(null);
  }

  function toggleExpanded(id: number): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  const completedCount = filteredTasks.filter((t) => t.completed).length;
  const totalCount = filteredTasks.length;

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
      {/* Header */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Task List</h2>
          {totalCount > 0 && (
            <span style={{ fontSize: "13px", color: "#888", marginTop: 4 }}>
              {completedCount} of {totalCount} completed
            </span>
          )}
        </div>
      </div>

      {/* New Task Input */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          style={{
            flex: 1,
            padding: "10px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleCreate}
          disabled={!newTaskTitle.trim()}
          style={{
            padding: "10px 20px",
            background: newTaskTitle.trim() ? "#2da44e" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: newTaskTitle.trim() ? "pointer" : "default",
            fontWeight: "bold",
          }}
        >
          + Add
        </button>
      </div>

      {/* Search */}
      {tasks.length > 0 && (
        <input
          type="text"
          placeholder="Search tasks..."
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
      )}

      {/* Task List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            {search
              ? "No tasks match your search"
              : "No tasks yet. Add one above to get started."}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              style={{
                padding: "12px 16px",
                background: "#252526",
                borderRadius: "6px",
                marginBottom: "8px",
                border: "1px solid #333",
              }}
            >
              {/* Task Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={!!task.completed}
                  onChange={() => handleToggleComplete(task)}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    accentColor: "#2da44e",
                    flexShrink: 0,
                  }}
                />

                {/* Title */}
                {editingId === task.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      background: "#1e1e1e",
                      color: "#fff",
                      border: "1px solid #007acc",
                      borderRadius: "4px",
                      fontSize: "14px",
                    }}
                    autoFocus
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      fontWeight: "bold",
                      textDecoration: task.completed ? "line-through" : "none",
                      color: task.completed ? "#666" : "#e0e0e0",
                      cursor: "pointer",
                    }}
                    onDoubleClick={() => startEditing(task)}
                  >
                    {task.title}
                  </span>
                )}

                {/* Expand/Collapse */}
                <span
                  onClick={() => toggleExpanded(task.id)}
                  style={{
                    cursor: "pointer",
                    color: "#888",
                    fontSize: "16px",
                    userSelect: "none",
                    flexShrink: 0,
                    transition: "transform 0.2s",
                    transform: expandedIds.has(task.id)
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    display: "inline-block",
                  }}
                >
                  &#9654;
                </span>

                {/* Edit / Save / Cancel */}
                {editingId === task.id ? (
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={handleSaveEdit}
                      style={{
                        padding: "4px 10px",
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
                      onClick={handleCancelEdit}
                      style={{
                        padding: "4px 10px",
                        background: "#333",
                        color: "#aaa",
                        border: "1px solid #555",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditing(task)}
                    style={{
                      padding: "4px 10px",
                      background: "#333",
                      color: "#aaa",
                      border: "1px solid #555",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      flexShrink: 0,
                    }}
                  >
                    Edit
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(task.id)}
                  style={{
                    padding: "4px 10px",
                    background: "#5c2020",
                    color: "#f87171",
                    border: "1px solid #7f1d1d",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>

              {/* Expanded Context */}
              {expandedIds.has(task.id) && (
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #333",
                  }}
                >
                  {editingId === task.id ? (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add a description or notes..."
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "#1e1e1e",
                        color: "#fff",
                        border: "1px solid #007acc",
                        borderRadius: "4px",
                        fontSize: "13px",
                        resize: "vertical",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: "13px",
                        color: task.description ? "#bbb" : "#555",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {task.description ||
                        "No description. Double-click the title or click Edit to add one."}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#555",
                    }}
                  >
                    Created: {new Date(task.created_at).toLocaleString()}
                    {task.updated_at !== task.created_at && (
                      <span style={{ marginLeft: 12 }}>
                        Updated: {new Date(task.updated_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
