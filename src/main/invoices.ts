import { query } from "./db";
import { Database } from "./database/Database";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type Invoice = {
  id: number;
  profile_id: number;
  contact_id: number | null;
  invoice_number: string | null;
  amount: number;
  description: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  document_path: string | null;
  document_storage_key: string | null;
  document_original_name: string | null;
  document_md5_hash: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
};

export async function listInvoices(profileId: number): Promise<Invoice[]> {
  return query<Invoice[]>(
    `SELECT i.*, c.name AS contact_name
     FROM invoices i
     LEFT JOIN contacts c ON c.id = i.contact_id
     WHERE i.profile_id = ?
     ORDER BY i.issue_date DESC, i.created_at DESC`,
    [profileId],
  );
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const results = await query<Invoice[]>(
    `SELECT i.*, c.name AS contact_name
     FROM invoices i
     LEFT JOIN contacts c ON c.id = i.contact_id
     WHERE i.id = ?`,
    [id],
  );
  return results.length > 0 ? results[0] : null;
}

export async function createInvoice(data: {
  profileId: number;
  contact_id?: number | null;
  invoice_number?: string | null;
  amount: number;
  description?: string | null;
  status?: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
}): Promise<number> {
  const result = await query<any>(
    `INSERT INTO invoices (profile_id, contact_id, invoice_number, amount, description, status, issue_date, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.profileId,
      data.contact_id || null,
      data.invoice_number || null,
      data.amount,
      data.description || null,
      data.status || "draft",
      data.issue_date,
      data.due_date || null,
    ],
  );
  return result.insertId;
}

export async function updateInvoice(
  id: number,
  data: {
    contact_id?: number | null;
    invoice_number?: string | null;
    amount?: number;
    description?: string | null;
    status?: InvoiceStatus;
    issue_date?: string;
    due_date?: string | null;
    paid_date?: string | null;
  },
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.contact_id !== undefined) {
    updates.push("contact_id = ?");
    values.push(data.contact_id);
  }
  if (data.invoice_number !== undefined) {
    updates.push("invoice_number = ?");
    values.push(data.invoice_number);
  }
  if (data.amount !== undefined) {
    updates.push("amount = ?");
    values.push(data.amount);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }
  if (data.status !== undefined) {
    updates.push("status = ?");
    values.push(data.status);
  }
  if (data.issue_date !== undefined) {
    updates.push("issue_date = ?");
    values.push(data.issue_date);
  }
  if (data.due_date !== undefined) {
    updates.push("due_date = ?");
    values.push(data.due_date);
  }
  if (data.paid_date !== undefined) {
    updates.push("paid_date = ?");
    values.push(data.paid_date);
  }

  if (updates.length > 0) {
    values.push(id);
    await query(
      `UPDATE invoices SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
  }
}

export async function updateInvoiceDocument(
  id: number,
  storageKey: string,
  originalName?: string,
  md5Hash?: string,
): Promise<void> {
  await query(
    `UPDATE invoices SET document_path = ?, document_storage_key = ?, document_original_name = ?, document_md5_hash = ? WHERE id = ?`,
    [storageKey, storageKey, originalName || null, md5Hash || null, id],
  );
}

export async function markInvoicePaid(id: number): Promise<void> {
  const db = Database.getInstance();
  const dateFn = db.dialect === "sqlite" ? "date('now')" : "CURDATE()";
  await query(
    `UPDATE invoices SET status = 'paid', paid_date = ${dateFn} WHERE id = ?`,
    [id],
  );
}

export async function deleteInvoice(id: number): Promise<void> {
  await query("DELETE FROM invoices WHERE id = ?", [id]);
}
