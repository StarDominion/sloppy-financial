# Sloppy Financial

See [QA.md](./QA.md) for questions and answers.

See [OVERVIEW.md](./OVERVIEW.md) for example app usage

An Electron-based personal finance and life management application. Track bills, transactions, invoices, payments, and tax documents. Plan meals, manage recipes, create shopping lists, and stay organized with tasks and a calendar. Features AI-powered transaction categorization via Ollama and comprehensive analytics for spending insights. 

Why is it called Sloppy Financial?
Well it's made with AI, so it's kind of AI-slop, but also peoples finances will be sloppy and this aims to improve that, so double meaning.

**Note:** This is a personal finance tool, not a professional accounting suite. It's designed for individual use with local SQLite storage or your own MySQL database and MinIO/local file storage.

**Disclaimer:** This software is provided as-is with no warranty of any kind. The author is not responsible for any data loss, corruption, financial discrepancy, or other damages resulting from the use of this application. You are solely responsible for maintaining backups of your data. Use at your own risk.

## Features

### Financial Management

- **Multi-Profile Support** - Create separate profiles for personal and corporate finances
- **Bills Management**
  - Manual bill tracking with due dates and amounts
  - Automatic bill generation on scheduled intervals (weekly/monthly/yearly)
  - Bill status tracking (paid/unpaid) with payment dates
  - Track who owes the bill and who it's paid to (linked to contacts)
  - Match bills to imported transactions
  - Tag bills with custom categories
  - Attach documents to bills
- **Transactions**
  - Import transactions from CSV files with AI-powered column mapping
  - Automatic transaction categorization using Ollama
  - Tag-based organization with custom colors
  - Duplicate detection (by date + amount)
  - Tag rules for automatic categorization (substring, full string, or regex matching)
  - Transaction analytics with interactive charts (by tag, type, timeline, description)
  - Filter by type, tags, date range, and description
  - Inline tag editing directly from the list view
- **Income & Payments**
  - Track received payments by contact
  - Categorize payment types (employment, freelance, investment, rental, refund, etc.)
  - Attach supporting documents
- **Invoices**
  - Create and track invoices linked to contacts
  - Multiple statuses (draft/sent/paid/overdue/cancelled)
  - Attach invoice documents
- **Contacts**
  - Maintain contact directory with email, phone, address
  - Track amounts owed by/to contacts
  - Link contacts to bills, invoices, and payments
- **Owed Amounts**
  - Track money owed between contacts and the user
  - Create owed amounts directly from bill records
  - Mark as paid/unpaid with paid dates
- **Tax Documents**
  - Upload and organize tax documents by year
  - Tag documents for easy retrieval
  - Year-based filtering

### Meal Planning

- **Ingredients**
  - Manage a library of ingredients with pricing and nutrition data (calories, protein, carbs, fat)
  - Track price history per ingredient (price, quantity, store, date)
  - Track brands per ingredient (brand name and URL)
  - Separate nutrition unit support for label-accurate tracking
- **Recipes**
  - Create recipes with meal type, servings, prep/cook time, and instructions
  - Link ingredients with quantities for automatic nutrition and cost calculations
  - View computed nutrition totals and per-serving breakdowns
  - View computed cost totals and cost per serving
- **Meal Plans**
  - Create named meal plans with start and end dates
  - Schedule recipes to specific dates and meal slots (breakfast, lunch, snack, dinner)
  - Track leftover servings from previous entries
  - View daily nutrition summaries
  - Sync meal plan entries to the calendar
- **Shopping Lists**
  - Create manual shopping lists or auto-generate from a meal plan
  - Auto-aggregates ingredients and scales by servings with estimated totals
  - Check off items as you shop
  - Link shopping lists to financial transactions for budget tracking
- **Meal Budgets & Analytics**
  - Set weekly or monthly food budget targets
  - Track spending from shopping list totals or linked transactions
  - View cost per serving across recipes, budget vs. spending comparisons, and most-used ingredients

### Organization & Productivity

- **Tasks**
  - Simple task list with title and optional description
  - Mark tasks as complete with a completion counter
  - Manual sort ordering
  - Search and filter tasks
- **Calendar**
  - Week view and day view
  - Create, edit, and delete events with title, description, start time, duration, and color
  - Click on time grid to create events at specific times
  - "Now" indicator line for current time
  - Reminders appear as pins on the calendar
  - Meal plan entries sync to calendar (breakfast 08:00, lunch 12:00, snack 15:00, dinner 18:00)
- **Notes**
  - Rich text editor powered by Lexical (headings, bold/italic/underline/strikethrough, lists, links, code blocks, horizontal rules)
  - Search and browse notes
  - Can be opened in a detached standalone window
- **Reminders**
  - Scheduled reminders (once or recurring via cron)
  - Native desktop notifications
  - Reminders display on the calendar

### Other Features

