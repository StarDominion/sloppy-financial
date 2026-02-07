import { IDatabaseProvider, ITransaction } from "./IDatabaseProvider";

/**
 * Database - Central abstraction layer for database operations.
 * Provides a unified interface for different database providers (MySQL, SQLite, etc.)
 * Mirrors the FileStorage pattern.
 */
export class Database {
  private static instance: Database | null = null;
  private provider: IDatabaseProvider | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public static setProvider(provider: IDatabaseProvider): void {
    const instance = Database.getInstance();
    instance.provider = provider;
  }

  private getProvider(): IDatabaseProvider {
    if (!this.provider) {
      throw new Error("Database: No provider configured. Call Database.setProvider() first.");
    }
    return this.provider;
  }

  get dialect(): "mysql" | "sqlite" {
    return this.getProvider().dialect;
  }

  public async query<T = any>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.getProvider().query<T>(sql, params);
  }

  public async execute(sql: string, params?: unknown[]): Promise<{ insertId: number; affectedRows: number }> {
    return this.getProvider().execute(sql, params);
  }

  public async transaction<T>(fn: (trx: ITransaction) => Promise<T>): Promise<T> {
    return this.getProvider().transaction(fn);
  }

  public async initialize(): Promise<void> {
    return this.getProvider().initialize();
  }

  public async close(): Promise<void> {
    return this.getProvider().close();
  }
}
