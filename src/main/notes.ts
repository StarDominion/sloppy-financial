import { query } from "./db";

export type Note = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function listNotes(profileId: number): Promise<Note[]> {
  return await query<Note[]>("SELECT * FROM notes WHERE profile_id = ? ORDER BY updated_at DESC", [profileId]);
}

export async function saveNote(note: {
  id?: number;
  title: string;
  content: string;
  profileId: number;
}): Promise<Note> {
  if (note.id) {
    await query("UPDATE notes SET title = ?, content = ? WHERE id = ?", [
      note.title,
      note.content,
      note.id,
    ]);
    const [updated] = await query<Note[]>("SELECT * FROM notes WHERE id = ?", [
      note.id,
    ]);
    return updated;
  }

  const result = await query<{ insertId: number }>(
    "INSERT INTO notes (title, content, profile_id) VALUES (?, ?, ?)",
    [note.title, note.content, note.profileId],
  );
  const [created] = await query<Note[]>("SELECT * FROM notes WHERE id = ?", [
    result.insertId,
  ]);
  return created;
}

export async function deleteNote(id: number): Promise<void> {
  await query("DELETE FROM notes WHERE id = ?", [id]);
}
