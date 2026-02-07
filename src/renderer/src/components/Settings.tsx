import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MySQLSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

interface MinIOSettings {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

interface OllamaSettings {
  host: string;
  model: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export function Settings({
  isOpen,
  onClose,
}: SettingsProps): React.JSX.Element {
  const [dbProvider, setDbProvider] = useState<"sqlite" | "mysql">("sqlite");
  const [storageProvider, setStorageProvider] = useState<"local" | "minio">("local");

  const [mysqlConfig, setMysqlConfig] = useState<MySQLSettings>({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "sloppy_financial",
  });

  const [minioConfig, setMinioConfig] = useState<MinIOSettings>({
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
    bucket: "sloppy_financial",
  });

  const [ollamaConfig, setOllamaConfig] = useState<OllamaSettings>({
    host: "http://localhost:11434",
    model: "llama3.2",
  });

  const [mysqlTestResult, setMysqlTestResult] =
    useState<ConnectionTestResult | null>(null);
  const [minioTestResult, setMinioTestResult] =
    useState<ConnectionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async (): Promise<void> => {
    try {
      const [config, currentPath] = await Promise.all([
        window.api.workspace.getConfig(),
        window.api.workspace.getCurrent(),
      ]);
      setWorkspacePath(currentPath);
      if (!config) return;
      setDbProvider(config.database?.provider || "sqlite");
      setStorageProvider(config.storage?.provider || "local");
      if (config.database?.mysql) setMysqlConfig(config.database.mysql);
      if (config.storage?.minio) setMinioConfig(config.storage.minio);
      if (config.ollama) setOllamaConfig(config.ollama);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const testMySQLConnection = async (): Promise<void> => {
    setIsTesting(true);
    setMysqlTestResult(null);
    try {
      const result = await window.api.workspace.testMySQL(mysqlConfig);
      setMysqlTestResult(result);
    } catch (error) {
      setMysqlTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testMinIOConnection = async (): Promise<void> => {
    setIsTesting(true);
    setMinioTestResult(null);
    try {
      const result = await window.api.workspace.testMinIO(minioConfig);
      setMinioTestResult(result);
    } catch (error) {
      setMinioTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async (): Promise<void> => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const updates: any = {
        database: {
          provider: dbProvider,
          ...(dbProvider === "mysql" ? { mysql: mysqlConfig } : {}),
        },
        storage: {
          provider: storageProvider,
          ...(storageProvider === "minio" ? { minio: minioConfig } : {}),
        },
        ollama: ollamaConfig,
      };
      await window.api.workspace.updateConfig(updates);

      // Re-open the workspace so providers are reinitialized with new config
      if (workspacePath) {
        await window.api.workspace.open(workspacePath);
      }

      setSaveMessage("Settings saved and applied successfully!");
      setTimeout(() => setSaveMessage(""), 5000);
    } catch (error) {
      setSaveMessage(
        "Failed to save settings: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
      setTimeout(() => setSaveMessage(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Workspace Settings" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {workspacePath && (
          <div style={{ fontSize: "12px", color: "#888", wordBreak: "break-all" }}>
            Workspace: {workspacePath}
          </div>
        )}

        {/* Database Provider */}
        <div style={{ borderBottom: "1px solid #444", paddingBottom: "15px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#4EC9B0" }}>
            Database
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <label>Provider:</label>
            <select
              value={dbProvider}
              onChange={(e) => setDbProvider(e.target.value as "sqlite" | "mysql")}
              style={inputStyle}
            >
              <option value="sqlite">SQLite (Local)</option>
              <option value="mysql">MySQL (Remote)</option>
            </select>
          </div>

          {dbProvider === "mysql" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: "10px",
                alignItems: "center",
                marginTop: "10px",
              }}
            >
              <label>Host:</label>
              <input
                type="text"
                value={mysqlConfig.host}
                onChange={(e) =>
                  setMysqlConfig({ ...mysqlConfig, host: e.target.value })
                }
                style={inputStyle}
              />

              <label>Port:</label>
              <input
                type="number"
                value={mysqlConfig.port}
                onChange={(e) =>
                  setMysqlConfig({
                    ...mysqlConfig,
                    port: parseInt(e.target.value) || 3306,
                  })
                }
                style={inputStyle}
              />

              <label>User:</label>
              <input
                type="text"
                value={mysqlConfig.user}
                onChange={(e) =>
                  setMysqlConfig({ ...mysqlConfig, user: e.target.value })
                }
                style={inputStyle}
              />

              <label>Password:</label>
              <input
                type="password"
                value={mysqlConfig.password}
                onChange={(e) =>
                  setMysqlConfig({ ...mysqlConfig, password: e.target.value })
                }
                style={inputStyle}
              />

              <label>Database:</label>
              <input
                type="text"
                value={mysqlConfig.database}
                onChange={(e) =>
                  setMysqlConfig({ ...mysqlConfig, database: e.target.value })
                }
                style={inputStyle}
              />
            </div>
          )}

          {dbProvider === "mysql" && (
            <>
              <button
                onClick={testMySQLConnection}
                disabled={isTesting}
                style={{ ...buttonStyle, marginTop: "10px" }}
              >
                {isTesting ? "Testing..." : "Test MySQL Connection"}
              </button>

              {mysqlTestResult && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "4px",
                    backgroundColor: mysqlTestResult.success
                      ? "#1e4620"
                      : "#4a1e1e",
                    color: mysqlTestResult.success ? "#4EC9B0" : "#f48771",
                  }}
                >
                  {mysqlTestResult.message}
                </div>
              )}
            </>
          )}

          {dbProvider === "sqlite" && (
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#888" }}>
              Data stored in data.db within the workspace folder. No external database needed.
            </p>
          )}
        </div>

        {/* Storage Provider */}
        <div style={{ borderBottom: "1px solid #444", paddingBottom: "15px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#4EC9B0" }}>
            File Storage
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <label>Provider:</label>
            <select
              value={storageProvider}
              onChange={(e) => setStorageProvider(e.target.value as "local" | "minio")}
              style={inputStyle}
            >
              <option value="local">Local (Workspace Folder)</option>
              <option value="minio">MinIO (Remote)</option>
            </select>
          </div>

          {storageProvider === "minio" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: "10px",
                alignItems: "center",
                marginTop: "10px",
              }}
            >
              <label>Endpoint:</label>
              <input
                type="text"
                value={minioConfig.endPoint}
                onChange={(e) =>
                  setMinioConfig({ ...minioConfig, endPoint: e.target.value })
                }
                style={inputStyle}
              />

              <label>Port:</label>
              <input
                type="number"
                value={minioConfig.port}
                onChange={(e) =>
                  setMinioConfig({
                    ...minioConfig,
                    port: parseInt(e.target.value) || 9000,
                  })
                }
                style={inputStyle}
              />

              <label>Use SSL:</label>
              <input
                type="checkbox"
                checked={minioConfig.useSSL}
                onChange={(e) =>
                  setMinioConfig({ ...minioConfig, useSSL: e.target.checked })
                }
                style={{ width: "auto", justifySelf: "start" }}
              />

              <label>Access Key:</label>
              <input
                type="text"
                value={minioConfig.accessKey}
                onChange={(e) =>
                  setMinioConfig({ ...minioConfig, accessKey: e.target.value })
                }
                style={inputStyle}
              />

              <label>Secret Key:</label>
              <input
                type="password"
                value={minioConfig.secretKey}
                onChange={(e) =>
                  setMinioConfig({ ...minioConfig, secretKey: e.target.value })
                }
                style={inputStyle}
              />

              <label>Bucket:</label>
              <input
                type="text"
                value={minioConfig.bucket}
                onChange={(e) =>
                  setMinioConfig({ ...minioConfig, bucket: e.target.value })
                }
                style={inputStyle}
              />
            </div>
          )}

