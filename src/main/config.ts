import { getSettings } from "./settings";

// Default config (will be updated after settings are loaded)
export const config = {
  mysql: {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "sloppy_financial",
  },
  minio: {
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "financial",
  },
};

// Initialize config with stored settings
export async function initConfig(): Promise<void> {
  const storedSettings = await getSettings();

  Object.assign(config.mysql, {
    host: storedSettings.mysql.host || "localhost",
    port: storedSettings.mysql.port || 3306,
    user: storedSettings.mysql.user || "root",
    password: storedSettings.mysql.password || "",
    database: storedSettings.mysql.database || "sloppy_finances",
  });

  Object.assign(config.minio, {
    endPoint: storedSettings.minio.endPoint || "localhost",
    port: storedSettings.minio.port || 9000,
    useSSL: storedSettings.minio.useSSL ?? false,
    accessKey: storedSettings.minio.accessKey || "minioadmin",
    secretKey: storedSettings.minio.secretKey || "minioadmin",
    bucket: storedSettings.minio.bucket || "sloppy_finances",
  });
}

// Function to reload config after settings change
export async function reloadConfig(): Promise<void> {
  const newSettings = await getSettings();

  Object.assign(config.mysql, {
    host: newSettings.mysql.host || "localhost",
    port: newSettings.mysql.port || 3306,
    user: newSettings.mysql.user || "root",
    password: newSettings.mysql.password || "",
    database: newSettings.mysql.database || "fainancial",
  });

  Object.assign(config.minio, {
    endPoint: newSettings.minio.endPoint || "localhost",
    port: newSettings.minio.port || 9000,
    useSSL: newSettings.minio.useSSL ?? false,
    accessKey: newSettings.minio.accessKey || "minioadmin",
    secretKey: newSettings.minio.secretKey || "minioadmin",
    bucket: newSettings.minio.bucket || "fainancial",
  });
}
