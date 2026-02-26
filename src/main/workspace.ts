import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { is } from "@electron-toolkit/utils";
import { dialog } from "electron";
import { Database } from "./database/Database";
import { SqliteProvider } from "./database/SqliteProvider";
import { MysqlProvider } from "./database/MysqlProvider";
import { FileStorage } from "./storage/FileStorage";
import { MinioStorageProvider } from "./storage/MinioStorageProvider";
import { LocalStorageProvider } from "./storage/LocalStorageProvider";
import { runMigrations } from "./migrations";
import { initBillScheduler } from "./bills";
import { loadAndScheduleReminders } from "./reminders";

// ── Types ───────────────────────────────────────────────────

export interface WorkspaceConfig {
  database: {
    provider: "sqlite" | "mysql";
    mysql?: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
  };
  storage: {
    provider: "local" | "minio";
    minio?: {
      endPoint: string;
      port: number;
      useSSL: boolean;
      accessKey: string;
      secretKey: string;
      bucket: string;
    };
  };
  ollama?: {
    host: string;
    model: string;
  };
}

const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  database: { provider: "sqlite" },
  storage: { provider: "local" },
  ollama: { host: "http://localhost:11434", model: "llama3.2" },
};

// ── Deep merge helper ───────────────────────────────────────

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as Array<keyof T>) {
    const val = override[key];
    if (
      val !== undefined &&
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val) &&
      typeof base[key] === "object" &&
      base[key] !== null
    ) {
      result[key] = deepMerge(base[key] as any, val as any);
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

// ── Recent workspaces store ─────────────────────────────────

interface RecentEntry {
  path: string;
  lastOpened: string;
}

function getDevJsonPath(): string {
  return join(process.cwd(), "config", "recent-workspaces.json");
}

function readDevRecents(): RecentEntry[] {
  const filePath = getDevJsonPath();
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function writeDevRecents(entries: RecentEntry[]): void {
  const filePath = getDevJsonPath();
  const dir = join(process.cwd(), "config");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
}

let electronStore: any = null;

async function getElectronStore() {
  if (!electronStore) {
    const ElectronStore = (await import("electron-store")).default;
    electronStore = new ElectronStore({
      name: "recent-workspaces",
      defaults: { recentWorkspaces: [] as RecentEntry[] },
    });
  }
  return electronStore;
}

export async function getRecentWorkspaces(): Promise<RecentEntry[]> {
  let entries: RecentEntry[];
  if (is.dev) {
    entries = readDevRecents();
  } else {
    const s = await getElectronStore();
    entries = s.get("recentWorkspaces") || [];
  }
  // Filter out paths where the folder or config.json no longer exists
  const valid = entries.filter(
    (e) => existsSync(e.path) && existsSync(join(e.path, "config.json")),
  );
  if (valid.length !== entries.length) {
    // Persist the cleaned list
    if (is.dev) {
      writeDevRecents(valid);
    } else {
      const s = await getElectronStore();
      s.set("recentWorkspaces", valid);
    }
  }
  return valid;
}

export async function addRecentWorkspace(folderPath: string): Promise<void> {
  let entries: RecentEntry[];
  if (is.dev) {
    entries = readDevRecents();
  } else {
    const s = await getElectronStore();
    entries = s.get("recentWorkspaces") || [];
  }
  // Remove existing entry for this path
  entries = entries.filter((e) => e.path !== folderPath);
  // Add to front
  entries.unshift({ path: folderPath, lastOpened: new Date().toISOString() });
  // Cap at 10
  entries = entries.slice(0, 10);

  if (is.dev) {
    writeDevRecents(entries);
  } else {
    const s = await getElectronStore();
    s.set("recentWorkspaces", entries);
  }
}

export async function removeRecentWorkspace(folderPath: string): Promise<void> {
  let entries: RecentEntry[];
  if (is.dev) {
    entries = readDevRecents();
  } else {
    const s = await getElectronStore();
    entries = s.get("recentWorkspaces") || [];
  }
  entries = entries.filter((e) => e.path !== folderPath);
  if (is.dev) {
    writeDevRecents(entries);
  } else {
    const s = await getElectronStore();
    s.set("recentWorkspaces", entries);
  }
}

// ── Workspace config read/write ─────────────────────────────

export function readWorkspaceConfig(folderPath: string): WorkspaceConfig {
  const configPath = join(folderPath, "config.json");
  if (!existsSync(configPath)) {
    throw new Error(`No config.json found in ${folderPath}`);
  }
  const raw = readFileSync(configPath, "utf-8");
  return deepMerge(DEFAULT_WORKSPACE_CONFIG, JSON.parse(raw));
}

export function writeWorkspaceConfig(folderPath: string, config: WorkspaceConfig): void {
  const configPath = join(folderPath, "config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

// ── Create workspace ────────────────────────────────────────

export async function createWorkspace(
  folderPath: string,
  config?: Partial<WorkspaceConfig>,
): Promise<void> {
  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true });
  }
  const finalConfig = deepMerge(DEFAULT_WORKSPACE_CONFIG, config || {});
  writeWorkspaceConfig(folderPath, finalConfig);
  await addRecentWorkspace(folderPath);
}

// ── Open/initialize workspace ───────────────────────────────

let currentWorkspacePath: string | null = null;

export function getCurrentWorkspacePath(): string | null {
  return currentWorkspacePath;
}

export function getWorkspaceConfig(): WorkspaceConfig | null {
  if (!currentWorkspacePath) return null;
  return readWorkspaceConfig(currentWorkspacePath);
}

export async function openWorkspace(folderPath: string): Promise<void> {
  // Close existing DB provider if any
  try {
    await Database.getInstance().close();
  } catch {
    /* ok if not initialized */
  }

  const wsConfig = readWorkspaceConfig(folderPath);

  // Initialize Database provider
  if (wsConfig.database.provider === "sqlite") {
    const dbPath = join(folderPath, "data.db");
    const sqliteProvider = new SqliteProvider({ path: dbPath });
    await sqliteProvider.initialize();
    Database.setProvider(sqliteProvider);
  } else if (wsConfig.database.provider === "mysql") {
    if (!wsConfig.database.mysql) {
      throw new Error("MySQL config missing in workspace config.json");
    }
    const mysqlProvider = new MysqlProvider(wsConfig.database.mysql);
    await mysqlProvider.initialize();
    Database.setProvider(mysqlProvider);
  }

  // Initialize FileStorage provider
  if (wsConfig.storage.provider === "local") {
    const localProvider = new LocalStorageProvider({ basePath: folderPath });
    await localProvider.initialize();
    FileStorage.setProvider(localProvider);
  } else if (wsConfig.storage.provider === "minio") {
    if (!wsConfig.storage.minio) {
      throw new Error("MinIO config missing in workspace config.json");
    }
    const minioProvider = new MinioStorageProvider(wsConfig.storage.minio);
    await minioProvider.initialize();
    FileStorage.setProvider(minioProvider);
  }

  // Run migrations
  await runMigrations();

  // Initialize schedulers (non-fatal if they fail)
  try {
    initBillScheduler();
    await loadAndScheduleReminders();
  } catch (err) {
    console.error("Failed to initialize schedulers:", err);
  }

  // Update state
  currentWorkspacePath = folderPath;
  await addRecentWorkspace(folderPath);
}

// ── Update workspace config ─────────────────────────────────

export async function updateWorkspaceConfig(
  folderPath: string,
  updates: Partial<WorkspaceConfig>,
): Promise<void> {
  const current = readWorkspaceConfig(folderPath);
  const updated = deepMerge(current, updates);
  writeWorkspaceConfig(folderPath, updated);
}

// ── Folder picker dialogs ───────────────────────────────────

export async function showOpenFolderDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Workspace Folder",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

export async function showCreateFolderDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Choose Location for New Workspace",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}
