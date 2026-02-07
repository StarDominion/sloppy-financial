import { Database } from "./database/Database";

export type Tag = {
  id: number;
  name: string;
  color: string;
  created_at: Date;
};

export async function listTags(profileId: number): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    "SELECT * FROM tags WHERE profile_id = ? ORDER BY name ASC",
    [profileId],
  );
}

export async function getTag(id: number): Promise<Tag | null> {
  const db = Database.getInstance();
  const rows = await db.query<Tag>(
    "SELECT * FROM tags WHERE id = ?",
    [id],
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createTag(data: {
  name: string;
  color?: string;
  profileId: number;
}): Promise<number> {
  const db = Database.getInstance();
  const result = await db.execute(
    "INSERT INTO tags (name, color, profile_id) VALUES (?, ?, ?)",
    [data.name, data.color || "#007acc", data.profileId],
  );
  return result.insertId;
}

export async function updateTag(
  id: number,
  data: { name?: string; color?: string },
): Promise<void> {
  const db = Database.getInstance();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.color !== undefined) {
    fields.push("color = ?");
    values.push(data.color);
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.execute(`UPDATE tags SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteTag(id: number): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM tags WHERE id = ?", [id]);
}

// Bill Record Tag Associations
export async function getTagsForBillRecord(
  billRecordId: number,
): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN bill_records_tags brt ON t.id = brt.tag_id
     WHERE brt.bill_record_id = ?
     ORDER BY t.name ASC`,
    [billRecordId],
  );
}

export async function addTagToBillRecord(
  billRecordId: number,
  tagId: number,
): Promise<void> {
  const db = Database.getInstance();
  const sql = db.dialect === "sqlite"
    ? "INSERT OR IGNORE INTO bill_records_tags (bill_record_id, tag_id) VALUES (?, ?)"
    : "INSERT IGNORE INTO bill_records_tags (bill_record_id, tag_id) VALUES (?, ?)";
  await db.execute(sql, [billRecordId, tagId]);
}

export async function removeTagFromBillRecord(
  billRecordId: number,
  tagId: number,
): Promise<void> {
  const db = Database.getInstance();
  await db.execute(
    "DELETE FROM bill_records_tags WHERE bill_record_id = ? AND tag_id = ?",
    [billRecordId, tagId],
  );
}

export async function setTagsForBillRecord(
  billRecordId: number,
  tagIds: number[],
): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM bill_records_tags WHERE bill_record_id = ?", [
    billRecordId,
  ]);
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT INTO bill_records_tags (bill_record_id, tag_id) VALUES (?, ?)",
      [billRecordId, tagId],
    );
  }
}

// Automatic Bill Tag Associations
export async function getTagsForAutomaticBill(
  automaticBillId: number,
): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN automatic_bills_tags abt ON t.id = abt.tag_id
     WHERE abt.automatic_bill_id = ?
     ORDER BY t.name ASC`,
    [automaticBillId],
  );
}

export async function addTagToAutomaticBill(
  automaticBillId: number,
  tagId: number,
): Promise<void> {
  const db = Database.getInstance();
  const sql = db.dialect === "sqlite"
    ? "INSERT OR IGNORE INTO automatic_bills_tags (automatic_bill_id, tag_id) VALUES (?, ?)"
    : "INSERT IGNORE INTO automatic_bills_tags (automatic_bill_id, tag_id) VALUES (?, ?)";
  await db.execute(sql, [automaticBillId, tagId]);
}

export async function removeTagFromAutomaticBill(
  automaticBillId: number,
  tagId: number,
): Promise<void> {
  const db = Database.getInstance();
  await db.execute(
    "DELETE FROM automatic_bills_tags WHERE automatic_bill_id = ? AND tag_id = ?",
    [automaticBillId, tagId],
  );
}

export async function setTagsForAutomaticBill(
  automaticBillId: number,
  tagIds: number[],
): Promise<void> {
  const db = Database.getInstance();
  await db.execute(
    "DELETE FROM automatic_bills_tags WHERE automatic_bill_id = ?",
    [automaticBillId],
  );
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT INTO automatic_bills_tags (automatic_bill_id, tag_id) VALUES (?, ?)",
      [automaticBillId, tagId],
    );
  }
}

// Tax Document Tag Associations
export async function getTagsForTaxDocument(
  taxDocumentId: number,
): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN tax_document_tags tdt ON t.id = tdt.tag_id
     WHERE tdt.tax_document_id = ?
     ORDER BY t.name ASC`,
    [taxDocumentId],
  );
}

export async function setTagsForTaxDocument(
  taxDocumentId: number,
  tagIds: number[],
): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM tax_document_tags WHERE tax_document_id = ?", [
    taxDocumentId,
  ]);
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT INTO tax_document_tags (tax_document_id, tag_id) VALUES (?, ?)",
      [taxDocumentId, tagId],
    );
  }
}

// Payment Tag Associations
export async function getTagsForPayment(paymentId: number): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN payment_tags pt ON t.id = pt.tag_id
     WHERE pt.payment_id = ?
     ORDER BY t.name ASC`,
    [paymentId],
  );
}

export async function setTagsForPayment(
  paymentId: number,
  tagIds: number[],
): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM payment_tags WHERE payment_id = ?", [
    paymentId,
  ]);
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT INTO payment_tags (payment_id, tag_id) VALUES (?, ?)",
      [paymentId, tagId],
    );
  }
}

// Invoice Tag Associations
export async function getTagsForInvoice(invoiceId: number): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN invoice_tags it ON t.id = it.tag_id
     WHERE it.invoice_id = ?
     ORDER BY t.name ASC`,
    [invoiceId],
  );
}

export async function setTagsForInvoice(
  invoiceId: number,
  tagIds: number[],
): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM invoice_tags WHERE invoice_id = ?", [
    invoiceId,
  ]);
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT INTO invoice_tags (invoice_id, tag_id) VALUES (?, ?)",
      [invoiceId, tagId],
    );
  }
}

// Transaction Tag Associations
export async function getTagsForTransaction(transactionId: number): Promise<Tag[]> {
  const db = Database.getInstance();
  return db.query<Tag>(
    `SELECT t.* FROM tags t
     INNER JOIN transaction_tags tt ON t.id = tt.tag_id
     WHERE tt.transaction_id = ?
     ORDER BY t.name ASC`,
    [transactionId],
  );
}

export async function setTagsForTransaction(
  transactionId: number,
  tagIds: number[],
): Promise<void> {
  const db = Database.getInstance();
  await db.execute("DELETE FROM transaction_tags WHERE transaction_id = ?", [
    transactionId,
  ]);
  for (const tagId of tagIds) {
    await db.execute(
      "INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
      [transactionId, tagId],
    );
  }
}
