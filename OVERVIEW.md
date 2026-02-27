# Sloppy Financial

<p align="center">
  <img src="resources/icon.png" alt="Sloppy Financial" width="128" />
</p>

A self-hosted, offline-first personal finance and life management desktop app built with Electron. Manage bills, invoices, income, transactions, meal planning, reminders, and more — all from a single tabbed workspace. Supports SQLite for portable local use or MySQL for shared environments.

---

## Notes

A rich-text note editor with full formatting support including bold, italic, headers, bullet and numbered lists, blockquotes, code blocks, and links. Notes open in their own tabs for easy multitasking.

![Notes Editor](resources/sample-note.PNG)

Notes are organized in a searchable list view for quick access.

![Notes List](resources/sample-notelist.PNG)

---

## Bills

Track both manual and automatic recurring bills. Each bill displays its name, due date, amount, paid/unpaid status, and tags. Filter and sort by date, amount, status, or attached documents. Attach receipt documents directly to any bill record.

![Bills List](resources/bill.PNG)

Drill into individual bills to see full details including description, attached documents, tags, and owed-by/owed-to contact assignments. Mark bills as paid or replace attached documents at any time.

![Bill Details](resources/bill-individual.PNG)

---

## Contacts

Maintain a contact directory with name, email, phone, address, and notes. Contacts can be linked to bills, invoices, and payments throughout the app.

![Contacts](resources/contacts.PNG)

---

## Income & Payments

Track income and payment records with contact, category, description, amount, and attached documents. Filter by category and see running totals at a glance.

![Income & Payments](resources/sample-incomes.PNG)

View individual payment details with full metadata.

![Payment Details](resources/sample-income.PNG)

---

## Invoices

Create and manage invoices with contact assignment, issue and due dates, status tracking (Draft, Sent, Paid, Cancelled), and amounts. Summary cards show total invoiced, outstanding balance, and invoice count.

![Invoices](resources/sample-invoices.PNG)

---

## Reminders

Set one-time or recurring (cron-based) reminders with desktop notification support. Search, edit, and manage reminders from a single view. Test notifications directly from the built-in notification panel.

![Reminders](resources/sample-reminders.PNG)

---

## Tasks

A simple task list for tracking to-dos. Add, search, edit, and check off tasks. Completion progress is displayed at the top.

![Task List](resources/sample-tasks.PNG)

---

## Calendar

A full weekly and daily calendar view. Events are displayed with color coding and time ranges. Meal plan entries automatically sync to the calendar. Includes a live "now" indicator for the current time.

![Calendar](resources/sample-calender.PNG)

---

## Meal Planning

A complete meal planning system with five integrated sub-sections:

### Ingredients

Track ingredients with unit, price, calories per unit, and dietary tags. Price history and brand tracking are supported.

![Ingredients](resources/meal-planner.PNG)

### Recipes

Create recipes with meal type, servings, cost per serving, and total prep time. Link ingredients with quantities for automatic cost and nutrition calculations.

![Recipes](resources/recipes.PNG)

### Meal Plans

Plan meals across a date range. Assign recipes to specific days and meal slots. Sync meal plan entries directly to the calendar. Generate shopping lists from any meal plan.

![Meal Plans](resources/meal-plans.PNG)

### Budget & Analytics

View cost-per-serving breakdowns, budget vs. spending comparisons, and top ingredients by usage — all calculated automatically from your recipes and meal plans.

![Budget & Analytics](resources/meal-plan-costs.PNG)

---

## Transactions

Record and manage financial transactions with type (deposit/withdrawal), descriptions, amounts, tags, and bill linkage. Powerful filtering by type, tags, amount range, date, and year. Running totals for deposits, spending, and net balance are always visible.

![Transactions](resources/transactions.PNG)

### CSV Import

Import bank transactions from CSV files in a guided three-step process:

**Step 1 — Upload** your CSV file.

**Step 2 — Map Columns** from your CSV to transaction fields. Supports inverse deposit/withdrawal for credit card statements.

![CSV Column Mapping](resources/transaction-importing.PNG)

**Step 3 — Review & Import** all transactions before committing. Edit any field inline, apply tag rules, and reclassify entries as needed.

![Review & Import](resources/transaction-importing-part2.PNG)

### Tag Rules

Define reusable tag rules that automatically match transaction descriptions and assign tags. Rules can use substring matching and optionally replace descriptions for cleaner records.

![Tag Rules](resources/transaction-rules.PNG)

### Imported Transactions

After import, transactions appear in the main list fully tagged and ready for use.

![Imported Transactions](resources/imported-transactions.PNG)

---

## Tax Documents

Upload and organize tax documents by year. Each document can have a form type, tags, and is easily searchable. Filter by year to quickly find what you need at tax time.

![Tax Documents](resources/easy-tax-documents.PNG)

---

## Technical Details

- **Framework:** Electron + React + TypeScript
- **Database:** SQLite (portable, default) or MySQL (shared/remote)
- **Storage:** Local file system or MinIO (S3-compatible object storage)
- **Profiles:** Multi-profile workspaces for separating personal and business data
- **Notifications:** Native desktop notifications for reminders (Windows, macOS, Linux)
- **Tabs:** Multi-tab interface for working across features simultaneously
