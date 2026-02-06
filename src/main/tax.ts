import { query } from "./db";

export type TaxDocument = {
  id: number;
  year: number;
  description: string | null;
  document_path: string;
  file_name: string;
  storage_key: string | null;
  md5_hash: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createTaxDocument(data: {
  year: number;
  description: string | null;
  document_path: string;
  file_name: string;
  storage_key?: string;
  md5_hash?: string;
  profileId: number;
}): Promise<number> {
  const result = await query<any>(
    `INSERT INTO tax_documents (year, description, document_path, file_name, storage_key, md5_hash, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.year, data.description, data.document_path, data.file_name, data.storage_key || data.document_path, data.md5_hash || null, data.profileId]
  );
  return result.insertId;
}

export async function listTaxDocuments(profileId: number): Promise<TaxDocument[]> {
  return query<TaxDocument[]>(
    "SELECT * FROM tax_documents WHERE profile_id = ? ORDER BY year DESC, created_at DESC",
    [profileId]
  );
}

export async function listTaxDocumentsByYear(year: number, profileId: number): Promise<TaxDocument[]> {
  return query<TaxDocument[]>(
    "SELECT * FROM tax_documents WHERE year = ? AND profile_id = ? ORDER BY created_at DESC",
    [year, profileId]
  );
}

export async function getTaxDocument(id: number): Promise<TaxDocument | null> {
  const results = await query<TaxDocument[]>(
    "SELECT * FROM tax_documents WHERE id = ?",
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

export async function updateTaxDocument(
  id: number,
  data: { description?: string | null; year?: number }
): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }
  if (data.year !== undefined) {
    updates.push("year = ?");
    values.push(data.year);
  }

  if (updates.length > 0) {
    values.push(id);
    await query(
      `UPDATE tax_documents SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
  }
}

export async function deleteTaxDocument(id: number): Promise<void> {
  await query("DELETE FROM tax_documents WHERE id = ?", [id]);
}

// Get available tax years
export async function getTaxYears(profileId: number): Promise<number[]> {
  const results = await query<{ year: number }[]>(
    "SELECT DISTINCT year FROM tax_documents WHERE profile_id = ? ORDER BY year DESC",
    [profileId]
  );
  return results.map((r) => r.year);
}
