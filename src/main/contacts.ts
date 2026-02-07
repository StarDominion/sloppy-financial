import { Database } from "./database/Database";

export type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: Date;
};

export async function listContacts(profileId: number): Promise<Contact[]> {
  const db = Database.getInstance();
  return db.query<Contact>(
    "SELECT * FROM contacts WHERE profile_id = ? ORDER BY name ASC",
    [profileId],
  );
}

export async function getContact(id: number): Promise<Contact | null> {
  const db = Database.getInstance();
  const rows = await db.query<Contact>(
    "SELECT * FROM contacts WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createContact(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  profileId: number;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    "INSERT INTO contacts (name, email, phone, address, notes, profile_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.name,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.notes || null,
      data.profileId,
    ],
  );
  return result.insertId;
}

export async function updateContact(
  id: number,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.email !== undefined) {
    fields.push("email = ?");
    values.push(data.email);
  }
  if (data.phone !== undefined) {
    fields.push("phone = ?");
    values.push(data.phone);
  }
  if (data.address !== undefined) {
    fields.push("address = ?");
    values.push(data.address);
  }
  if (data.notes !== undefined) {
    fields.push("notes = ?");
    values.push(data.notes);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(
    `UPDATE contacts SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteContact(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM contacts WHERE id = ?", [id]);
}
