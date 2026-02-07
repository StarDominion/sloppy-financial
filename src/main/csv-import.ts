import { getWorkspaceConfig } from "./workspace";
import { createTransaction, TransactionType } from "./transactions";
import { listTags, createTag, setTagsForTransaction } from "./tags";

export interface CsvRow {
  [key: string]: string;
}

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
}

export interface ImportTransaction {
  _rowIndex: number;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  reference: string;
  suggestedTags?: string[];
}

/**
 * Parse CSV text into rows of key-value pairs
 */
export function parseCsv(csvText: string): { headers: string[]; rows: CsvRow[] } {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Build the default prompt for column mapping detection
 */
export function buildMappingPrompt(headers: string[], sampleRows: CsvRow[]): string {
  const targetColumns = [
    { name: "type", description: "Transaction type: deposit or withdrawal" },
    { name: "amount", description: "The monetary amount of the transaction (numeric)" },
    { name: "description", description: "Description or memo of the transaction" },
    { name: "transaction_date", description: "The date the transaction occurred" },
    { name: "reference", description: "A reference number, check number, or transaction ID" },
  ];

  const sampleData = sampleRows.slice(0, 3).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h) => {
      obj[h] = row[h] || "";
    });
    return obj;
  });

  return `You are a data mapping assistant. Given CSV column headers and sample data, map each CSV column to the most appropriate database column.

CSV Headers: ${JSON.stringify(headers)}

Sample data (first 3 rows):
${JSON.stringify(sampleData, null, 2)}

Target database columns:
${targetColumns.map((c) => `- "${c.name}": ${c.description}`).join("\n")}

Return ONLY a valid JSON array of mappings. Each mapping should be: {"csvColumn": "<csv header>", "dbColumn": "<target column name>"}
Only map columns that have a clear match. If a CSV column doesn't match any target column, use "dbColumn": "ignore".
Do not include any explanation, just the JSON array.`;
}

/**
 * Send an arbitrary prompt to Ollama and return the raw response text
 */
export async function runOllamaPrompt(prompt: string): Promise<string> {
  const wsConfig = getWorkspaceConfig();
  const host = wsConfig?.ollama?.host || "http://localhost:11434";
  const model = wsConfig?.ollama?.model || "llama3.2";

  console.log("[Ollama:runPrompt] Prompt:", prompt);

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.response || "";

  console.log("[Ollama:runPrompt] Response:", responseText);
  return responseText;
}

/**
 * Use Ollama to determine column mapping from CSV headers to transaction fields
 */
export async function detectColumnMapping(
  headers: string[],
  sampleRows: CsvRow[],
  customPrompt?: string,
): Promise<ColumnMapping[]> {
  const prompt = customPrompt || buildMappingPrompt(headers, sampleRows);

  try {
    const responseText = await runOllamaPrompt(prompt);

    // Extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const mappings = JSON.parse(jsonMatch[0]) as ColumnMapping[];
      return mappings.filter(
        (m) => m.csvColumn && m.dbColumn && headers.includes(m.csvColumn),
      );
    }

    // If the response is a JSON object with a key containing the array
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed)) return parsed;
      // Look for array in any key
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    } catch {
      // fall through
    }

    return getDefaultMapping(headers);
  } catch (error) {
    console.error("Ollama column mapping failed:", error);
    return getDefaultMapping(headers);
  }
}

/**
 * Build the default prompt for transaction classification
 */
