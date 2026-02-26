import { Database } from "./database/Database";

function toDbDatetime(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").slice(0, 19);
}

export type CalendarEvent = {
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

export async function listCalendarEvents(
  profileId: number,
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  const db = Database.getInstance();
  return db.query<CalendarEvent>(
    "SELECT * FROM calendar_events WHERE profile_id = ? AND start_time >= ? AND start_time < ? ORDER BY start_time ASC",
    [profileId, toDbDatetime(startDate), toDbDatetime(endDate)],
  );
}

export async function createCalendarEvent(data: {
  profileId: number;
  title: string;
  description?: string | null;
  startTime: string;
  durationMinutes: number;
  color?: string | null;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    "INSERT INTO calendar_events (profile_id, title, description, start_time, duration_minutes, color) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.profileId,
      data.title,
      data.description || null,
      toDbDatetime(data.startTime),
      data.durationMinutes,
      data.color || "#4a9eff",
    ],
  );
  return result.insertId;
}

export async function updateCalendarEvent(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    startTime?: string;
    durationMinutes?: number;
    color?: string | null;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    values.push(data.description);
  }
  if (data.startTime !== undefined) {
    fields.push("start_time = ?");
    values.push(toDbDatetime(data.startTime));
  }
  if (data.durationMinutes !== undefined) {
    fields.push("duration_minutes = ?");
    values.push(data.durationMinutes);
  }
  if (data.color !== undefined) {
    fields.push("color = ?");
    values.push(data.color);
  }

  if (fields.length === 0) return;

  const nowFn = db.dialect === "sqlite" ? "datetime('now')" : "NOW()";
  fields.push(`updated_at = ${nowFn}`);
  values.push(id);
  await db.execute(
    `UPDATE calendar_events SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM calendar_events WHERE id = ?", [id]);
}
