import { query } from "./db";
import { listTags, createTag, setTagsForTransaction, getTagsForTransaction } from "./tags";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "payment"
  | "refund"
  | "fee"
  | "interest"
  | "other";

export type Transaction = {
  id: number;
  profile_id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  transaction_date: string;
  reference: string | null;
  bill_record_id: number | null;
  document_path: string | null;
  document_storage_key: string | null;
  document_original_name: string | null;
  document_md5_hash: string | null;
  created_at: string;
  updated_at: string;
  bill_name?: string;
};

export async function listTransactions(profileId: number): Promise<Transaction[]> {
  return query<Transaction[]>(
    `SELECT t.*, br.name AS bill_name
     FROM transactions t
     LEFT JOIN bill_records br ON br.id = t.bill_record_id
     WHERE t.profile_id = ?
     ORDER BY t.transaction_date DESC, t.created_at DESC`,
    [profileId],
  );
}

export async function getTransaction(id: number): Promise<Transaction | null> {
  const results = await query<Transaction[]>(
    `SELECT t.*, br.name AS bill_name
     FROM transactions t
     LEFT JOIN bill_records br ON br.id = t.bill_record_id
     WHERE t.id = ?`,
    [id],
  );
  return results.length > 0 ? results[0] : null;
}

export async function createTransaction(data: {
  profileId: number;
  type: TransactionType;
  amount: number;
  description?: string | null;
  transaction_date: string;
  reference?: string | null;
  bill_record_id?: number | null;
}): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO transactions (profile_id, type, amount, description, transaction_date, reference, bill_record_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.profileId,
      data.type,
      data.amount,
      data.description || null,
      data.transaction_date,
      data.reference || null,
      data.bill_record_id || null,
    ],
  );
  return result.insertId;
}

