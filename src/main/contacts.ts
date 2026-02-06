import { getPool } from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

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
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM contacts WHERE profile_id = ? ORDER BY name ASC",
    [profileId],
  );
  return rows as Contact[];
}

export async function getContact(id: number): Promise<Contact | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM contacts WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? (rows[0] as Contact) : null;
}

export async function createContact(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  profileId: number;
}): Promise<number> {
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(
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
  const pool = getPool();
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
  await pool.query(
    `UPDATE contacts SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function deleteContact(id: number): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM contacts WHERE id = ?", [id]);
}
