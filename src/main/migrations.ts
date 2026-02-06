import { promises as fs } from "fs";
import { join } from "path";
import { pool } from "./db";
import { is } from "@electron-toolkit/utils";

type MigrationRow = {
  id: number;
  name: string;
  run_at: string;
};

export async function runMigrations(): Promise<void> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS migrations (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );

  const [existingRows] = await pool.query("SELECT name FROM migrations");
  const existing = new Set(
    (existingRows as MigrationRow[]).map((row) => row.name),
  );

  let migrationsDir = join(__dirname, "migrations");
  if (is.dev) {
    migrationsDir = join(__dirname, "../../src/main/migrations");
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
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(sql);
      await connection.query("INSERT INTO migrations (name) VALUES (?)", [
        file,
      ]);
      await connection.commit();
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await connection.rollback();
      console.error(`Migration failed: ${file}`, error);
      throw error;
    } finally {
      connection.release();
    }
  }
}
