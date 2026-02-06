# Sloppy Financial

An Electron-based personal finance management application for tracking bills, transactions, invoices, payments, and tax documents. Features AI-powered transaction categorization via Ollama and comprehensive analytics for spending insights.

**Note:** This is a personal finance tool, not a professional accounting suite. It's designed for individual use with your own MySQL database and MinIO storage.

## Features

### ✅ Implemented

- **Multi-Profile Support** - Create separate profiles for personal and corporate finances
- **Bills Management**
  - Manual bill tracking with due dates and amounts
  - Automatic bill generation on scheduled intervals (weekly/monthly/yearly)
  - Bill status tracking (paid/unpaid) with payment dates
  - Tag bills with custom categories
  - Attach documents to bills via MinIO storage
- **Transactions**
  - Import transactions from CSV files with AI-powered column mapping
  - Automatic transaction categorization using Ollama
  - Tag-based organization with custom colors
  - Duplicate detection (by date + amount)
  - Tag rules for automatic categorization
  - Transaction analytics with interactive charts (by tag, type, timeline, description)
  - Filter by type, tags, date range, and description
  - Inline tag editing directly from the list view
- **Income & Payments**
  - Track received payments by contact
  - Categorize payment types
  - Attach supporting documents
- **Invoices**
  - Create and track invoices
  - Multiple statuses (draft/sent/paid/overdue/cancelled)
  - Link invoices to contacts
  - Attach invoice documents
- **Contacts**
  - Maintain contact directory with email, phone, address
  - Track amounts owed by/to contacts
  - Link contacts to bills, invoices, and payments
- **Tax Documents**
  - Upload and organize tax documents by year
  - Tag documents for easy retrieval
  - Year-based filtering
- **Notes & Reminders**
  - Built-in note-taking
  - Scheduled reminders (once or recurring via cron)
  - Desktop notifications for reminders
- **Tags System**
  - Custom color-coded tags
  - Apply tags to transactions, bills, invoices, payments, and tax documents
  - Tag rules for automatic transaction categorization
- **Document Storage**
  - Upload and attach documents to records
  - Download documents on demand
  - MD5 hash verification
  - Stored in MinIO object storage

### 🚧 Feature Goals

- Full local storage solution with SQLite and local folders (alternative to MySQL/MinIO)
- Full encryption with USB key support
- MinIO document encryption
- Dynamic tax form system per country/state/province
- Enhanced AI agent integration for financial insights
- One-click tax-year document export/zip for accountants

## Prerequisites

Before running Sloppy Financial, you need to set up the following services:

### Required Services

1. **MySQL Server** (5.7+ or 8.0+)
   - Create a dedicated database for the application
   - User account with full permissions on the database
   - Default port: 3306

2. **MinIO Object Storage**
   - Used for storing documents (bills, invoices, tax documents, etc.)
   - Create a bucket for the application (e.g., `financial-docs`)
   - Generate access keys with read/write permissions
   - Default port: 9000

### Optional Services

3. **Ollama** (for AI features)
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

### Initial Configuration

On first launch, you'll need to configure the application:

1. **Launch the application** - It will open to the Settings screen if no configuration exists
2. **Configure MySQL:**
   ```json
   {
     "host": "localhost",
     "port": 3306,
     "user": "your_mysql_user",
     "password": "your_mysql_password",
     "database": "sloppy_financial"
   }
   ```
3. **Configure MinIO:**
   ```json
   {
     "endPoint": "localhost",
     "port": 9000,
     "useSSL": false,
     "accessKey": "your_minio_access_key",
     "secretKey": "your_minio_secret_key",
     "bucket": "financial-docs"
   }
   ```
4. **Configure Ollama (Optional):**
   ```json
   {
     "host": "http://localhost:11434",
     "model": "llama3.2"
   }
   ```
5. **Test connections** using the "Test Connection" buttons
6. **Save configuration**

### Manual Configuration

You can also manually create the `config.json` file:

```json
{
  "mysql": {
    "host": "localhost",
    "port": 3306,
    "user": "financial_user",
    "password": "your_secure_password",
    "database": "sloppy_financial"
  },
  "minio": {
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

### Database Schema

The application will not create the necessary tables on start, run the migration before starting.
```bash
npm run migrate
```

### Tables:

- `profiles` - Multi-profile support (personal/corporate)
- `transactions` - Financial transactions with type categorization
- `bills` - Bill tracking (manual and automatic)
- `automatic_bills` - Bill generation templates
- `bill_records` - Individual bill instances
- `invoices` - Invoice tracking
- `payments` - Income/payment tracking
- `contacts` - Contact directory
- `owed_amounts` - Track debts and amounts owed
- `tags` - Custom color-coded tags
- `tag_rules` - Automatic transaction categorization rules
- `tax_documents` - Tax document organization
- `notes` - Note-taking
- `reminders` - Scheduled reminders
- Junction tables for many-to-many relationships (transaction_tags, bill_tags, etc.)

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
- Read config from `<project-root>/config.json`

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

### Creating Your First Profile

1. Launch the app and configure services (see Configuration above)
2. Click **"Switch Profile"** from the File menu
3. Click **"Create New Profile"**
4. Enter a profile name and select type (Personal or Corporate)
5. Select the profile to start using it

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
4. Attach a document if needed
5. Mark as paid when completed

#### Automatic Bills
1. Go to **Bills → Automatic Bills**
2. Click **"New Auto Bill"**
3. Configure:
   - Name and amount
   - Frequency (weekly/monthly/yearly)
   - Due day (day of week or day of month)
   - Optional: Specific due dates, generation advance days
4. Bills are automatically generated based on schedule

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
3. File is uploaded to MinIO with MD5 hash verification
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
- Verify MySQL connection is active
- Check browser console for errors
- Ensure profile is selected

## Tech Stack

- **Framework:** Electron 28+ with Vite
- **Frontend:** React 18 with TypeScript
- **Backend:** Node.js with IPC communication
- **Database:** MySQL 5.7+/8.0+
- **Storage:** MinIO object storage
- **AI:** Ollama (optional, for transaction categorization)
- **Charts:** Recharts for analytics visualization

## License

This project is for personal use. Not intended for commercial distribution.
