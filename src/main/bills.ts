import { query } from "./db";
import { Database } from "./database/Database";
import schedule from "node-schedule";
import { createReminder } from "./reminders";
import { getTagsForAutomaticBill, setTagsForBillRecord } from "./tags";
import { getTransaction, updateTransaction } from "./transactions";

export type AutomaticBill = {
  id: number;
  name: string;
  amount: number;
  description: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  due_day: number; // Deprecated, use due_dates
  due_dates: string | null; // Comma separated days
  generation_days: string | null; // Comma separated days (triggers bill creation)
  next_due_date: Date | null;
  created_at: Date;
};

export type BillRecord = {
  id: number;
  automatic_bill_id: number | null;
  name: string;
  amount: number;
  description: string | null;
  due_date: Date;
  status: "paid" | "unpaid";
  paid_date: Date | null;
  document_path: string | null;
  created_at: Date;
};

export async function listAutomaticBills(profileId: number): Promise<AutomaticBill[]> {
  return query<AutomaticBill[]>(
    "SELECT * FROM automatic_bills WHERE profile_id = ? ORDER BY created_at DESC",
    [profileId],
  );
}

export async function updateBillRecordDocument(
  id: number,
  storageKey: string,
  originalName?: string,
  md5Hash?: string,
): Promise<void> {
  await query(
    "UPDATE bill_records SET document_path = ?, document_storage_key = ?, document_original_name = ?, document_md5_hash = ? WHERE id = ?",
    [storageKey, storageKey, originalName || null, md5Hash || null, id],
  );
}

export async function checkMissingDocuments(): Promise<void> {
  // Find paid bills without documents from the last 30 days (to avoid spamming old ones repeatedly, but user said "bills lacking a file")
  // Let's just create reminders for any paid bill without a doc that DOESN'T already have an active reminder about it?
  // That's complex to track.
  // Simpler: Just get all paid bills without docs.
  // And for each, check if we created a reminder recently?
  // Or just let the user see them in the UI?
  // "create a reminder for bills lacking a file" -> implies the Reminders system.

  // Let's query paid bills without docs.
  const db = Database.getInstance();
  const dateExpr = db.dialect === "sqlite"
    ? "datetime('now', '-30 days')"
    : "DATE_SUB(NOW(), INTERVAL 30 DAY)";
  const records = await query<BillRecord[]>(`
        SELECT * FROM bill_records
        WHERE status = 'paid'
        AND (document_path IS NULL OR document_path = '')
        AND created_at > ${dateExpr}
    `);

  for (const r of records) {
    // Create a reminder if one doesn't exist for this specific bill record ?
    // We don't have a direct link in reminders table.
    // We can use the body or title to dedup effectively.
    const title = `Missing Document: ${r.name}`;
    const body = `Please upload the receipt/document for bill #${r.id} (${r.name} - $${r.amount})`;

    // Naive dedup: check if active reminder with this title exists
    const existing = await query<any[]>(
      "SELECT id FROM reminders WHERE title = ? AND is_active = 1",
      [title],
    );
    if (existing.length === 0) {
      await createReminder({
        title,
        body,
        scheduleType: "once",
        scheduledAt: null, // Immediate/Todo style
      });
    }
  }
}

export async function createAutomaticBill(
  data: Omit<AutomaticBill, "id" | "created_at" | "next_due_date"> & { profileId: number },
): Promise<number> {
  // Determine dates using generation_days if available, else due_dates/due_day
  const triggerDatesString = data.generation_days || data.due_dates;
  const dates = triggerDatesString
    ? triggerDatesString.split(",").map((d) => parseInt(d))
    : [data.due_day];

  // If we have generation days, we probably assume monthly frequency for the trigger calc
  // If frequency is 'weekly', generation_days doesn't make much sense unless it's day of week?
  // Let's assume generation_days implies monthly logic or we respect the frequency passed (which might be force-set to monthly by UI)
  const nextDueDate = calculateNextDueDate(data.frequency, dates);

  const result = await query<any>(
    "INSERT INTO automatic_bills (name, amount, description, frequency, due_day, due_dates, generation_days, next_due_date, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      data.name,
      data.amount,
      data.description || null,
      data.frequency,
      data.due_day ||
        (data.due_dates ? parseInt(data.due_dates.split(",")[0]) : 1),
      data.due_dates,
      data.generation_days,
      nextDueDate,
      data.profileId,
    ],
  );
  return result.insertId;
}

