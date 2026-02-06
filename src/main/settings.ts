import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { is } from "@electron-toolkit/utils";

export interface AppSettings {
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  minio: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  ollama: {
    host: string;
    model: string;
  };
}

const defaultSettings: AppSettings = {
  mysql: {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "sloppy_finances",
  },
  minio: {
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "sloppy_finances",
  },
  ollama: {
    host: "http://localhost:11434",
    model: "llama3.2",
  },
};

// ── JSON file store (development) ──────────────────────────────────

function getJsonPath(): string {
  return join(process.cwd(), "config", "profile.json");
}

function readJsonSettings(): AppSettings {
  const filePath = getJsonPath();
  if (!existsSync(filePath)) {
    return { ...defaultSettings };
  }
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return deepMerge(defaultSettings, parsed);
  } catch {
    return { ...defaultSettings };
  }
}

function writeJsonSettings(settings: AppSettings): void {
  const filePath = getJsonPath();
  const dir = join(process.cwd(), "config");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

// ── Electron-store (production) ────────────────────────────────────

let electronStore: any = null;

async function getElectronStore() {
  if (!electronStore) {
    const ElectronStore = (await import("electron-store")).default;
    electronStore = new ElectronStore<AppSettings>({
      defaults: defaultSettings,
      name: "app-settings",
    });
  }
  return electronStore;
}

// ── Deep merge helper ──────────────────────────────────────────────

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

// ── Public API ─────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  if (is.dev) {
    return readJsonSettings();
  }
  const s = await getElectronStore();
  return s.store;
}

export async function updateSettings(
  settings: Partial<AppSettings>,
): Promise<void> {
  if (is.dev) {
    const current = readJsonSettings();
    const updated = deepMerge(current, settings);
    writeJsonSettings(updated);
    return;
  }

  const s = await getElectronStore();
  if (settings.mysql) {
    s.set("mysql", { ...s.get("mysql"), ...settings.mysql });
  }
  if (settings.minio) {
    s.set("minio", { ...s.get("minio"), ...settings.minio });
  }
  if (settings.ollama) {
    s.set("ollama", { ...s.get("ollama"), ...settings.ollama });
  }
}

export async function resetSettings(): Promise<void> {
  if (is.dev) {
    writeJsonSettings({ ...defaultSettings });
    return;
  }
  const s = await getElectronStore();
  s.clear();
}

