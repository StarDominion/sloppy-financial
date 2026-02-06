import { getPool } from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export type OwedAmount = {
  id: number;
  contact_id: number;
  bill_record_id: number | null;
  amount: number;
  reason: string | null;
  is_paid: boolean;
  paid_date: Date | null;
  created_at: Date;
  // Joined fields
  contact_name?: string;
  bill_name?: string;
};

export async function listOwedAmounts(profileId: number): Promise<OwedAmount[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT oa.*, c.name as contact_name, br.name as bill_name
    FROM owed_amounts oa
    LEFT JOIN contacts c ON oa.contact_id = c.id
    LEFT JOIN bill_records br ON oa.bill_record_id = br.id
    WHERE oa.profile_id = ?
    ORDER BY oa.created_at DESC
  `, [profileId]);
  return rows as OwedAmount[];
}

export async function getOwedAmountsForContact(
  contactId: number,
): Promise<OwedAmount[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT oa.*, c.name as contact_name, br.name as bill_name
    FROM owed_amounts oa
    LEFT JOIN contacts c ON oa.contact_id = c.id
    LEFT JOIN bill_records br ON oa.bill_record_id = br.id
    WHERE oa.contact_id = ?
    ORDER BY oa.is_paid ASC, oa.created_at DESC
  `,
    [contactId],
  );
  return rows as OwedAmount[];
}

export async function getOwedAmount(id: number): Promise<OwedAmount | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT oa.*, c.name as contact_name, br.name as bill_name
    FROM owed_amounts oa
    LEFT JOIN contacts c ON oa.contact_id = c.id
    LEFT JOIN bill_records br ON oa.bill_record_id = br.id
    WHERE oa.id = ?
  `,
    [id],
  );
  return rows.length > 0 ? (rows[0] as OwedAmount) : null;
}

export async function createOwedAmount(data: {
  contact_id: number;
  bill_record_id?: number | null;
  amount: number;
  reason?: string | null;
  profileId: number;
}): Promise<number> {
  const pool = getPool();
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO owed_amounts (contact_id, bill_record_id, amount, reason, profile_id) VALUES (?, ?, ?, ?, ?)",
    [
      data.contact_id,
      data.bill_record_id || null,
      data.amount,
      data.reason || null,
      data.profileId,
    ],
  );
  return result.insertId;
}

export async function updateOwedAmount(
  id: number,
  data: {
    amount?: number;
    reason?: string | null;
    bill_record_id?: number | null;
  },
): Promise<void> {
  const pool = getPool();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.amount !== undefined) {
    fields.push("amount = ?");
    values.push(data.amount);
  }
  if (data.reason !== undefined) {
    fields.push("reason = ?");
    values.push(data.reason);
  }
  if (data.bill_record_id !== undefined) {
    fields.push("bill_record_id = ?");
    values.push(data.bill_record_id);
  }

  if (fields.length === 0) return;

  values.push(id);
  await pool.query(
    `UPDATE owed_amounts SET ${fields.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function markOwedAmountPaid(id: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    "UPDATE owed_amounts SET is_paid = TRUE, paid_date = NOW() WHERE id = ?",
    [id],
  );
}

export async function markOwedAmountUnpaid(id: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    "UPDATE owed_amounts SET is_paid = FALSE, paid_date = NULL WHERE id = ?",
    [id],
  );
}

export async function deleteOwedAmount(id: number): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM owed_amounts WHERE id = ?", [id]);
}

// Bill record owed by functions
export async function setBillOwedBy(
  billRecordId: number,
  contactId: number | null,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "UPDATE bill_records SET owed_by_contact_id = ? WHERE id = ?",
    [contactId, billRecordId],
  );
}

export async function getBillOwedBy(
  billRecordId: number,
): Promise<{ contact_id: number; contact_name: string } | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT c.id as contact_id, c.name as contact_name
    FROM bill_records br
    JOIN contacts c ON br.owed_by_contact_id = c.id
    WHERE br.id = ?
  `,
    [billRecordId],
  );
  return rows.length > 0
    ? (rows[0] as { contact_id: number; contact_name: string })
    : null;
}

// Create owed amount from bill
export async function createOwedAmountFromBill(
  billRecordId: number,
  contactId: number,
  profileId: number,
): Promise<number> {
  const pool = getPool();

  // Get bill details
  const [billRows] = await pool.query<RowDataPacket[]>(
    "SELECT name, amount FROM bill_records WHERE id = ?",
    [billRecordId],
  );

  if (billRows.length === 0) {
    throw new Error("Bill record not found");
  }

  const bill = billRows[0];

  // Create owed amount
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO owed_amounts (contact_id, bill_record_id, amount, reason, profile_id) VALUES (?, ?, ?, ?, ?)",
    [contactId, billRecordId, bill.amount, `Bill: ${bill.name}`, profileId],
  );

  // Also set the owed_by on the bill
  await setBillOwedBy(billRecordId, contactId);

  return result.insertId;
}
