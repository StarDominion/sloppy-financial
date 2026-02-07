import { Database } from "./database/Database";

/**
 * Backward-compatible shim that delegates to the Database singleton.
 * Consumer files can continue importing { query } from "./db".
 */

export async function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const db = Database.getInstance();
  // For SELECT queries, T is typically SomeType[] — return rows directly.
  // For INSERT/UPDATE/DELETE, T is typically { insertId: number } — return execute result.
  const trimmed = sql.trimStart().toUpperCase();
  if (
    trimmed.startsWith("SELECT") ||
    trimmed.startsWith("SHOW") ||
    trimmed.startsWith("DESCRIBE")
  ) {
    const rows = await db.query(sql, params);
    return rows as T;
  }
  // For write operations, return the execute result (has insertId, affectedRows)
  const result = await db.execute(sql, params);
  return result as T;
}

export async function resetPool(): Promise<void> {
  await Database.getInstance().close();
}

export { Database } from "./database/Database";
