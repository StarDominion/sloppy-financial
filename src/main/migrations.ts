import { promises as fs } from "fs";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { Database } from "./database/Database";

type MigrationRow = {
  id: number;
  name: string;
  run_at: string;
};

// ── Helpers ──────────────────────────────────────────────────

function getMySqlMigrationsDir(): string {
  if (is.dev) {
    return join(__dirname, "../../src/main/migrations");
  }
  return join(__dirname, "migrations");
}

function getSqliteMigrationsDir(): string {
  if (is.dev) {
    return join(__dirname, "../../src/main/migrations-sqlite");
  }
  return join(__dirname, "migrations-sqlite");
}

function splitSqlStatements(sql: string): string[] {
  const cleaned = sql
    .split("\n")
    .map((line) => (line.trimStart().startsWith("--") ? "" : line))
    .join("\n");
  return cleaned
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function readMigrationFiles(dir: string): Promise<string[]> {
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith(".sql"));
  files.sort();
  return files;
}

async function ensureMySqlMigrationsTable(): Promise<void> {
  const db = Database.getInstance();
  await db.execute(
    "CREATE TABLE IF NOT EXISTS migrations (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const db = Database.getInstance();
  const rows = await db.query<MigrationRow>("SELECT name FROM migrations");
  return new Set(rows.map((row) => row.name));
}

// ── SQLite migrations (auto-run) ─────────────────────────────

export async function runMigrations(): Promise<void> {
  const db = Database.getInstance();

  // Only auto-run migrations for SQLite; MySQL migrations are managed via the UI
  if (db.dialect !== "sqlite") {
    return;
  }

  // Create migrations tracking table
  await db.execute(
    "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, run_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );

  const existing = await getAppliedMigrations();
  const migrationsDir = getSqliteMigrationsDir();

  let files: string[];
  try {
    files = await readMigrationFiles(migrationsDir);
  } catch (error) {
    console.error("Failed to read migrations directory:", migrationsDir, error);
    throw new Error(`Cannot read migrations directory: ${migrationsDir}`);
  }

  for (const file of files) {
    if (existing.has(file)) continue;

    const filePath = join(migrationsDir, file);
    const sql = await fs.readFile(filePath, "utf-8");

    try {
      await db.transaction(async (trx) => {
        const statements = splitSqlStatements(sql);
        for (const stmt of statements) {
          await trx.execute(stmt);
        }
        await trx.execute("INSERT INTO migrations (name) VALUES (?)", [file]);
      });
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      console.error(`Migration failed: ${file}`, error);
      throw error;
    }
  }
}

// ── MySQL migration status check ─────────────────────────────

export interface MigrationStatus {
  pending: string[];
  applied: string[];
  allFiles: string[];
}

export async function checkMySqlMigrationStatus(): Promise<MigrationStatus> {
  const db = Database.getInstance();
  if (db.dialect !== "mysql") {
    return { pending: [], applied: [], allFiles: [] };
  }

  await ensureMySqlMigrationsTable();
  const existing = await getAppliedMigrations();

  const migrationsDir = getMySqlMigrationsDir();
  let files: string[];
  try {
    files = await readMigrationFiles(migrationsDir);
  } catch (error) {
    console.error("Failed to read MySQL migrations directory:", migrationsDir, error);
    throw new Error(`Cannot read MySQL migrations directory: ${migrationsDir}`);
  }

  const applied = files.filter((f) => existing.has(f));
  const pending = files.filter((f) => !existing.has(f));

  return { pending, applied, allFiles: files };
}

// ── MySQL permission check ───────────────────────────────────

export interface PermissionCheckResult {
  hasPermissions: boolean;
  missing: string[];
}

export async function checkMySqlPermissions(): Promise<PermissionCheckResult> {
  const db = Database.getInstance();
  if (db.dialect !== "mysql") {
    return { hasPermissions: true, missing: [] };
  }

  const missing: string[] = [];
  const testTable = "_sf_permission_test";

  // Test CREATE TABLE
  try {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS ${testTable} (id INT PRIMARY KEY, val VARCHAR(10))`,
    );
  } catch {
    missing.push("CREATE");
    // If we can't create, we can't test the rest
    return { hasPermissions: false, missing };
  }

  // Test INSERT
  try {
    await db.execute(`INSERT INTO ${testTable} (id, val) VALUES (1, 'test')`);
  } catch {
    missing.push("INSERT");
  }

  // Test ALTER TABLE
  try {
    await db.execute(`ALTER TABLE ${testTable} ADD COLUMN test_col VARCHAR(10) NULL`);
  } catch {
    missing.push("ALTER");
  }

  // Test DROP TABLE
  try {
    await db.execute(`DROP TABLE IF EXISTS ${testTable}`);
  } catch {
    missing.push("DROP");
  }

  return { hasPermissions: missing.length === 0, missing };
}

// ── MySQL migration runner ───────────────────────────────────

export interface MigrationRunResult {
  applied: string[];
  error?: string;
}

export async function runMySqlMigrations(): Promise<MigrationRunResult> {
  const db = Database.getInstance();
  if (db.dialect !== "mysql") {
    return { applied: [] };
  }

  await ensureMySqlMigrationsTable();
  const existing = await getAppliedMigrations();

  const migrationsDir = getMySqlMigrationsDir();
  let files: string[];
  try {
    files = await readMigrationFiles(migrationsDir);
  } catch (error) {
    throw new Error(`Cannot read MySQL migrations directory: ${migrationsDir}`);
  }

  const applied: string[] = [];

  for (const file of files) {
    if (existing.has(file)) continue;

    const filePath = join(migrationsDir, file);
    const sql = await fs.readFile(filePath, "utf-8");

    try {
      await db.transaction(async (trx) => {
        const statements = splitSqlStatements(sql);
        for (const stmt of statements) {
          await trx.execute(stmt);
        }
        await trx.execute("INSERT INTO migrations (name) VALUES (?)", [file]);
      });
      applied.push(file);
      console.log(`Applied MySQL migration: ${file}`);
    } catch (error: any) {
      console.error(`MySQL migration failed: ${file}`, error);
      return {
        applied,
        error: `Migration "${file}" failed: ${error.message || error}`,
      };
    }
  }

  return { applied };
}
