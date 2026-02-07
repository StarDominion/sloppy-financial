import { promises as fs } from "fs";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { Database } from "./database/Database";

type MigrationRow = {
  id: number;
  name: string;
  run_at: string;
};

export async function runMigrations(): Promise<void> {
  const db = Database.getInstance();

  // Create migrations tracking table (dialect-compatible)
  if (db.dialect === "sqlite") {
    await db.execute(
      "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, run_at TEXT NOT NULL DEFAULT (datetime('now')))",
    );
  } else {
    await db.execute(
      "CREATE TABLE IF NOT EXISTS migrations (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
  }

  const existingRows = await db.query<MigrationRow>("SELECT name FROM migrations");
  const existing = new Set(existingRows.map((row) => row.name));

  // Determine migration directory based on dialect
  const migrationFolder = db.dialect === "sqlite" ? "migrations-sqlite" : "migrations";
  let migrationsDir = join(__dirname, migrationFolder);
  if (is.dev) {
    migrationsDir = join(__dirname, `../../src/main/${migrationFolder}`);
  }

  let files: string[] = [];

  try {
    files = (await fs.readdir(migrationsDir)).filter((file) =>
      file.endsWith(".sql"),
    );
  } catch (error) {
    console.error("Failed to read migrations directory:", error);
    return;
  }

  files.sort();

  for (const file of files) {
    if (existing.has(file)) continue;

    const filePath = join(migrationsDir, file);
    const sql = await fs.readFile(filePath, "utf-8");

    try {
      await db.transaction(async (trx) => {
        if (db.dialect === "sqlite") {
          // better-sqlite3's prepare() only handles one statement at a time
          // Strip full-line comments first to avoid semicolons inside comments breaking the split
          const cleaned = sql
            .split("\n")
            .map((line) => (line.trimStart().startsWith("--") ? "" : line))
            .join("\n");
          const statements = cleaned
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          for (const stmt of statements) {
            await trx.execute(stmt);
          }
        } else {
          await trx.execute(sql);
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
