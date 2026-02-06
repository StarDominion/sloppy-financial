import mysql from "mysql2/promise";
import { Client } from "minio";
import { AppSettings } from "./settings";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export async function testMySQLConnection(
  config: AppSettings["mysql"],
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
  config: AppSettings["minio"],
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
