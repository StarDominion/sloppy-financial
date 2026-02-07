import mysql from "mysql2/promise";
import BetterSqlite3 from "better-sqlite3";
import { Client } from "minio";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export async function testMySQLConnection(
  config: { host: string; port: number; user: string; password: string; database: string },
): Promise<ConnectionTestResult> {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000,
    });

    await connection.ping();

    return {
      success: true,
      message: "Connected to MySQL successfully",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export async function testMinIOConnection(
  config: { endPoint: string; port: number; useSSL: boolean; accessKey: string; secretKey: string; bucket: string },
): Promise<ConnectionTestResult> {
  try {
    const client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });

    // Try to list buckets to verify connection
    await client.listBuckets();

    // Check if the configured bucket exists
    const bucketExists = await client.bucketExists(config.bucket);

    if (!bucketExists) {
      return {
        success: true,
        message: `Connected to MinIO successfully. Note: Bucket "${config.bucket}" does not exist yet and will be created when needed.`,
      };
    }

    return {
      success: true,
      message: "Connected to MinIO successfully and bucket exists",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function testSqliteConnection(
  config: { path: string },
): Promise<ConnectionTestResult> {
  let db;
  try {
    db = new BetterSqlite3(config.path);
    // Verify we can read/write
    db.pragma("journal_mode = WAL");
    db.exec("SELECT 1");

    return {
      success: true,
      message: `Connected to SQLite database at ${config.path}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  } finally {
    if (db) {
      db.close();
    }
  }
}
