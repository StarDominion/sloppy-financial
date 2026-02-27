import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { ReminderForm } from "./ReminderForm";
import { onDataChange, emitDataChange } from "../dataEvents";

type Reminder = {
  id: number;
  title: string;
  body: string;
  schedule_type: "once" | "cron";
  scheduled_at: string | null;
  cron_expr: string | null;
  is_active: number;
};

interface RemindersListProps {
  profileId: number;
}

export function RemindersList({
  profileId,
}: RemindersListProps): React.JSX.Element {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [search, setSearch] = useState("");
  const [testTitle, setTestTitle] = useState("Test Reminder");
  const [testBody, setTestBody] = useState(
    "This is a test desktop notification!",
  );

  async function loadReminders(): Promise<void> {
    try {
      const list = await window.api.reminders.list(profileId);
      setReminders(list);
    } catch (err) {
      console.error("Error loading reminders:", err);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    if (!confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await window.api.reminders.delete(id);
      await loadReminders();
      emitDataChange("reminders");
    } catch (err) {
      console.error("Error deleting reminder:", err);
    }
  }

  async function handleTestNotification(): Promise<void> {
    try {
      await window.api.reminders.testNotification(testTitle, testBody);
    } catch (err) {
      console.error("Error sending test notification:", err);
      alert("Failed to send test notification");
    }
  }

  useEffect(() => {
    loadReminders();
    return onDataChange("reminders", loadReminders);
  }, []);

  const filteredReminders = reminders.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.body.toLowerCase().includes(search.toLowerCase()),
  );

  function formatSchedule(r: Reminder): string {
    if (r.schedule_type === "once" && r.scheduled_at) {
      return `Once — ${new Date(r.scheduled_at).toLocaleString()}`;
    }
    if (r.schedule_type === "cron" && r.cron_expr) {
      return `Recurring — ${r.cron_expr}`;
    }
    return "Unknown";
  }

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
        <h2 style={{ margin: 0 }}>Reminders</h2>
        <button
          onClick={() => setShowCreateModal(true)}
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
          + New Reminder
        </button>
      </div>

      <input
        type="text"
        placeholder="Search reminders..."
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

      {/* Test Notification Panel */}
      <div
        style={{
          marginBottom: "20px",
          padding: "16px",
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: "6px",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", color: "#e0e0e0" }}>
          🔔 Test Desktop Notification
        </h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Title"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            style={{
              flex: 1,
              padding: "8px",
              background: "#1e1e1e",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              fontSize: "13px",
            }}
          />
          <input
            type="text"
            placeholder="Body"
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            style={{
              flex: 2,
              padding: "8px",
              background: "#1e1e1e",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              fontSize: "13px",
            }}
          />
        </div>
        <button
          onClick={handleTestNotification}
          style={{
            padding: "8px 16px",
            background: "#0078d4",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Send Test Notification
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredReminders.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            {search
              ? "No reminders match your search"
              : "No reminders yet. Create one to get started."}
          </div>
        ) : (
          filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              style={{
                padding: "14px 16px",
                background: "#252526",
                borderRadius: "6px",
                marginBottom: "8px",
                border: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                    {reminder.title}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: reminder.is_active ? "#1a4731" : "#3a2a2a",
                      color: reminder.is_active ? "#4ade80" : "#f87171",
                      border: `1px solid ${reminder.is_active ? "#166534" : "#7f1d1d"}`,
                    }}
                  >
                    {reminder.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {reminder.body && (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#aaa",
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {reminder.body}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#777" }}>
                  {formatSchedule(reminder)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", marginLeft: "12px", flexShrink: 0 }}>
                <button
                  onClick={() => setEditingReminder(reminder)}
                  style={{
                    padding: "6px 12px",
                    background: "#1e3a5f",
                    color: "#60a5fa",
                    border: "1px solid #1e40af",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(reminder.id)}
                  style={{
                    padding: "6px 12px",
                    background: "#5c2020",
                    color: "#f87171",
                    border: "1px solid #7f1d1d",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        title="New Reminder"
        onClose={() => setShowCreateModal(false)}
      >
        <ReminderForm
          profileId={profileId}
          onSave={() => {
            setShowCreateModal(false);
            loadReminders();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingReminder}
        title="Edit Reminder"
        onClose={() => setEditingReminder(null)}
      >
        {editingReminder && (
          <ReminderForm
            key={editingReminder.id}
            profileId={profileId}
            editingReminder={editingReminder}
            onSave={() => {
              setEditingReminder(null);
              loadReminders();
            }}
            onCancel={() => setEditingReminder(null)}
          />
        )}
      </Modal>
    </div>
  );
}
