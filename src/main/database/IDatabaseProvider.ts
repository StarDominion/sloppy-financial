export interface IDatabaseProvider {
  /** The SQL dialect this provider uses */
  readonly dialect: "mysql" | "sqlite";

  /**
   * Execute a SELECT query and return rows
   * @param sql SQL query string with ? placeholders
   * @param params Bind parameters
   * @returns Array of row objects
   */
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute an INSERT/UPDATE/DELETE and return metadata
   * @param sql SQL statement with ? placeholders
   * @param params Bind parameters
   * @returns Object with insertId and affectedRows
   */
  execute(sql: string, params?: unknown[]): Promise<{ insertId: number; affectedRows: number }>;

  /**
   * Run a function within a database transaction
   * @param fn Function receiving a transaction handle
   * @returns The value returned by fn
   */
  transaction<T>(fn: (trx: ITransaction) => Promise<T>): Promise<T>;

  /**
   * Initialize the provider (create connections, enable features, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Close all connections and clean up
   */
  close(): Promise<void>;
}

export interface ITransaction {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ insertId: number; affectedRows: number }>;
}