          {storageProvider === "minio" && (
            <>
              <button
                onClick={testMinIOConnection}
                disabled={isTesting}
                style={{ ...buttonStyle, marginTop: "10px" }}
              >
                {isTesting ? "Testing..." : "Test MinIO Connection"}
              </button>

              {minioTestResult && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "4px",
                    backgroundColor: minioTestResult.success
                      ? "#1e4620"
                      : "#4a1e1e",
                    color: minioTestResult.success ? "#4EC9B0" : "#f48771",
                  }}
                >
                  {minioTestResult.message}
                </div>
              )}
            </>
          )}

          {storageProvider === "local" && (
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#888" }}>
              Files stored in the workspace folder. No external storage needed.
            </p>
          )}
        </div>

        {/* Ollama AI Configuration */}
        <div style={{ borderBottom: "1px solid #444", paddingBottom: "15px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#4EC9B0" }}>
            Ollama AI (CSV Import)
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <label>Host:</label>
            <input
              type="text"
              value={ollamaConfig.host}
              onChange={(e) =>
                setOllamaConfig({ ...ollamaConfig, host: e.target.value })
              }
              placeholder="http://localhost:11434"
              style={inputStyle}
            />

            <label>Model:</label>
            <input
              type="text"
              value={ollamaConfig.model}
              onChange={(e) =>
                setOllamaConfig({ ...ollamaConfig, model: e.target.value })
              }
              placeholder="llama3.2"
              style={inputStyle}
            />
          </div>

          <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#888" }}>
            Used for automatic column mapping and transaction classification during CSV import.
          </p>
        </div>

        {/* Save Button and Message */}
        <div>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            style={{ ...buttonStyle, backgroundColor: "#0e639c" }}
          >
            {isSaving ? "Saving & Applying..." : "Save & Apply"}
          </button>

          {saveMessage && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                borderRadius: "4px",
                backgroundColor: saveMessage.includes("success")
                  ? "#1e4620"
                  : "#4a1e1e",
                color: saveMessage.includes("success") ? "#4EC9B0" : "#f48771",
              }}
            >
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  backgroundColor: "#3c3c3c",
  border: "1px solid #555",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "14px",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#0e639c",
  border: "none",
  borderRadius: "4px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background-color 0.2s",
};
