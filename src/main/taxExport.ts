import archiver from "archiver";
import { createWriteStream } from "fs";
import { dialog, BrowserWindow } from "electron";
import { listTaxDocumentsByYear } from "./tax";
import { query } from "./db";
import { FileStorage } from "./storage/FileStorage";
import { getTagsForTransaction, getTagsForTaxDocument } from "./tags";

type Transaction = {
  id: number;
  type: "deposit" | "withdrawal";
  amount: number;
  description: string | null;
  transaction_date: string;
  reference: string | null;
};

export async function exportTaxYear(
  year: number,
  profileId: number,
): Promise<{ success: boolean; path?: string; error?: string }> {
  // Ask user where to save
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    title: `Export Tax Data for ${year}`,
    defaultPath: `tax-export-${year}.zip`,
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: "cancelled" };
  }

  const savePath = result.filePath;

  // Gather data
  const [taxDocs, transactions] = await Promise.all([
    listTaxDocumentsByYear(year, profileId),
    query<Transaction[]>(
      `SELECT id, type, amount, description, transaction_date, reference
       FROM transactions
       WHERE profile_id = ? AND transaction_date >= ? AND transaction_date <= ?
       ORDER BY transaction_date ASC`,
      [profileId, `${year}-01-01`, `${year}-12-31`],
    ),
  ]);

  // Fetch tags for transactions and tax documents
  const transactionTags: Record<number, string[]> = {};
  for (const t of transactions) {
    const tags = await getTagsForTransaction(t.id);
    transactionTags[t.id] = tags.map((tag) => tag.name);
  }

  const taxDocTags: Record<number, string[]> = {};
  for (const doc of taxDocs) {
    const tags = await getTagsForTaxDocument(doc.id);
    taxDocTags[doc.id] = tags.map((tag) => tag.name);
  }

  // Create ZIP
  return new Promise((resolve) => {
    const output = createWriteStream(savePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      resolve({ success: true, path: savePath });
    });

    archive.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    archive.pipe(output);

    // Add transactions CSV
    const csvHeader =
      "Date,Type,Amount,Description,Reference,Tags\n";
    const csvRows = transactions.map((t) => {
      const tags = (transactionTags[t.id] || []).join("; ");
      return [
        t.transaction_date,
        t.type,
        t.amount,
        csvEscape(t.description || ""),
        csvEscape(t.reference || ""),
        csvEscape(tags),
      ].join(",");
    });
    archive.append(csvHeader + csvRows.join("\n"), {
      name: `tax-${year}/transactions.csv`,
    });

    // Add summary
    const totalDeposits = transactions
      .filter((t) => t.type === "deposit")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = transactions
      .filter((t) => t.type === "withdrawal")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const summary = [
      `Tax Export Summary - Year ${year}`,
      `Generated: ${new Date().toISOString().substring(0, 10)}`,
      ``,
      `--- Transactions ---`,
      `Total Transactions: ${transactions.length}`,
      `Total Deposits:     $${totalDeposits.toFixed(2)}`,
      `Total Withdrawals:  $${totalWithdrawals.toFixed(2)}`,
      `Net:                $${(totalDeposits - totalWithdrawals).toFixed(2)}`,
      ``,
      `--- Tax Documents ---`,
      `Total Documents: ${taxDocs.length}`,
      ...taxDocs.map(
        (doc) =>
          `  - ${doc.file_name}${doc.description ? ` (${doc.description})` : ""}${taxDocTags[doc.id]?.length ? ` [${taxDocTags[doc.id].join(", ")}]` : ""}`,
      ),
    ].join("\n");

    archive.append(summary, { name: `tax-${year}/summary.txt` });

    // Download and add each tax document file
    const addDocuments = async (): Promise<void> => {
      for (const doc of taxDocs) {
        const key = doc.storage_key || doc.document_path;
        if (!key) continue;
        try {
          const file = await FileStorage.getInstance().download(key);
          archive.append(Buffer.from(file.data), {
            name: `tax-${year}/documents/${doc.file_name}`,
          });
        } catch (err) {
          console.error(
            `Failed to download tax document ${doc.file_name}:`,
            err,
          );
        }
      }
      archive.finalize();
    };

    addDocuments();
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