export function buildClassifyPrompt(
  transactions: Array<{ _rowIndex: number; description: string; amount: number; type: string }>,
  existingTags: { id: number; name: string }[],
): string {
  const validTypes = ["deposit", "withdrawal"];
  const tagNames = existingTags.map((t) => t.name);

  const transactionDescriptions = transactions.map((t) => ({
    index: t._rowIndex,
    description: t.description,
    amount: t.amount,
    currentType: t.type,
  }));

  return `You are a financial transaction classifier. For each transaction below, determine:
1. The most appropriate transaction type from: ${validTypes.join(", ")}
2. Suggested tags/categories from existing tags: ${tagNames.length > 0 ? tagNames.join(", ") : "(no existing tags - suggest new ones)"}

Transactions to classify:
${JSON.stringify(transactionDescriptions, null, 2)}

Rules:
- Negative amounts or debits are typically "withdrawal"
- Positive amounts or credits are typically "deposit"
- Suggest 1-3 relevant tags per transaction

Return ONLY a valid JSON array where each item has: {"index": <number>, "type": "<transaction type>", "suggestedTags": ["tag1", "tag2"]}
No explanation, just the JSON array.`;
}

/**
 * Use Ollama to classify transaction type and suggest tags for a batch of transactions
 */
export async function classifyTransactions(
  transactions: ImportTransaction[],
  existingTags: { id: number; name: string }[],
  customPrompt?: string,
): Promise<
  Array<{
    _rowIndex: number;
    type: TransactionType;
    suggestedTags: string[];
  }>
> {
  const validTypes = ["deposit", "withdrawal"];

  // Process in batches of 20
  const batchSize = 20;
  const results: Array<{ _rowIndex: number; type: TransactionType; suggestedTags: string[] }> = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);

    const prompt = customPrompt || buildClassifyPrompt(
      batch.map((t) => ({ _rowIndex: t._rowIndex, description: t.description, amount: t.amount, type: t.type })),
      existingTags,
    );

    try {
      const responseText = await runOllamaPrompt(prompt);

      let parsed: any[] = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          const obj = JSON.parse(responseText);
          if (Array.isArray(obj)) parsed = obj;
          else {
            for (const key of Object.keys(obj)) {
              if (Array.isArray(obj[key])) { parsed = obj[key]; break; }
            }
          }
        }
      } catch {
        // fallback
      }

      batch.forEach((t) => {
        const match = parsed.find((p: any) => p.index === t._rowIndex);
        if (match) {
          const type = validTypes.includes(match.type) ? match.type : t.type;
          results.push({
            _rowIndex: t._rowIndex,
            type: type as TransactionType,
            suggestedTags: Array.isArray(match.suggestedTags) ? match.suggestedTags : [],
          });
        } else {
          results.push({ _rowIndex: t._rowIndex, type: t.type, suggestedTags: [] });
        }
      });
    } catch (error) {
      console.error("Ollama classification failed for batch:", error);
      batch.forEach((t) => {
        results.push({ _rowIndex: t._rowIndex, type: t.type, suggestedTags: [] });
      });
    }
  }

  return results;
}

/**
 * Commit a batch of transactions to the database
 */
