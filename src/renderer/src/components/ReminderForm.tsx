import React, { useState } from "react";
import { emitDataChange } from "../dataEvents";

type Reminder = {
  id: number;
  title: string;
  body: string;
  schedule_type: "once" | "cron";
  scheduled_at: string | null;
  cron_expr: string | null;
  is_active: number;
};

function toLocalDatetimeValue(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ReminderFormProps {
  profileId: number;
  onSave: () => void;
  onCancel: () => void;
  editingReminder?: Reminder | null;
}

export function ReminderForm({
  profileId,
  onSave,
  onCancel,
  editingReminder,
}: ReminderFormProps): React.JSX.Element {
  const [title, setTitle] = useState(editingReminder?.title || "");
  const [body, setBody] = useState(editingReminder?.body || "");
  const [scheduleType, setScheduleType] = useState<"once" | "cron">(
    editingReminder?.schedule_type || "once",
  );
  const [scheduledAt, setScheduledAt] = useState(
    editingReminder?.scheduled_at ? toLocalDatetimeValue(editingReminder.scheduled_at) : "",
  );
  const [cronExpr, setCronExpr] = useState(editingReminder?.cron_expr || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (scheduleType === "once" && !scheduledAt) {
      alert("Please select a date and time");
      return;
    }

    if (scheduleType === "cron" && !cronExpr.trim()) {
      alert("Please enter a cron expression");
      return;
    }

    setSaving(true);
    try {
      if (editingReminder) {
        await window.api.reminders.update(editingReminder.id, {
          title: title.trim(),
          body: body.trim(),
          scheduleType,
          scheduledAt:
            scheduleType === "once" ? new Date(scheduledAt).toISOString() : null,
          cronExpr: scheduleType === "cron" ? cronExpr.trim() : null,
        });
      } else {
        await window.api.reminders.create({
          title: title.trim(),
          body: body.trim(),
          scheduleType,
          scheduledAt:
            scheduleType === "once" ? new Date(scheduledAt).toISOString() : null,
          cronExpr: scheduleType === "cron" ? cronExpr.trim() : null,
          profileId,
        });
      }
      emitDataChange("reminders");
      onSave();
    } catch (err) {
      console.error("Error saving reminder:", err);
      alert("Failed to save reminder");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    background: "#1e1e1e",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "4px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    color: "#ccc",
    fontSize: "13px",
    fontWeight: "bold",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder title"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reminder body text"
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Schedule Type</label>
        <select
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value as "once" | "cron")}
          style={inputStyle}
        >
          <option value="once">One-time</option>
          <option value="cron">Recurring (Cron)</option>
        </select>
      </div>

      {scheduleType === "once" && (
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Date & Time *</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {scheduleType === "cron" && (
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Cron Expression *</label>
          <input
            type="text"
            value={cronExpr}
            onChange={(e) => setCronExpr(e.target.value)}
            placeholder="e.g. 0 9 * * 1  (every Monday at 9 AM)"
            style={inputStyle}
          />
          <div style={{ marginTop: "6px", color: "#888", fontSize: "12px" }}>
            Format: second minute hour day-of-month month day-of-week
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 20px",
            background: "#333",
            color: "#ccc",
            border: "1px solid #555",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 20px",
            background: saving ? "#555" : "#2da44e",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {saving ? "Saving..." : editingReminder ? "Update Reminder" : "Create Reminder"}
        </button>
      </div>
    </form>
  );
}