- **Tags System**
  - Custom color-coded tags
  - Apply tags to transactions, bills, invoices, payments, and tax documents
  - Tag rules for automatic transaction categorization (substring, full match, or regex)
  - Tag rules can also toggle transaction type or replace descriptions
- **Document Storage**
  - Upload and attach documents to records
  - Download documents on demand
  - MD5 hash verification
  - Stored via MinIO object storage or local filesystem
- **Workspace System**
  - Folder-based workspaces with per-workspace configuration
  - Recent workspaces list for quick access
  - Each workspace is a self-contained folder with config and data
- **Multi-Tab Interface**
  - Browser-like tabs for navigating between sections
  - Tabs persist across restarts
  - Right-click context menu on tabs
- **Multi-Window Support**
  - Detachable notes window
  - Detachable workspace window

### Feature Goals

- Full encryption with USB key support
- MinIO document encryption
- Dynamic tax form system per country/state/province
- Enhanced AI agent integration for financial insights
- One-click tax-year document export/zip for accountants
- Rework "automatic bills" into bill definitions, which when importing bank transactions you can associate definitions instead of auto generating

## Workspace & Storage

Sloppy Financial uses a **folder-based workspace** model. Each workspace is a folder on disk containing a `config.json` file. You can open or create workspaces from the welcome screen's recent workspaces list.

### Database Providers

| Provider | Description |
|----------|-------------|
| **SQLite** (default) | Stores a `data.db` file inside the workspace folder. No external services needed. |
| **MySQL** | Remote MySQL/MariaDB server. Requires host, port, user, password, and database in config. |

### File Storage Providers

| Provider | Description |
|----------|-------------|
| **Local** (default) | Files stored in a `files/` subdirectory of the workspace folder. |
| **MinIO** | S3-compatible object storage server. Requires endpoint, port, SSL, access/secret keys, and bucket. |

### Optional Services

**Ollama** (for AI features)
- Used for CSV import column mapping and transaction categorization
- Install and run Ollama locally
- Pull a model (recommended: `llama3.2` or `mistral`)
- Default endpoint: http://localhost:11434
- AI features will be disabled if Ollama is not configured

## Configuration

### Development vs Release Configuration

Sloppy Financial stores configuration in different locations depending on whether you're running in development or a production build:

#### Development Mode (`npm run dev`)
- **Config Location:** `<project-root>/config/profile.json`
- Configuration is read from a `profile.json` file in the project root directory
- Create this file manually or use the in-app Settings screen
- This file is gitignored and won't be committed

#### Production/Release Build
- **Windows:** `%APPDATA%\sloppy-financial\config.json`
  - Typically: `C:\Users\<YourUsername>\AppData\Roaming\sloppy-financial\config.json`
- **macOS:** `~/Library/Application Support/sloppy-financial/config.json`
- **Linux:** `~/.config/sloppy-financial/config.json`
- Configuration is automatically created when you use the Settings screen
- Data persists between application updates

### Workspace Configuration

Each workspace folder contains a `config.json` with the following structure:

```json
{
  "database": {
    "provider": "sqlite"
  },
  "fileStorage": {
    "provider": "local"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "model": "llama3.2"
  }
}
```

For MySQL + MinIO configuration:

```json
{
  "database": {
    "provider": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "financial_user",
    "password": "your_secure_password",
    "database": "sloppy_financial"
  },
  "fileStorage": {
    "provider": "minio",
    "endPoint": "localhost",
    "port": 9000,
    "useSSL": false,
    "accessKey": "minioadmin",
    "secretKey": "minioadmin",
    "bucket": "financial-docs"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "model": "llama3.2"
  }
}
```

### Database Migrations

For MySQL workspaces, run migrations before first use:
```bash
npm run migrate
```

SQLite workspaces run migrations automatically on open.

### Database Tables

- `profiles` - Multi-profile support (personal/corporate)
- `transactions` - Financial transactions with type categorization
- `bills` / `automatic_bills` / `bill_records` - Bill tracking (templates and instances)
- `invoices` - Invoice tracking
- `payments` - Income/payment tracking
- `contacts` - Contact directory
- `owed_amounts` - Track debts and amounts owed
- `tags` - Custom color-coded tags
- `tag_rules` - Automatic transaction categorization rules
- `tax_documents` - Tax document organization
- `notes` - Rich text notes
- `reminders` - Scheduled reminders
- `tasks` - Task list items
- `calendar_events` - Calendar events
- `ingredients` - Food ingredients with nutrition and pricing
- `ingredient_price_history` - Price history per ingredient
- `ingredient_brands` - Brand names and URLs per ingredient
- `recipes` / `recipe_ingredients` - Recipe definitions and linked ingredients
- `meal_plans` / `meal_plan_entries` - Meal plans and scheduled entries
- `shopping_lists` / `shopping_list_items` - Shopping lists and items
- `meal_budgets` - Weekly/monthly food budget targets
- Junction tables for many-to-many relationships (`transaction_tags`, `bill_records_tags`, etc.)