export async function commitTransactions(
  profileId: number,
  transactions: ImportTransaction[],
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0;
  const errors: string[] = [];

  // Get existing tags for this profile
  const existingTags = await listTags(profileId);
  const tagMap = new Map<string, number>();
  for (const tag of existingTags) {
    tagMap.set(tag.name.toLowerCase(), tag.id);
  }

  for (const t of transactions) {
    try {
      const transactionId = await createTransaction({
        profileId,
        type: t.type,
        amount: t.amount,
        description: t.description || null,
        transaction_date: t.transaction_date,
        reference: t.reference || null,
      });

      // Handle tags if provided
      if (t.suggestedTags && t.suggestedTags.length > 0) {
        const tagIds: number[] = [];
        for (const tagName of t.suggestedTags) {
          const normalizedName = tagName.trim().toLowerCase();
          if (!normalizedName) continue;

          let tagId = tagMap.get(normalizedName);
          if (!tagId) {
            // Create the tag if it doesn't exist
            tagId = await createTag({
              name: tagName.trim(),
              profileId,
            });
            tagMap.set(normalizedName, tagId);
          }
          tagIds.push(tagId);
        }

        if (tagIds.length > 0) {
          await setTagsForTransaction(transactionId, tagIds);
        }
      }

      imported++;
    } catch (error) {
      errors.push(
        `Row ${t._rowIndex + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return { imported, errors };
}

/**
 * Apply column mapping to raw CSV rows to produce ImportTransaction objects
 */
export function applyMapping(
  rows: CsvRow[],
  mapping: ColumnMapping[],
): ImportTransaction[] {
  // Single-match for fields where combining doesn't make sense
  const getCol = (dbCol: string): string | null => {
    const m = mapping.find((mm) => mm.dbColumn === dbCol);
    return m ? m.csvColumn : null;
  };

  // Multi-match for text fields that support combining columns
  const getCols = (dbCol: string): string[] => {
    return mapping.filter((mm) => mm.dbColumn === dbCol).map((mm) => mm.csvColumn);
  };

  const typeCol = getCol("type");
  const amountCol = getCol("amount");
  const descCols = getCols("description");
  const dateCol = getCol("transaction_date");
  const refCols = getCols("reference");

  return rows.map((row, i) => {
    let amount = 0;
    if (amountCol) {
      const raw = row[amountCol].replace(/[$,]/g, "").trim();
      amount = parseFloat(raw) || 0;
    }

    let transactionDate = "";
    if (dateCol && row[dateCol]) {
      transactionDate = normalizeDate(row[dateCol]);
    }

    let type: TransactionType = "withdrawal";
    if (typeCol && row[typeCol]) {
      const rawType = row[typeCol].toLowerCase().trim();
      const validTypes: TransactionType[] = ["deposit", "withdrawal"];
      type = validTypes.includes(rawType as TransactionType)
        ? (rawType as TransactionType)
        : amount >= 0
          ? "deposit"
          : "withdrawal";
    } else {
      // Auto-detect based on sign: positive = deposit, negative = withdrawal
      type = amount >= 0 ? "deposit" : "withdrawal";
    }

    const description = descCols
      .map((col) => (row[col] || "").trim())
      .filter(Boolean)
      .join(" - ");

    const reference = refCols
      .map((col) => (row[col] || "").trim())
      .filter(Boolean)
      .join(" - ");

    return {
      _rowIndex: i,
      type,
      amount: Math.abs(amount),
      description,
      transaction_date: transactionDate,
      reference,
    };
  });
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  const str = dateStr.trim();

  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    let year = slashMatch[3];
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }

  // DD-MM-YYYY
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const month = dashMatch[2].padStart(2, "0");
    const day = dashMatch[1].padStart(2, "0");
    return `${dashMatch[3]}-${month}-${day}`;
  }

  // Try Date.parse as a fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().substring(0, 10);
  }

  return str;
}

/**
 * Fallback mapping when Ollama is unavailable
 */
function getDefaultMapping(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  const patterns: { dbColumn: string; keywords: string[] }[] = [
    { dbColumn: "amount", keywords: ["amount", "sum", "total", "value", "debit", "credit"] },
    { dbColumn: "description", keywords: ["description", "memo", "details", "narration", "particulars", "name"] },
    { dbColumn: "transaction_date", keywords: ["date", "trans date", "transaction date", "posting date", "value date"] },
    { dbColumn: "reference", keywords: ["reference", "ref", "check", "cheque", "transaction id", "id", "number"] },
    { dbColumn: "type", keywords: ["type", "category", "kind", "transaction type"] },
  ];

  for (const pattern of patterns) {
    for (let i = 0; i < lowerHeaders.length; i++) {
      if (pattern.keywords.some((kw) => lowerHeaders[i].includes(kw))) {
        if (!mappings.find((m) => m.dbColumn === pattern.dbColumn)) {
          mappings.push({ csvColumn: headers[i], dbColumn: pattern.dbColumn });
          break;
        }
      }
    }
  }

  // Mark unmapped columns
  for (const h of headers) {
    if (!mappings.find((m) => m.csvColumn === h)) {
      mappings.push({ csvColumn: h, dbColumn: "ignore" });
    }
  }

  return mappings;
}