export async function updateAutomaticBill(
  id: number,
  data: Partial<AutomaticBill>,
): Promise<void> {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.amount !== undefined) {
    updates.push("amount = ?");
    params.push(data.amount);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.due_dates !== undefined) {
    updates.push("due_dates = ?");
    params.push(data.due_dates);
  }
  if (data.generation_days !== undefined) {
    updates.push("generation_days = ?");
    params.push(data.generation_days);
  }
  // Recalculate next due date if schedule changes?
  // For simplicity, let's assume if they edit schedule, we might want to update next_due_date
  // But that might skip a bill or duplicate if not careful.
  // Let's leave nect_due_date alone unless explicitly asked, or if the user wants to RESET it.

  if (updates.length > 0) {
    params.push(id);
    await query(
      `UPDATE automatic_bills SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
  }
}

export async function generateManualBillFromAuto(
  id: number,
  targetDate: Date,
): Promise<void> {
  const [bill] = await query<AutomaticBill[]>(
    "SELECT * FROM automatic_bills WHERE id = ?",
    [id],
  );
  if (!bill) throw new Error("Bill not found");

  const billRecordId = await createBillRecord({
    automatic_bill_id: bill.id,
    name: bill.name,
    amount: bill.amount,
    due_date: targetDate,
  });

  // Copy tags from automatic bill to the new bill record
  const tags = await getTagsForAutomaticBill(bill.id);
  if (tags.length > 0) {
    await setTagsForBillRecord(
      billRecordId,
      tags.map((t) => t.id),
    );
  }
}

export async function deleteAutomaticBill(id: number): Promise<void> {
  await query("DELETE FROM automatic_bills WHERE id = ?", [id]);
}

export async function listBillRecords(profileId: number): Promise<BillRecord[]> {
  return query<BillRecord[]>(
    "SELECT * FROM bill_records WHERE profile_id = ? ORDER BY due_date ASC",
    [profileId],
  );
}

export async function createBillRecord(data: {
  automatic_bill_id?: number;
  name: string;
  amount: number;
  description?: string | null;
  due_date: Date | string;
  status?: "paid" | "unpaid";
  profileId?: number;
}): Promise<number> {
  const result = await query<any>(
    "INSERT INTO bill_records (automatic_bill_id, name, amount, description, due_date, status, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      data.automatic_bill_id || null,
      data.name,
      data.amount,
      data.description || null,
      new Date(data.due_date),
      data.status || "unpaid",
      data.profileId || 1,
    ],
  );
  return result.insertId;
}

export async function updateBillRecord(
  id: number,
  data: {
    name?: string;
    amount?: number;
    description?: string | null;
    due_date?: Date | string;
    status?: "paid" | "unpaid";
  },
): Promise<void> {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.amount !== undefined) {
    updates.push("amount = ?");
    params.push(data.amount);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.due_date !== undefined) {
    updates.push("due_date = ?");
    params.push(new Date(data.due_date));
  }
  if (data.status !== undefined) {
    updates.push("status = ?");
    params.push(data.status);
  }

  if (updates.length > 0) {
    params.push(id);
    await query(
      `UPDATE bill_records SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
  }
}

export async function markBillPaid(id: number): Promise<void> {
  const db = Database.getInstance();
  const nowFn = db.dialect === "sqlite" ? "datetime('now')" : "NOW()";
  await query(
    `UPDATE bill_records SET status = 'paid', paid_date = ${nowFn} WHERE id = ?`,
    [id],
  );
}

