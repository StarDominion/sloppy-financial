import { useEffect, useState } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

type TaxDocument = {
  id: number;
  year: number;
  description: string | null;
  document_path: string;
  file_name: string;
  storage_key: string | null;
  md5_hash: string | null;
  created_at: string;
  updated_at: string;
};

type Tag = {
  id: number;
  name: string;
  color: string;
};

interface TaxDocumentsListProps {
  profileId: number;
  onUpload: () => void;
}

export function TaxDocumentsList({
  profileId,
  onUpload,
}: TaxDocumentsListProps): React.JSX.Element {
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [tags, setTags] = useState<Record<number, Tag[]>>({});
  const [years, setYears] = useState<number[]>([]);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFileName, setPreviewFileName] = useState<string>("");

  useEffect(() => {
    loadDocuments();
    loadYears();
    return onDataChange("tax", () => {
      loadDocuments();
      loadYears();
    });
  }, [profileId]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const data = await window.api.tax.listDocuments(profileId);
      setDocuments(data);

      // Load tags for each document
      const tagMap: Record<number, Tag[]> = {};
      await Promise.all(
        data.map(async (doc) => {
          try {
            tagMap[doc.id] = await window.api.tags.getForTaxDocument(doc.id);
          } catch {
            tagMap[doc.id] = [];
          }
        }),
      );
      setTags(tagMap);
    } catch (err) {
      console.error("Error loading tax documents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadYears() {
    try {
      const data = await window.api.tax.getYears(profileId);
      setYears(data);
    } catch (err) {
      console.error("Error loading tax years:", err);
    }
  }

  async function handleView(doc: TaxDocument) {
    const key = doc.storage_key || doc.document_path;
    if (!key) return;
    try {
      setPreviewLoading(true);
      setPreviewFileName(doc.file_name);
      const result = await window.api.minio.download(key);
      const uint8Array = new Uint8Array(result.data);
      const blob = new Blob([uint8Array], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType(result.contentType);
    } catch (err) {
      console.error("Error loading document preview:", err);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewType(null);
    setPreviewFileName("");
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this tax document?")) return;
    try {
      await window.api.tax.deleteDocument(id);
      await loadDocuments();
      await loadYears();
      emitDataChange("tax");
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Error deleting document");
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    if (filterYear !== "all" && doc.year !== Number(filterYear)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        doc.file_name.toLowerCase().includes(term) ||
        (doc.description || "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Group by year
  const grouped = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.year]) acc[doc.year] = [];
      acc[doc.year].push(doc);
      return acc;
    },
    {} as Record<number, TaxDocument[]>,
  );
  const sortedYears = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading tax documents...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Tax Documents</h2>
        <button
          onClick={onUpload}
          style={{
            padding: "8px 16px",
            background: "#2da44e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 14,
          }}
        >
          + Upload Document
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            flex: 1,
            maxWidth: 300,
          }}
        />
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="all">All Years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <div style={{ color: "#aaa", fontSize: 14, marginLeft: "auto" }}>
          {filteredDocuments.length} document
          {filteredDocuments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Document List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredDocuments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              padding: 40,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              No tax documents found
            </p>
            <p style={{ fontSize: 13 }}>
              Click &quot;+ Upload Document&quot; to add one.
            </p>
          </div>
        ) : (
          sortedYears.map((year) => (
            <div key={year} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: 16,
                  color: "#ccc",
                  borderBottom: "1px solid #333",
                  paddingBottom: 6,
                }}
              >
                Tax Year {year}
                <span
                  style={{
                    fontSize: 13,
                    color: "#666",
                    fontWeight: "normal",
                    marginLeft: 8,
                  }}
                >
                  ({grouped[year].length} document
                  {grouped[year].length !== 1 ? "s" : ""})
                </span>
              </h3>
              {grouped[year].map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "#1e1e1e",
                    border: "1px solid #333",
                    borderRadius: 8,
                    marginBottom: 8,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#555")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#333")
                  }
                >
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.file_name}
                    </div>
                    {doc.description && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#aaa",
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.description}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#666" }}>
                        Uploaded{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      {(tags[doc.id] || []).map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            padding: "1px 6px",
                            borderRadius: 8,
                            fontSize: 11,
                            background: tag.color,
                            color: "#fff",
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleView(doc)}
                    style={{
                      padding: "6px 12px",
                      background: "#007acc",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      color: "#ff6b6b",
                      border: "1px solid #cf222e55",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Document Preview Modal */}
      {(previewUrl || previewLoading) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "#1e1e1e",
              borderBottom: "1px solid #444",
            }}
          >
            <span style={{ color: "#fff", fontSize: "16px" }}>
              {previewFileName || "Document Preview"}
            </span>
            <button
              onClick={closePreview}
              style={{
                padding: "8px 16px",
                background: "#444",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "auto",
              padding: "20px",
            }}
          >
            {previewLoading ? (
              <p style={{ color: "#fff" }}>Loading preview...</p>
            ) : previewType?.startsWith("image/") ? (
              <img
                src={previewUrl!}
                alt="Document preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : previewType === "application/pdf" ? (
              <iframe
                src={previewUrl!}
                title="PDF preview"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#fff",
                }}
              />
            ) : (
              <div style={{ color: "#fff", textAlign: "center" }}>
                <p>Preview not available for this file type.</p>
                <a
                  href={previewUrl!}
                  download={previewFileName}
                  style={{
                    color: "#007acc",
                    textDecoration: "underline",
                  }}
                >
                  Download file
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
