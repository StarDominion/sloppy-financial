import React, { useState, useEffect, useRef, useCallback } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

interface CalendarProps {
  profileId: number;
}

type CalendarEvent = {
  id: number;
  profile_id: number;
  title: string;
  description: string | null;
  start_time: string;
  duration_minutes: number;
  color: string | null;
  created_at: string;
  updated_at: string;
};

type Reminder = {
  id: number;
  title: string;
  body: string;
  schedule_type: "once" | "cron";
  scheduled_at: string | null;
  cron_expr: string | null;
  is_active: number;
};

type ViewMode = "week" | "day";

const HOUR_HEIGHT = 60;
const START_HOUR = 0;
const END_HOUR = 24;
const COLORS = [
  "#4a9eff",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function getDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toLocalISOString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a DB datetime value as local time (not UTC). MySQL returns Date objects, SQLite returns strings. */
function parseLocalDate(s: string | Date): Date {
  if (s instanceof Date) return s;
  return new Date(s.replace(" ", "T"));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Calendar({ profileId }: CalendarProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formDuration, setFormDuration] = useState(60);
  const [formColor, setFormColor] = useState(COLORS[0]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const rangeStart = viewMode === "week" ? getWeekStart(currentDate) : getDayStart(currentDate);
  const rangeEnd = viewMode === "week" ? getWeekEnd(currentDate) : getDayEnd(currentDate);

  const loadEvents = useCallback(async () => {
    const evts = await window.api.calendarEvents.list(
      profileId,
      toLocalISOString(rangeStart) + ":00",
      toLocalISOString(rangeEnd) + ":00",
    );
    setEvents(evts);
  }, [profileId, rangeStart.getTime(), rangeEnd.getTime()]);

  const loadReminders = useCallback(async () => {
    const rems = await window.api.reminders.list(profileId);
    setReminders(rems.filter((r) => r.schedule_type === "once" && r.scheduled_at && r.is_active));
  }, [profileId]);

  useEffect(() => {
    loadEvents();
    loadReminders();
    const unsub1 = onDataChange("calendar-events", loadEvents);
    const unsub2 = onDataChange("reminders", loadReminders);
    return () => {
      unsub1();
      unsub2();
    };
  }, [loadEvents, loadReminders]);

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === "week") {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setDate(d.getDate() + dir);
    }
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const openCreateModal = (date?: Date) => {
    setEditingEvent(null);
    setDetailEvent(null);
    const start = date || new Date();
    if (!date) {
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 1);
    }
    setFormTitle("");
    setFormDescription("");
    setFormStartTime(toLocalISOString(start));
    setFormDuration(60);
    setFormColor(COLORS[0]);
    setShowModal(true);
  };

  const openEditModal = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setDetailEvent(null);
    setFormTitle(evt.title);
    setFormDescription(evt.description || "");
    setFormStartTime(toLocalISOString(parseLocalDate(evt.start_time)));
    setFormDuration(evt.duration_minutes);
    setFormColor(evt.color || COLORS[0]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    // Send local time as "YYYY-MM-DD HH:mm:ss" so it's stored as-is (no UTC conversion)
    const startTime = formStartTime.replace("T", " ") + ":00";
    if (editingEvent) {
      await window.api.calendarEvents.update(editingEvent.id, {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        startTime,
        durationMinutes: formDuration,
        color: formColor,
      });
    } else {
      await window.api.calendarEvents.create({
        profileId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        startTime,
        durationMinutes: formDuration,
        color: formColor,
      });
    }
    emitDataChange("calendar-events");
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    await window.api.calendarEvents.delete(id);
    emitDataChange("calendar-events");
    setDetailEvent(null);
  };

  // Get days to display
  const days: Date[] = [];
  if (viewMode === "week") {
    const start = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
  } else {
    days.push(getDayStart(currentDate));
  }

  const hours: number[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);

  // Filter reminders for current range
  const visibleReminders = reminders.filter((r) => {
    if (!r.scheduled_at) return false;
    const rd = new Date(r.scheduled_at);
    return rd >= rangeStart && rd < rangeEnd;
  });

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseLocalDate(e.start_time), day));

  const getRemindersForDay = (day: Date) =>
    visibleReminders.filter((r) => r.scheduled_at && isSameDay(new Date(r.scheduled_at), day));

  const handleGridClick = (day: Date, hour: number) => {
    const clickDate = new Date(day);
    clickDate.setHours(hour, 0, 0, 0);
    openCreateModal(clickDate);
  };

  const today = new Date();

  // Header label
  const headerLabel =
    viewMode === "week"
      ? `${rangeStart.toLocaleDateString([], { month: "long", day: "numeric" })} - ${new Date(rangeEnd.getTime() - 1).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}`
      : currentDate.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="calendar-container">
      {/* Controls Bar */}
      <div className="calendar-controls">
        <div className="calendar-controls-left">
          <button className="cal-btn cal-btn-primary" onClick={() => openCreateModal()}>
            + New Event
          </button>
          <button className="cal-btn" onClick={goToday}>
            Today
          </button>
          <button className="cal-btn cal-nav-btn" onClick={() => navigate(-1)}>
            &lt;
          </button>
          <button className="cal-btn cal-nav-btn" onClick={() => navigate(1)}>
            &gt;
          </button>
          <span className="calendar-header-label">{headerLabel}</span>
        </div>
        <div className="calendar-controls-right">
          <button
            className={`cal-btn ${viewMode === "day" ? "cal-btn-active" : ""}`}
            onClick={() => setViewMode("day")}
          >
            Day
          </button>
          <button
            className={`cal-btn ${viewMode === "week" ? "cal-btn-active" : ""}`}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="calendar-day-headers" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div className="calendar-gutter-header" />
        {days.map((day, i) => (
          <div
            key={i}
            className={`calendar-day-header ${isSameDay(day, today) ? "calendar-day-today" : ""}`}
            onClick={() => {
              if (viewMode === "week") {
                setCurrentDate(day);
                setViewMode("day");
              }
            }}
            style={viewMode === "week" ? { cursor: "pointer" } : undefined}
          >
            <span className="calendar-day-name">{day.toLocaleDateString([], { weekday: "short" })}</span>
            <span className={`calendar-day-number ${isSameDay(day, today) ? "calendar-today-number" : ""}`}>
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="calendar-grid-scroll" ref={scrollRef}>
        <div className="calendar-grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="calendar-time-label" style={{ top: hour * HOUR_HEIGHT }}>
                {hour === 0 ? "" : `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? "AM" : "PM"}`}
              </div>
              {days.map((day, di) => (
                <div
                  key={`${hour}-${di}`}
                  className="calendar-cell"
                  style={{
                    gridColumn: di + 2,
                    gridRow: hour + 1,
                    height: HOUR_HEIGHT,
                  }}
                  onClick={() => handleGridClick(day, hour)}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Now indicator */}
          {days.some((d) => isSameDay(d, today)) && (() => {
            const now = new Date();
            const dayIdx = days.findIndex((d) => isSameDay(d, now));
            if (dayIdx === -1) return null;
            const topPx = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
            return (
              <div
                className="calendar-now-line"
                style={{
                  top: topPx,
                  gridColumn: dayIdx + 2,
                }}
              />
            );
          })()}

          {/* Events */}
          {days.map((day, di) =>
            getEventsForDay(day).map((evt) => {
              const start = parseLocalDate(evt.start_time);
              const topPx = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT;
              const heightPx = (evt.duration_minutes / 60) * HOUR_HEIGHT;
              const endTime = new Date(start.getTime() + evt.duration_minutes * 60000);
              return (
                <div
                  key={evt.id}
                  className="calendar-event"
                  style={{
                    top: topPx,
                    height: Math.max(heightPx, 20),
                    gridColumn: di + 2,
                    backgroundColor: evt.color || "#4a9eff",
                    borderLeft: `3px solid ${evt.color || "#4a9eff"}`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailEvent(evt);
                  }}
                >
                  <div className="calendar-event-title">{evt.title}</div>
                  <div className="calendar-event-time">
                    {formatTime(start)} - {formatTime(endTime)}
                  </div>
                </div>
              );
            }),
          )}

          {/* Reminders */}
          {days.map((day, di) =>
            getRemindersForDay(day).map((rem) => {
              if (!rem.scheduled_at) return null;
              const rd = new Date(rem.scheduled_at);
              const topPx = (rd.getHours() + rd.getMinutes() / 60) * HOUR_HEIGHT;
              return (
                <div
                  key={`rem-${rem.id}`}
                  className="calendar-reminder"
                  style={{
                    top: topPx,
                    gridColumn: di + 2,
                  }}
                  title={`Reminder: ${rem.title}\n${rem.body}`}
                >
                  <span className="calendar-reminder-icon">&#128276;</span>
                  <span className="calendar-reminder-title">{rem.title}</span>
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="calendar-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingEvent ? "Edit Event" : "New Event"}</h3>
            <div className="calendar-form-group">
              <label>Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Event title"
                autoFocus
              />
            </div>
            <div className="calendar-form-group">
              <label>Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="calendar-form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
              />
            </div>
            <div className="calendar-form-group">
              <label>Duration (minutes)</label>
              <select
                value={formDuration}
                onChange={(e) => setFormDuration(Number(e.target.value))}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>
            <div className="calendar-form-group">
              <label>Color</label>
              <div className="calendar-color-picker">
                {COLORS.map((c) => (
                  <div
                    key={c}
                    className={`calendar-color-swatch ${formColor === c ? "selected" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="calendar-modal-actions">
              <button className="cal-btn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="cal-btn cal-btn-primary" onClick={handleSave}>
                {editingEvent ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {detailEvent && (() => {
        const start = parseLocalDate(detailEvent.start_time);
        const endTime = new Date(start.getTime() + detailEvent.duration_minutes * 60000);
        const durationLabel =
          detailEvent.duration_minutes >= 60
            ? `${detailEvent.duration_minutes / 60}h`
            : `${detailEvent.duration_minutes}m`;
        return (
          <div className="calendar-modal-overlay" onClick={() => setDetailEvent(null)}>
            <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
              <div className="calendar-detail-header">
                <div
                  className="calendar-detail-color-dot"
                  style={{ backgroundColor: detailEvent.color || "#4a9eff" }}
                />
                <h3>{detailEvent.title}</h3>
              </div>
              <div className="calendar-detail-time">
                {start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div className="calendar-detail-time">
                {formatTime(start)} - {formatTime(endTime)} ({durationLabel})
              </div>
              {detailEvent.description && (
                <div className="calendar-detail-description">{detailEvent.description}</div>
              )}
              <div className="calendar-modal-actions">
                <button
                  className="cal-btn cal-btn-danger"
                  onClick={() => handleDelete(detailEvent.id)}
                >
                  Delete
                </button>
                <button className="cal-btn" onClick={() => setDetailEvent(null)}>
                  Close
                </button>
                <button
                  className="cal-btn cal-btn-primary"
                  onClick={() => openEditModal(detailEvent)}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