## Installation & Development

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This will:
- Start the Electron app with hot-reload
- Open DevTools automatically
- Read config from `<project-root>/config/profile.json`

### Building for Production

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

Built applications will be in the `dist/` folder.

## Usage Guide

### Getting Started

1. Launch the app - you'll see the workspace selector
2. Create a new workspace (picks a folder on disk) or open an existing one
3. Configure storage providers in the workspace settings (defaults to SQLite + local files)
4. Create a profile (Personal or Corporate) and select it

### Importing Transactions from CSV

1. Go to **Transactions → Import CSV**
2. **Upload CSV file** with your bank transactions
3. **AI Column Mapping**: Ollama will automatically detect columns
   - Confirm or adjust the mappings
   - Required mappings: Date, Amount, Description, Type
4. **AI Classification**: Ollama will suggest tags based on descriptions
   - Review and adjust suggested tags
   - Create new tags as needed
5. **Set Tag Rules**: Create automatic categorization rules
   - Example: "AMAZON" → "Shopping" tag
   - These rules persist and apply to future imports
6. **Review & Import**: Check for duplicates and import

### Using Transaction Analytics

Navigate to **Transactions → Analytics** to visualize your spending:

- **By Tag**: See spending breakdown by category (pie chart or bar chart)
- **By Type**: Compare deposits, withdrawals, payments, fees (bar chart)
- **Timeline**: View spending trends over time (area chart or bar chart)
  - Choose granularity: Daily, Weekly, Monthly, or Yearly
- **By Description**: Analyze spending by keywords (bar chart)
  - Add multiple keywords to track specific merchants or categories

All views support date range filtering and update in real-time as you add transactions.

### Managing Bills

#### Manual Bills
1. Go to **Bills → Bills**
2. Click **"New Bill Record"**
3. Fill in name, amount, due date, and optional description
4. Optionally set who owes the bill and who it's paid to
5. Attach a document if needed
6. Mark as paid when completed

#### Automatic Bills
1. Go to **Bills → Automatic Bills**
2. Click **"New Auto Bill"**
3. Configure:
   - Name and amount
   - Frequency (weekly/monthly/yearly)
   - Due day (day of week or day of month)
   - Optional: Specific due dates, generation advance days
4. Bills are automatically generated based on schedule

### Meal Planning Workflow

1. **Add Ingredients** - Build your ingredient library with prices and nutrition data
2. **Create Recipes** - Combine ingredients into recipes, see computed nutrition and cost
3. **Build a Meal Plan** - Schedule recipes across dates and meal slots
4. **Generate Shopping List** - Auto-generate from a meal plan with aggregated quantities and estimated cost
5. **Set a Budget** - Create weekly or monthly meal budgets and track spending
6. **Sync to Calendar** - Push meal plan entries to the calendar view

### Tags & Organization

Create custom tags to organize transactions, bills, invoices, and more:

1. Create tags from any tag selector interface
2. Assign custom colors for visual organization
3. Apply multiple tags to any record
4. Filter lists by tags
5. Use tag rules for automatic transaction categorization

### Document Management

Attach documents to transactions, bills, invoices, and payments:

1. Click the **Upload** button on any detail screen
2. Select a file (PDF, images, documents)
3. File is uploaded to your configured storage (local or MinIO) with MD5 hash verification
4. Download anytime from the detail view

## Troubleshooting

### Connection Issues

**MySQL Connection Failed:**
- Verify MySQL service is running
- Check host, port, username, and password
- Ensure database exists and user has permissions
- Test with: `mysql -h localhost -u user -p database`

**MinIO Connection Failed:**
- Verify MinIO service is running
- Check endpoint, port, access keys
- Ensure bucket exists
- Verify useSSL setting matches your MinIO configuration
- Test with MinIO client or web UI at http://localhost:9000

**Ollama Not Responding:**
- Verify Ollama is installed and running
- Check if model is pulled: `ollama list`
- Pull a model if needed: `ollama pull llama3.2`
- Verify endpoint in config (usually http://localhost:11434)
- AI features will gracefully disable if Ollama is unavailable

### Data Issues

**Transactions Not Importing:**
- Check CSV format (must have headers)
- Verify column mappings are correct
- Ensure date format is recognized
- Check for duplicate transactions (by date + amount)

**Tags Not Saving:**
- Verify database connection is active
- Check browser console for errors
- Ensure profile is selected

## Tech Stack

- **Framework:** Electron 39 with electron-vite 5
- **Frontend:** React 19 with TypeScript 5.9
- **Rich Text Editor:** Lexical 0.40
- **Backend:** Node.js with IPC communication
- **Database:** SQLite (via better-sqlite3) or MySQL 5.7+/8.0+ (via mysql2)
- **File Storage:** Local filesystem or MinIO object storage
- **AI:** Ollama (optional, for transaction categorization)
- **Charts:** Recharts 3 for analytics visualization
- **Scheduling:** node-schedule for reminder notifications and bill generation

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
