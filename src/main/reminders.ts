import schedule from "node-schedule";
import { query } from "./db";
import { sendReminderNotification } from "./notifications";

type Reminder = {
  id: number;
  title: string;
  body: string;
  schedule_type: "once" | "cron";
  scheduled_at: string | null;
  cron_expr: string | null;
  is_active: number;
};

const jobs = new Map<number, schedule.Job>();

function scheduleReminder(reminder: Reminder): void {
  if (!reminder.is_active) return;

  if (jobs.has(reminder.id)) {
    jobs.get(reminder.id)?.cancel();
  }

  let job: schedule.Job | null = null;

  if (reminder.schedule_type === "once" && reminder.scheduled_at) {
    const runAt = new Date(reminder.scheduled_at);
    if (Number.isNaN(runAt.getTime()) || runAt.getTime() <= Date.now()) return;

    job = schedule.scheduleJob(runAt, async () => {
      sendReminderNotification(reminder.title, reminder.body);
      await query("UPDATE reminders SET is_active = 0 WHERE id = ?", [
        reminder.id,
      ]);
      jobs.get(reminder.id)?.cancel();
      jobs.delete(reminder.id);
    });
  }

  if (reminder.schedule_type === "cron" && reminder.cron_expr) {
    job = schedule.scheduleJob(reminder.cron_expr, () => {
      sendReminderNotification(reminder.title, reminder.body);
    });
  }

  if (job) jobs.set(reminder.id, job);
}

export async function loadAndScheduleReminders(): Promise<void> {
  const reminders = await query<Reminder[]>(
    "SELECT * FROM reminders WHERE is_active = 1 ORDER BY created_at DESC",
  );
  reminders.forEach(scheduleReminder);
}

export async function listReminders(profileId: number): Promise<Reminder[]> {
  return await query<Reminder[]>(
    "SELECT * FROM reminders WHERE profile_id = ? ORDER BY created_at DESC",
    [profileId],
  );
}

export async function createReminder(data: {
  title: string;
  body: string;
  scheduleType: "once" | "cron";
  scheduledAt?: string | null;
  cronExpr?: string | null;
  profileId?: number;
}): Promise<Reminder> {
  const result = await query<{ insertId: number }>(
    "INSERT INTO reminders (title, body, schedule_type, scheduled_at, cron_expr, profile_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.title,
      data.body,
      data.scheduleType,
      data.scheduledAt
        ? new Date(data.scheduledAt).toISOString().slice(0, 19).replace("T", " ")
        : null,
      data.cronExpr || null,
      data.profileId || 1,
    ],
  );
  const [created] = await query<Reminder[]>(
    "SELECT * FROM reminders WHERE id = ?",
    [result.insertId],
  );
  scheduleReminder(created);
  return created;
}

export async function updateReminder(
  id: number,
  data: {
    title?: string;
    body?: string;
    scheduleType?: "once" | "cron";
    scheduledAt?: string | null;
    cronExpr?: string | null;
  },
): Promise<Reminder> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.title !== undefined) {
    fields.push("title = ?");
    values.push(data.title);
  }
  if (data.body !== undefined) {
    fields.push("body = ?");
    values.push(data.body);
  }
  if (data.scheduleType !== undefined) {
    fields.push("schedule_type = ?");
    values.push(data.scheduleType);
  }
  if (data.scheduledAt !== undefined) {
    fields.push("scheduled_at = ?");
    values.push(
      data.scheduledAt
        ? new Date(data.scheduledAt).toISOString().slice(0, 19).replace("T", " ")
        : null,
    );
  }
  if (data.cronExpr !== undefined) {
    fields.push("cron_expr = ?");
    values.push(data.cronExpr || null);
  }

  if (fields.length === 0) {
    const [existing] = await query<Reminder[]>("SELECT * FROM reminders WHERE id = ?", [id]);
    return existing;
  }

  fields.push("is_active = 1");
  values.push(id);
  await query(`UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`, values);

  const [updated] = await query<Reminder[]>("SELECT * FROM reminders WHERE id = ?", [id]);

  // Reschedule
  jobs.get(id)?.cancel();
  jobs.delete(id);
  scheduleReminder(updated);

  return updated;
}

export async function deleteReminder(id: number): Promise<void> {
  jobs.get(id)?.cancel();
  jobs.delete(id);
  await query("DELETE FROM reminders WHERE id = ?", [id]);
}
