import BetterSqlite3 from "better-sqlite3";
import { IDatabaseProvider, ITransaction } from "./IDatabaseProvider";

export interface SqliteConfig {
  path: string;
}

export class SqliteProvider implements IDatabaseProvider {
  readonly dialect = "sqlite" as const;
  private db: BetterSqlite3.Database | null = null;
  private dbPath: string;

  constructor(config: SqliteConfig) {
    this.dbPath = config.path;
  }

  private getDb(): BetterSqlite3.Database {
    if (!this.db) {
      this.db = new BetterSqlite3(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
    }
    return this.db;
  }

  private sanitizeParams(params: unknown[]): unknown[] {
    return params.map((p) => {
      if (p === undefined) return null;
      if (p instanceof Date) return p.toISOString();
      return p;
    });
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.getDb().prepare(sql);
    return stmt.all(...this.sanitizeParams(params)) as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> {
    const stmt = this.getDb().prepare(sql);
    const result = stmt.run(...this.sanitizeParams(params));
    return {
      insertId: Number(result.lastInsertRowid),
      affectedRows: result.changes,
    };
  }

  async transaction<T>(fn: (trx: ITransaction) => Promise<T>): Promise<T> {
    const db = this.getDb();
    const sanitize = this.sanitizeParams;

    // better-sqlite3 transactions are synchronous, but our interface is async.
    // We manually manage BEGIN/COMMIT/ROLLBACK to support async callbacks.
    db.exec("BEGIN");
    try {
      const trx: ITransaction = {
        query: async <U = any>(sql: string, params: unknown[] = []): Promise<U[]> => {
          const stmt = db.prepare(sql);
          return stmt.all(...sanitize(params)) as U[];
        },
        execute: async (sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> => {
          const stmt = db.prepare(sql);
          const result = stmt.run(...sanitize(params));
          return {
            insertId: Number(result.lastInsertRowid),
            affectedRows: result.changes,
          };
        },
      };

      const result = await fn(trx);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  async initialize(): Promise<void> {
    this.getDb();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
