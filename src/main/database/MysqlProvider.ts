import mysql from "mysql2/promise";
import type { ResultSetHeader } from "mysql2/promise";
import { IDatabaseProvider, ITransaction } from "./IDatabaseProvider";

export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class MysqlProvider implements IDatabaseProvider {
  readonly dialect = "mysql" as const;
  private pool: mysql.Pool | null = null;
  private config: MysqlConfig;

  constructor(config: MysqlConfig) {
    this.config = config;
  }

  private getPool(): mysql.Pool {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: 10,
        waitForConnections: true,
      });
    }
    return this.pool;
  }

  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.getPool().query(sql, params);
    return rows as T[];
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> {
    const [result] = await this.getPool().query(sql, params);
    const header = result as ResultSetHeader;
    return {
      insertId: header.insertId,
      affectedRows: header.affectedRows,
    };
  }

  async transaction<T>(fn: (trx: ITransaction) => Promise<T>): Promise<T> {
    const connection = await this.getPool().getConnection();
    try {
      await connection.beginTransaction();

      const trx: ITransaction = {
        async query<U = any>(sql: string, params: unknown[] = []): Promise<U[]> {
          const [rows] = await connection.query(sql, params);
          return rows as U[];
        },
        async execute(sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> {
          const [result] = await connection.query(sql, params);
          const header = result as ResultSetHeader;
          return {
            insertId: header.insertId,
            affectedRows: header.affectedRows,
          };
        },
      };

      const result = await fn(trx);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async initialize(): Promise<void> {
    // Pool is lazily created; just verify connectivity
    this.getPool();
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
