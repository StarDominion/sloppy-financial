const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const mysql = require("mysql2/promise");

// Read config from config/profile.json (same as the app in dev mode)
const configPath = path.join(process.cwd(), "config", "profile.json");
let profileConfig = {};
if (fsSync.existsSync(configPath)) {
  try {
    profileConfig = JSON.parse(fsSync.readFileSync(configPath, "utf-8"));
  } catch {
    console.warn("Could not parse config/profile.json, using defaults.");
  }
}

const mysqlSettings = profileConfig.mysql || {};
const config = {
  host: mysqlSettings.host || "localhost",
  port: mysqlSettings.port || 3306,
  user: mysqlSettings.user || "root",
  password: mysqlSettings.password || "",
  database: mysqlSettings.database || "sloppy_finances",
};

async function runMigrations() {
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 5,
    waitForConnections: true,
    multipleStatements: true,
  });

  await pool.query(
    "CREATE TABLE IF NOT EXISTS migrations (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );

  const [existingRows] = await pool.query("SELECT name FROM migrations");
  const existing = new Set(existingRows.map((row) => row.name));

  const migrationsDir = path.join(__dirname, "..", "src", "main", "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) =>
    file.endsWith(".sql"),
  );
  files.sort();

  for (const file of files) {
    if (existing.has(file)) continue;

    const filePath = path.join(migrationsDir, file);
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

  await pool.end();
}

runMigrations().catch((error) => {
  console.error(error);
  process.exit(1);
});
