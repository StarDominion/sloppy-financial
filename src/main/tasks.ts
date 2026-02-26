import { Database } from "./database/Database";

export type Task = {
  id: number;
  profile_id: number;
  title: string;
  description: string | null;
  completed: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listTasks(profileId: number): Promise<Task[]> {
  const db = Database.getInstance();
  return db.query<Task>(
    "SELECT * FROM tasks WHERE profile_id = ? ORDER BY completed ASC, sort_order ASC, created_at DESC",
    [profileId],
  );
}

export async function createTask(data: {
  title: string;
  description?: string | null;
  profileId: number;
}): Promise<number> {
  const db = Database.getInstance();
  const maxRows = await db.query<{ max_order: number | null }>(
    "SELECT MAX(sort_order) as max_order FROM tasks WHERE profile_id = ?",
    [data.profileId],
  );
  const nextOrder = (maxRows[0]?.max_order ?? -1) + 1;

  const result = await db.execute(
    "INSERT INTO tasks (profile_id, title, description, sort_order) VALUES (?, ?, ?, ?)",
    [data.profileId, data.title, data.description || null, nextOrder],
  );
  return result.insertId;
}

export async function updateTask(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    completed?: number;
    sort_order?: number;
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
  if (data.completed !== undefined) {
    fields.push("completed = ?");
    values.push(data.completed);
  }
  if (data.sort_order !== undefined) {
    fields.push("sort_order = ?");
    values.push(data.sort_order);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await db.execute(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteTask(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
}
