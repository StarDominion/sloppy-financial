import mysql from "mysql2/promise";
import { config } from "./config";

let poolInstance: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!poolInstance) {
    poolInstance = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectionLimit: 10,
      waitForConnections: true,
    });
  }
  return poolInstance;
}

export async function resetPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

// Create a proxy object that lazily initializes the pool
export const pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    const actualPool = getPool();
    const value = actualPool[prop as keyof mysql.Pool];
    if (typeof value === "function") {
      return value.bind(actualPool);
    }
    return value;
  },
});

export async function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}
