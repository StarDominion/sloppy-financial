import { query } from "./db";

export type PaymentCategory =
  | "employment_income"
  | "freelance_income"
  | "investment_income"
  | "rental_income"
  | "pay_back"
  | "reimbursement"
  | "gift"
  | "refund"
  | "other";

export type Payment = {
  id: number;
  profile_id: number;
  contact_id: number;
  amount: number;
  category: PaymentCategory;
  description: string | null;
  payment_date: string;
  reference: string | null;
  document_path: string | null;
  document_storage_key: string | null;
  document_original_name: string | null;
  document_md5_hash: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
};

export async function listPayments(profileId: number): Promise<Payment[]> {
  return query<Payment[]>(
    `SELECT p.*, c.name AS contact_name
     FROM payments p
     LEFT JOIN contacts c ON c.id = p.contact_id
     WHERE p.profile_id = ?
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    [profileId],
  );
}

export async function getPayment(id: number): Promise<Payment | null> {
  const results = await query<Payment[]>(
    `SELECT p.*, c.name AS contact_name
     FROM payments p
     LEFT JOIN contacts c ON c.id = p.contact_id
     WHERE p.id = ?`,
    [id],
  );
  return results.length > 0 ? results[0] : null;
}

export async function createPayment(data: {
  profileId: number;
  contact_id: number;
  amount: number;
  category: PaymentCategory;
  description?: string | null;
  payment_date: string;
  reference?: string | null;
}): Promise<number> {
  const result = await query<any>(
    `INSERT INTO payments (profile_id, contact_id, amount, category, description, payment_date, reference)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.profileId,
      data.contact_id,
      data.amount,
      data.category,
      data.description || null,
      data.payment_date,
      data.reference || null,
    ],
  );
  return result.insertId;
}

export async function updatePayment(
  id: number,
  data: {
    contact_id?: number;
    amount?: number;
    category?: PaymentCategory;
    description?: string | null;
    payment_date?: string;
    reference?: string | null;
  },
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.contact_id !== undefined) {
    updates.push("contact_id = ?");
    values.push(data.contact_id);
  }
  if (data.amount !== undefined) {
    updates.push("amount = ?");
    values.push(data.amount);
  }
  if (data.category !== undefined) {
    updates.push("category = ?");
    values.push(data.category);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }
  if (data.payment_date !== undefined) {
    updates.push("payment_date = ?");
    values.push(data.payment_date);
  }
  if (data.reference !== undefined) {
    updates.push("reference = ?");
    values.push(data.reference);
  }

  if (updates.length > 0) {
    values.push(id);
    await query(
      `UPDATE payments SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
  }
}

export async function updatePaymentDocument(
  id: number,
  storageKey: string,
  originalName?: string,
  md5Hash?: string,
): Promise<void> {
  await query(
    `UPDATE payments SET document_path = ?, document_storage_key = ?, document_original_name = ?, document_md5_hash = ? WHERE id = ?`,
    [storageKey, storageKey, originalName || null, md5Hash || null, id],
  );
}

export async function deletePayment(id: number): Promise<void> {
  await query("DELETE FROM payments WHERE id = ?", [id]);
}
