import { query } from "./db";

export type Profile = {
  id: number;
  name: string;
  type: "personal" | "corporate";
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileWithStats = Profile & {
  note_count: number;
  bill_count: number;
  file_count: number;
  contact_count: number;
};

export async function listProfiles(): Promise<ProfileWithStats[]> {
  return query<ProfileWithStats[]>(`
    SELECT p.*,
      (SELECT COUNT(*) FROM notes WHERE profile_id = p.id) as note_count,
      (SELECT COUNT(*) FROM bill_records WHERE profile_id = p.id) as bill_count,
      (SELECT COUNT(*) FROM tax_documents WHERE profile_id = p.id) +
        (SELECT COUNT(*) FROM bill_records WHERE profile_id = p.id AND document_storage_key IS NOT NULL) as file_count,
      (SELECT COUNT(*) FROM contacts WHERE profile_id = p.id) as contact_count
    FROM profiles p
    ORDER BY p.last_used_at DESC, p.created_at DESC
  `);
}

export async function getProfile(id: number): Promise<ProfileWithStats | null> {
  const results = await query<ProfileWithStats[]>(`
    SELECT p.*,
      (SELECT COUNT(*) FROM notes WHERE profile_id = p.id) as note_count,
      (SELECT COUNT(*) FROM bill_records WHERE profile_id = p.id) as bill_count,
      (SELECT COUNT(*) FROM tax_documents WHERE profile_id = p.id) +
        (SELECT COUNT(*) FROM bill_records WHERE profile_id = p.id AND document_storage_key IS NOT NULL) as file_count,
      (SELECT COUNT(*) FROM contacts WHERE profile_id = p.id) as contact_count
    FROM profiles p
    WHERE p.id = ?
  `, [id]);
  return results.length > 0 ? results[0] : null;
}

export async function createProfile(data: {
  name: string;
  type: "personal" | "corporate";
}): Promise<number> {
  const result = await query<any>(
    "INSERT INTO profiles (name, type) VALUES (?, ?)",
    [data.name, data.type]
  );
  return result.insertId;
}

export async function updateProfile(
  id: number,
  data: { name?: string; type?: "personal" | "corporate" }
): Promise<void> {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.type !== undefined) {
    updates.push("type = ?");
    params.push(data.type);
  }

  if (updates.length === 0) return;

  params.push(id);
  await query(
    `UPDATE profiles SET ${updates.join(", ")} WHERE id = ?`,
    params
  );
}

export async function deleteProfile(id: number): Promise<void> {
  await query("DELETE FROM profiles WHERE id = ?", [id]);
}

export async function touchProfile(id: number): Promise<void> {
  await query("UPDATE profiles SET last_used_at = NOW() WHERE id = ?", [id]);
}
