import { useState, useEffect } from "react";

interface MigrationStatusProps {
  pendingMigrations: string[];
  onComplete: () => void;
  onBack: () => void;
}

interface PermissionResult {
  hasPermissions: boolean;
  missing: string[];
}

export function MigrationStatus({
  pendingMigrations,
  onComplete,
  onBack,
}: MigrationStatusProps): React.JSX.Element {
  const [permissions, setPermissions] = useState<PermissionResult | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    applied: string[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setCheckingPermissions(true);
    try {
      const result = await window.api.migrations.checkPermissions();
      setPermissions(result);
    } catch (err: any) {
      setPermissions({
        hasPermissions: false,
        missing: [`Permission check failed: ${err.message}`],
      });
    } finally {
      setCheckingPermissions(false);
    }
  };

  const handleRunMigrations = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await window.api.migrations.run();
      setRunResult(result);
      if (!result.error) {
        // All migrations applied successfully
        onComplete();
      }
    } catch (err: any) {
      setRunResult({
        applied: [],
        error: err.message || "Unknown error running migrations",
      });
    } finally {
      setRunning(false);
    }
  };

  const permissionLabel = (perm: string) => {
    const labels: Record<string, string> = {
      CREATE: "CREATE TABLE",
      INSERT: "INSERT",
      ALTER: "ALTER TABLE",
      DROP: "DROP TABLE",
    };
    return labels[perm] || perm;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        flex: 1,
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <h1 style={{ marginBottom: 0 }}>Database Migrations Required</h1>
      <p style={{ color: "#888", marginTop: 0, textAlign: "center", maxWidth: 500 }}>
        Your MySQL database is missing {pendingMigrations.length} migration
        {pendingMigrations.length === 1 ? "" : "s"}. These must be applied before you can use
        this workspace.
      </p>

      {/* Pending migrations list */}
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: 8,
          padding: "16px",
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        <h3 style={{ fontSize: 13, color: "#aaa", marginTop: 0, marginBottom: 8 }}>
          Pending Migrations
        </h3>
        {pendingMigrations.map((file) => (
          <div
            key={file}
            style={{
              fontSize: 12,
              color: "#ccc",
              padding: "4px 0",
              fontFamily: "monospace",
            }}
          >
            {file}
          </div>
        ))}
      </div>

      {/* Permission check status */}
      <div style={{ width: "100%", maxWidth: 500 }}>
        {checkingPermissions ? (
          <div style={{ fontSize: 13, color: "#888", textAlign: "center" }}>
            Checking database permissions...
          </div>
        ) : permissions && !permissions.hasPermissions ? (
          <div
            style={{
              padding: "12px 16px",
              background: "#3a2a1a",
              border: "1px solid #cc8800",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <div style={{ color: "#ffaa44", fontWeight: 500, marginBottom: 8 }}>
              Insufficient MySQL Permissions
            </div>
            <div style={{ color: "#ccaa88", marginBottom: 8 }}>
              The configured MySQL user is missing the following permissions needed to run
              migrations:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#ffcc88" }}>
              {permissions.missing.map((perm) => (
                <li key={perm} style={{ marginBottom: 2 }}>
                  {permissionLabel(perm)}
                </li>
              ))}
            </ul>
            <div style={{ color: "#ccaa88", marginTop: 10, fontSize: 12 }}>
              Ask your database administrator to grant these permissions, or run migrations
              externally with a privileged user:
            </div>
            <div
              style={{
                marginTop: 6,
                padding: "6px 10px",
                background: "#2a2a2a",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 11,
                color: "#aaa",
              }}
            >
              npm run migrate
            </div>
          </div>
        ) : permissions && permissions.hasPermissions ? (
          <div
            style={{
              padding: "10px 16px",
              background: "#1a3a1a",
              border: "1px solid #44aa44",
              borderRadius: 6,
              color: "#88cc88",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Database permissions verified — ready to run migrations.
          </div>
        ) : null}
      </div>

      {/* Run result error */}
      {runResult?.error && (
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            padding: "12px 16px",
            background: "#3a1a1a",
            border: "1px solid #ff4444",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <div style={{ color: "#ff6666", fontWeight: 500, marginBottom: 6 }}>
            Migration Failed
          </div>
          <div style={{ color: "#ff8888", fontFamily: "monospace", fontSize: 12 }}>
            {runResult.error}
          </div>
          {runResult.applied.length > 0 && (
            <div style={{ color: "#888", marginTop: 8, fontSize: 12 }}>
              {runResult.applied.length} migration{runResult.applied.length === 1 ? "" : "s"}{" "}
              applied before the failure.
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onBack}
          disabled={running}
          style={{
            padding: "10px 20px",
            background: "#333",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: 6,
            cursor: running ? "not-allowed" : "pointer",
            fontSize: 14,
            opacity: running ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={handleRunMigrations}
          disabled={
            running || checkingPermissions || (permissions != null && !permissions.hasPermissions)
          }
          style={{
            padding: "10px 20px",
            background:
              permissions?.hasPermissions && !running && !checkingPermissions
                ? "#007acc"
                : "#555",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor:
              running || checkingPermissions || !permissions?.hasPermissions
                ? "not-allowed"
                : "pointer",
            fontSize: 14,
          }}
        >
          {running ? "Running Migrations..." : "Run Migrations"}
        </button>
        {runResult?.error && (
          <button
            onClick={handleRunMigrations}
            disabled={running}
            style={{
              padding: "10px 20px",
              background: running ? "#555" : "#885500",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: running ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