export async function checkAndGenerateBills() {
  console.log("Checking for automatic bills...");
  // Query all automatic bills across all profiles for the scheduler
  const autoBills = await query<AutomaticBill[]>(
    "SELECT * FROM automatic_bills ORDER BY created_at DESC"
  );
  const now = new Date();

  for (const bill of autoBills) {
    if (!bill.next_due_date) continue;
    const dueDate = new Date(bill.next_due_date);

    // If due date is today or in past
    if (dueDate <= now) {
      console.log(`Generating bill for ${bill.name}`);

      // Calculate the specific Due Date for the Bill Record
      let recordDueDate = new Date(dueDate);
      if (bill.generation_days && bill.due_dates) {
        // If using separate generation days, find the next applicable due date relative to NOW (Trigger time)
        // We use 'monthly' logic for this separation usually
        const ddList = bill.due_dates
          .split(",")
          .map((d) => parseInt(d.trim()))
          .sort((a, b) => a - b);
        recordDueDate = calculateNextDueDate("monthly", ddList);
        // Note: calculateNextDueDate finds the NEXT one from "now".
        // If today is 25th (Gen), and Due is 1st. Next is Feb 1st. Correct.
        // If today is 25th (Gen), and Due is 30th. Next is Jan 30th. Correct.
      }

      // Create record
      const billRecordId = await createBillRecord({
        automatic_bill_id: bill.id,
        name: bill.name,
        amount: bill.amount,
        due_date: recordDueDate,
      });

      // Copy tags from automatic bill to the new bill record
      const tags = await getTagsForAutomaticBill(bill.id);
      if (tags.length > 0) {
        await setTagsForBillRecord(
          billRecordId,
          tags.map((t) => t.id),
        );
      }

      // Update next due date (The Trigger Date)
      const nextDate = new Date(dueDate);

      // Use generation_days if available for the NEXT Trigger, else due_dates
      const triggerSource = bill.generation_days || bill.due_dates;
      const datesList = triggerSource
        ? triggerSource
            .split(",")
            .map((d) => parseInt(d.trim()))
            .sort((a, b) => a - b)
        : [bill.due_day];

      if (bill.frequency === "monthly") {
        // Find next day in current month?
        const currentDay = nextDate.getDate();
        const nextDayInMonth = datesList.find((d) => d > currentDay);

        if (nextDayInMonth) {
          // Same month, later day
          nextDate.setDate(nextDayInMonth);
        } else {
          // Next month, first day in list
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(datesList[0]);
        }
      } else if (bill.frequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (bill.frequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      await query("UPDATE automatic_bills SET next_due_date = ? WHERE id = ?", [
        nextDate,
        bill.id,
      ]);
    }
  }
}

function calculateNextDueDate(frequency: string, dates: number[]): Date {
  const now = new Date();
  const target = new Date(now);

  // Sort dates
  dates.sort((a, b) => a - b);

  if (frequency === "monthly") {
    const currentDay = now.getDate();
    // If today is a due day, do we schedule for today? Yes if not past execution time?
    // But usually we want future. Let's assume user wants next occurrence.
    // If today is BEFORE or EQUAL to a date?
    // Let's say today is 5th. Dates: 1, 15.
    // Next is 15th.

    const nextDay = dates.find((d) => d >= currentDay); // Include today? Maybe > currentDay if we already ran?
    // Let's stick to >= for initial calculation.

    if (nextDay) {
      target.setDate(nextDay);
    } else {
      // Next month
      target.setMonth(target.getMonth() + 1);
      target.setDate(dates[0]);
    }
  } else {
    // Fallback for weekly/yearly (single date usually)
    // Just use first date
    if (frequency === "weekly") {
      // Logic for weekly needs day of week?
      // Not supported nicely yet, defaulting to logic above or +7
      target.setDate(now.getDate() + 7); // Placeholder
    } else {
      target.setFullYear(target.getFullYear() + 1);
      target.setDate(dates[0]);
    }
  }
  return target;
}

export async function matchTransactionToAutoBill(
  transactionId: number,
  automaticBillId: number,
  profileId: number,
): Promise<{ duplicate: boolean; billRecordId?: number; existingBillRecordId?: number }> {
  const transaction = await getTransaction(transactionId);
  if (!transaction) throw new Error("Transaction not found");

  const [bill] = await query<AutomaticBill[]>(
    "SELECT * FROM automatic_bills WHERE id = ?",
    [automaticBillId],
  );
  if (!bill) throw new Error("Automatic bill not found");

  const txDate = new Date(transaction.transaction_date);
  const txDay = txDate.getDate();
  const txMonth = txDate.getMonth();
  const txYear = txDate.getFullYear();

  // Determine the due date for the bill record
  let dueDate: Date;
  const dueDaysList = bill.due_dates
    ? bill.due_dates.split(",").map((d) => parseInt(d.trim())).sort((a, b) => a - b)
    : [bill.due_day];

  if (bill.generation_days && bill.due_dates) {
    // Both generation_days and due_dates exist - map transaction to the right billing cycle
    const genDays = bill.generation_days.split(",").map((d) => parseInt(d.trim())).sort((a, b) => a - b);

    // Find which generation cycle the transaction falls into
    // The transaction should be on or after a generation day
    let genIndex = -1;
    for (let i = genDays.length - 1; i >= 0; i--) {
      if (txDay >= genDays[i]) {
        genIndex = i;
        break;
      }
    }

    if (genIndex >= 0 && genIndex < dueDaysList.length) {
      // Use the corresponding due date
      dueDate = new Date(txYear, txMonth, dueDaysList[genIndex]);
      // If the due date is before the generation day, it belongs to the next month
      if (dueDaysList[genIndex] < genDays[genIndex]) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
    } else if (genIndex === -1) {
      // Transaction is before any generation day this month - belongs to previous cycle
      const lastDue = dueDaysList[dueDaysList.length - 1];
      dueDate = new Date(txYear, txMonth - 1, lastDue);
    } else {
      // More gen days than due days, use the last due date
      dueDate = new Date(txYear, txMonth, dueDaysList[dueDaysList.length - 1]);
    }
  } else {
    // Simple case: just use the closest due date in the transaction's month
    const closestDue = dueDaysList.reduce((closest, day) =>
      Math.abs(day - txDay) < Math.abs(closest - txDay) ? day : closest,
    );
    dueDate = new Date(txYear, txMonth, closestDue);
  }

  // Duplicate check: same automatic_bill_id, same month/year, same amount
  const monthStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
  const monthEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);

  const existing = await query<Array<{ id: number }>>(
    `SELECT id FROM bill_records
     WHERE automatic_bill_id = ?
     AND amount = ?
     AND due_date >= ?
     AND due_date <= ?`,
    [automaticBillId, bill.amount, monthStart, monthEnd],
  );

  if (existing.length > 0) {
    return { duplicate: true, existingBillRecordId: existing[0].id };
  }

  // Create bill record
  const billRecordId = await createBillRecord({
    automatic_bill_id: bill.id,
    name: bill.name,
    amount: bill.amount,
    due_date: dueDate,
    status: "paid",
    profileId,
  });

  // Copy tags from automatic bill to new bill record
  const tags = await getTagsForAutomaticBill(bill.id);
  if (tags.length > 0) {
    await setTagsForBillRecord(billRecordId, tags.map((t) => t.id));
  }

  // Link transaction to the bill record
  await updateTransaction(transactionId, { bill_record_id: billRecordId });

  // Mark as paid
  await markBillPaid(billRecordId);

  return { duplicate: false, billRecordId };
}

// Run initially and then every day at 9am
export function initBillScheduler() {
  checkAndGenerateBills().catch(console.error);
  checkMissingDocuments().catch(console.error);
  schedule.scheduleJob("0 9 * * *", () => {
    checkAndGenerateBills().catch(console.error);
    checkMissingDocuments().catch(console.error);
  });
}
