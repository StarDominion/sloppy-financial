import React, { useState, useRef } from "react";
import TagSelector from "./TagSelector";
import { emitDataChange } from "../dataEvents";

interface TaxUploadProps {
  onSave: () => void;
  onCancel: () => void;
  profileId: number;
}

export function TaxUpload({
  onSave,
  onCancel,
  profileId,
}: TaxUploadProps): React.JSX.Element {
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState<number>(currentYear - 1);
  const [description, setDescription] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate year options (last 20 years)
  const yearOptions: number[] = [];
  for (let i = 0; i < 20; i++) {
    yearOptions.push(currentYear - i);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      // Upload file to MinIO
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const result = await window.api.minio.upload({
        name: selectedFile.name,
        mime: selectedFile.type,
        data: uint8Array,
      });

      // Create tax document record
      const taxDocId = await window.api.tax.createDocument({
        year: taxYear,
        description: description || null,
        document_path: result.objectName,
        file_name: selectedFile.name,
        storage_key: result.objectName,
        md5_hash: result.md5Hash,
        profileId,
      });

      // Save tags
      if (selectedTagIds.length > 0) {
        await window.api.tags.setForTaxDocument(taxDocId, selectedTagIds);
      }

      emitDataChange("tax");
      onSave();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload tax document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        color: "#f8fafc",
        background: "#0f172a",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h2>Upload Tax Document</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 15,
          maxWidth: 500,
        }}
      >
        {/* Tax Year */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>Tax Year</label>
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
              borderRadius: 4,
            }}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>Document</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "8px 16px",
                background: "#333",
                border: "1px solid #555",
                color: "#ddd",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              Choose File
            </button>
            {selectedFile && (
              <span style={{ color: "#aaa", fontSize: "0.9rem" }}>
                {selectedFile.name}
              </span>
            )}
          </div>
          {selectedFile && (
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 4 }}>
              Size: {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ color: "#ccc", fontSize: "0.9rem" }}>
            Description
          </label>
          <textarea
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
              minHeight: 80,
              resize: "vertical",
              borderRadius: 4,
            }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. W-2 from employer, 1099 form, etc."
          />
        </div>

        {/* Tags */}
        <TagSelector
          selectedTagIds={selectedTagIds}
          onChange={setSelectedTagIds}
          profileId={profileId}
        />

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            style={{
              padding: "10px 20px",
              background: uploading || !selectedFile ? "#1a4a2e" : "#2da44e",
              border: "none",
              color: "#fff",
              cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
              borderRadius: 4,
              fontWeight: "bold",
            }}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
          <button
            onClick={onCancel}
            disabled={uploading}
            style={{
              padding: "10px 20px",
              background: "#333",
              border: "1px solid #555",
              color: "#ddd",
              cursor: uploading ? "not-allowed" : "pointer",
              borderRadius: 4,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