export async function updateTransaction(
  id: number,
  data: {
    type?: TransactionType;
    amount?: number;
    description?: string | null;
    transaction_date?: string;
    reference?: string | null;
    bill_record_id?: number | null;
  },
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.type !== undefined) {
    updates.push("type = ?");
    values.push(data.type);
  }
  if (data.amount !== undefined) {
    updates.push("amount = ?");
    values.push(data.amount);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }
  if (data.transaction_date !== undefined) {
    updates.push("transaction_date = ?");
    values.push(data.transaction_date);
  }
  if (data.reference !== undefined) {
    updates.push("reference = ?");
    values.push(data.reference);
  }
  if (data.bill_record_id !== undefined) {
    updates.push("bill_record_id = ?");
    values.push(data.bill_record_id);
  }

  if (updates.length > 0) {
    values.push(id);
    await query(
      `UPDATE transactions SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
  }
}

export async function updateTransactionDocument(
  id: number,
  storageKey: string,
  originalName?: string,
  md5Hash?: string,
): Promise<void> {
  await query(
    `UPDATE transactions SET document_path = ?, document_storage_key = ?, document_original_name = ?, document_md5_hash = ? WHERE id = ?`,
    [storageKey, storageKey, originalName || null, md5Hash || null, id],
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  await query("DELETE FROM transactions WHERE id = ?", [id]);
}

export async function checkDuplicateTransactions(
  profileId: number,
  transactions: Array<{ transaction_date: string; amount: number }>,
): Promise<Set<string>> {
  if (transactions.length === 0) return new Set();

  // Build query to check for existing transactions with same date and amount
  const conditions = transactions
    .map(() => "(transaction_date = ? AND amount = ?)")
    .join(" OR ");

  const params: (string | number)[] = [profileId];
  for (const t of transactions) {
    params.push(t.transaction_date, t.amount);
  }

  const existing = await query<Array<{ transaction_date: any; amount: any }>>(
    `SELECT transaction_date, amount FROM transactions WHERE profile_id = ? AND (${conditions})`,
    params,
  );

  // Build a set of "date:amount" strings for quick lookup
  const duplicateKeys = new Set<string>();
  for (const t of existing) {
    // Normalize date to YYYY-MM-DD format (handles both Date objects and strings)
    const dateStr = t.transaction_date instanceof Date
      ? t.transaction_date.toISOString().substring(0, 10)
      : String(t.transaction_date).substring(0, 10);

    // Normalize amount to a number (DECIMAL fields may return as strings like "125.00")
    // Converting to number ensures "125.00" and 125 both become "125" when stringified
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;

    duplicateKeys.add(`${dateStr}:${amount}`);
  }

  return duplicateKeys;
}

export interface TagRule {
  substring: string;
  tag: string;
  replaceDescription: string;
}

export async function applyTagRulesToTransactions(
  profileId: number,
  rules: TagRule[],
): Promise<{ updated: number; errors: string[] }> {
  const activeRules = rules.filter((r) => r.substring.trim() && r.tag.trim());
  if (activeRules.length === 0) {
    return { updated: 0, errors: [] };
  }

  const transactions = await listTransactions(profileId);
  const existingTags = await listTags(profileId);
  const tagMap = new Map<string, number>();
  for (const tag of existingTags) {
    tagMap.set(tag.name.toLowerCase(), tag.id);
  }

  let updated = 0;
  const errors: string[] = [];

  for (const transaction of transactions) {
    try {
      let description = transaction.description || "";
      const currentTags = await getTagsForTransaction(transaction.id);
      const currentTagIds = new Set(currentTags.map((t) => t.id));
      let hasChanges = false;

      for (const rule of activeRules) {
        if (description.toLowerCase().includes(rule.substring.toLowerCase())) {
          // Get or create tag ID
          const normalizedName = rule.tag.trim().toLowerCase();
          let tagId = tagMap.get(normalizedName);
          if (!tagId) {
            tagId = await createTag({
              name: rule.tag.trim(),
              profileId,
            });
            tagMap.set(normalizedName, tagId);
          }

          // Add tag if not already present
          if (!currentTagIds.has(tagId)) {
            currentTagIds.add(tagId);
            hasChanges = true;
          }

          // Replace description if specified
          if (rule.replaceDescription.trim()) {
            description = rule.replaceDescription;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        // Update tags
        await setTagsForTransaction(transaction.id, Array.from(currentTagIds));

        // Update description if changed
        if (description !== (transaction.description || "")) {
          await updateTransaction(transaction.id, { description });
        }

        updated++;
      }
    } catch (error) {
      errors.push(
        `Transaction ${transaction.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return { updated, errors };
}

// ── Analytics Aggregation Functions ──────────────────────────────────

export type TransactionAggregationByTag = {
  tag_id: number | null;
  tag_name: string;
  tag_color: string;
  transaction_count: number;
  total_amount: number;
  deposit_amount: number;
  withdrawal_amount: number;
};

export async function aggregateTransactionsByTag(
  profileId: number,
  startDate?: string,
  endDate?: string,
): Promise<TransactionAggregationByTag[]> {
  let whereClause = "WHERE t.profile_id = ?";
  const params: any[] = [profileId];

  if (startDate) {
    whereClause += " AND t.transaction_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND t.transaction_date <= ?";
    params.push(endDate);
  }

  const sql = `
    SELECT
      COALESCE(tg.id, 0) as tag_id,
      COALESCE(tg.name, 'Untagged') as tag_name,
      COALESCE(tg.color, '#656d76') as tag_color,
      COUNT(t.id) as transaction_count,
      SUM(t.amount) as total_amount,
      SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END) as deposit_amount,
      SUM(CASE WHEN t.type IN ('withdrawal', 'payment', 'fee') THEN t.amount ELSE 0 END) as withdrawal_amount
    FROM transactions t
    LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    ${whereClause}
    GROUP BY tag_id, tag_name, tag_color
    ORDER BY total_amount DESC
  `;

  return query<TransactionAggregationByTag[]>(sql, params);
}

export type TransactionAggregationByType = {
  type: TransactionType;
  transaction_count: number;
  total_amount: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
};

export async function aggregateTransactionsByType(
  profileId: number,
  startDate?: string,
  endDate?: string,
): Promise<TransactionAggregationByType[]> {
  let whereClause = "WHERE profile_id = ?";
  const params: any[] = [profileId];

  if (startDate) {
    whereClause += " AND transaction_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND transaction_date <= ?";
    params.push(endDate);
  }

  const sql = `
    SELECT
      type,
      COUNT(*) as transaction_count,
      SUM(amount) as total_amount,
      AVG(amount) as avg_amount,
      MIN(amount) as min_amount,
      MAX(amount) as max_amount
    FROM transactions
    ${whereClause}
    GROUP BY type
    ORDER BY total_amount DESC
  `;

  return query<TransactionAggregationByType[]>(sql, params);
}

export type TransactionAggregationByPeriod = {
  period: string;
  transaction_count: number;
  total_amount: number;
  deposit_amount: number;
  withdrawal_amount: number;
  net_amount: number;
};

export async function aggregateTransactionsByPeriod(
  profileId: number,
  granularity: "day" | "week" | "month" | "year",
  startDate?: string,
  endDate?: string,
): Promise<TransactionAggregationByPeriod[]> {
  let dateFormat: string;

  switch (granularity) {
    case "day":
      dateFormat = "DATE_FORMAT(transaction_date, '%Y-%m-%d')";
      break;
    case "week":
      dateFormat = "DATE_FORMAT(transaction_date, '%Y-%u')";
      break;
    case "month":
      dateFormat = "DATE_FORMAT(transaction_date, '%Y-%m')";
      break;
    case "year":
      dateFormat = "DATE_FORMAT(transaction_date, '%Y')";
      break;
  }

  let whereClause = "WHERE profile_id = ?";
  const params: any[] = [profileId];

  if (startDate) {
    whereClause += " AND transaction_date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    whereClause += " AND transaction_date <= ?";
    params.push(endDate);
  }

  const sql = `
    SELECT
      ${dateFormat} as period,
      COUNT(*) as transaction_count,
      SUM(amount) as total_amount,
      SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposit_amount,
      SUM(CASE WHEN type IN ('withdrawal', 'payment', 'fee') THEN amount ELSE 0 END) as withdrawal_amount,
      SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END) as net_amount
    FROM transactions
    ${whereClause}
    GROUP BY period
    ORDER BY period ASC
  `;

  return query<TransactionAggregationByPeriod[]>(sql, params);
}

export type TransactionAggregationByDescription = {
  matched_substring: string;
  transaction_count: number;
  total_amount: number;
  earliest_date: string;
  latest_date: string;
};

export async function aggregateTransactionsByDescriptionFilter(
  profileId: number,
  descriptionSubstrings: string[],
  startDate?: string,
  endDate?: string,
): Promise<TransactionAggregationByDescription[]> {
  const results: TransactionAggregationByDescription[] = [];

  for (const substring of descriptionSubstrings) {
    let whereClause = "WHERE profile_id = ? AND description LIKE ?";
    const params: any[] = [profileId, `%${substring}%`];

    if (startDate) {
      whereClause += " AND transaction_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND transaction_date <= ?";
      params.push(endDate);
    }

    const sql = `
      SELECT
        ? as matched_substring,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        MIN(transaction_date) as earliest_date,
        MAX(transaction_date) as latest_date
      FROM transactions
      ${whereClause}
    `;

    const [result] = await query<TransactionAggregationByDescription[]>(sql, [
      substring,
      ...params,
    ]);

    if (result && result.transaction_count > 0) {
      results.push(result);
    }
  }

  return results.sort((a, b) => b.total_amount - a.total_amount);
}
