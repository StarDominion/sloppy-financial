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
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async (): Promise<void> => {
    try {
      const settings = await window.api.settings.get();
      setMysqlConfig(settings.mysql);
      setMinioConfig(settings.minio);
      if (settings.ollama) setOllamaConfig(settings.ollama);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const testMySQLConnection = async (): Promise<void> => {
    setIsTesting(true);
    setMysqlTestResult(null);
    try {
      const result = await window.api.settings.testMySQL(mysqlConfig);
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
      const result = await window.api.settings.testMinIO(minioConfig);
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
    try {
      await window.api.settings.update({
        mysql: mysqlConfig,
        minio: minioConfig,
        ollama: ollamaConfig,
      });
      setSaveMessage(
        "Settings saved successfully! Please restart the application for changes to take full effect.",
      );
      setTimeout(() => setSaveMessage(""), 5000);
    } catch (error) {
      setSaveMessage(
        "Failed to save settings: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
      setTimeout(() => setSaveMessage(""), 5000);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Application Settings" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* MySQL Configuration */}
        <div style={{ borderBottom: "1px solid #444", paddingBottom: "15px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#4EC9B0" }}>
            MySQL Database
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
        </div>

        {/* MinIO Configuration */}
        <div style={{ borderBottom: "1px solid #444", paddingBottom: "15px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#4EC9B0" }}>
            MinIO Object Storage
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "10px",
              alignItems: "center",
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
            style={{ ...buttonStyle, backgroundColor: "#0e639c" }}
          >
            Save Settings
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
