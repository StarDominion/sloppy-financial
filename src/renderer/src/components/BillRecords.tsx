import { useEffect, useState, useRef } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

interface BillRecordsProps {
  onOpenManualBill: () => void;
  onViewBill?: (billId: number) => void;
  profileId: number;
}

type Tag = {
  id: number;
  name: string;
  color: string;
  created_at: string;
};

type BillRecordWithTags = any & {
  tags?: Tag[];
};

export function BillRecords({
  onOpenManualBill,
  onViewBill,
  profileId,
}: BillRecordsProps): React.JSX.Element {
  const [billRecords, setBillRecords] = useState<BillRecordWithTags[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BillRecordWithTags[]>(
    [],
  );
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    loadTags();
    return onDataChange("bills", () => {
      loadData();
      loadTags();
    });
  }, []);

  useEffect(() => {
    filterAndSortRecords();
  }, [billRecords, searchTerm, sortConfig, selectedTagFilter, selectedMonth, selectedYear]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTagFilter, sortConfig, selectedMonth, selectedYear]);

  const loadTags = async () => {
    try {
      const tags = await window.api.tags.list(profileId);
      setAllTags(tags);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  };

  const loadData = async () => {
    const records = await window.api.bills.listRecords(profileId);
    // Load tags for each record
    const recordsWithTags = await Promise.all(
      records.map(async (record) => {
        try {
          const tags = await window.api.tags.getForBillRecord(record.id);
          return { ...record, tags };
        } catch (err) {
          console.error("Error loading tags for record:", record.id, err);
          return { ...record, tags: [] };
        }
      }),
    );
    setBillRecords(recordsWithTags);
  };

  const filterAndSortRecords = () => {
    let result = [...billRecords];

    // Filter by search term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (rec) =>
          rec.name.toLowerCase().includes(lowerTerm) ||
          (rec.description &&
            rec.description.toLowerCase().includes(lowerTerm)),
      );
    }

    // Filter by tag
    if (selectedTagFilter !== null) {
      result = result.filter(
        (rec) =>
          rec.tags && rec.tags.some((tag: Tag) => tag.id === selectedTagFilter),
      );
    }

    // Filter by month/year
    if (selectedMonth !== null || selectedYear !== null) {
      result = result.filter((rec) => {
        const d = new Date(rec.due_date);
        if (selectedYear !== null && d.getFullYear() !== selectedYear) return false;
        if (selectedMonth !== null && d.getMonth() !== selectedMonth) return false;
        return true;
      });
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Special handling for derived/specific fields
        if (sortConfig.key === "has_document") {
          aVal = !!a.document_path;
          bVal = !!b.document_path;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // Default sort by due date desc
      result.sort(
        (a, b) =>
          new Date(b.due_date).getTime() - new Date(a.due_date).getTime(),
      );
    }

    setFilteredRecords(result);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handlePay = async (id: number) => {
    await window.api.bills.payRecord(id);
    emitDataChange("bills");
    loadData();
  };

  const triggerUpload = (id: number) => {
    setUploadingId(id);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || uploadingId === null) return;

    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    try {
      const result = await window.api.minio.upload({
        name: file.name,
        mime: file.type,
        data: uint8Array,
      });

      await window.api.bills.updateRecordDocument(
        uploadingId,
        result.objectName,
        result.originalName,
        result.md5Hash,
      );
      loadData();
      emitDataChange("bills");
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="bill-records">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}
        >
          <input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#1e1e1e",
              color: "#fff",
              flex: 1,
              maxWidth: 300,
            }}
          />
          <select
            value={selectedTagFilter ?? ""}
            onChange={(e) =>
              setSelectedTagFilter(
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#1e1e1e",
              color: "#fff",
            }}
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth ?? ""}
            onChange={(e) =>
              setSelectedMonth(
                e.target.value !== "" ? parseInt(e.target.value) : null,
              )
            }
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#1e1e1e",
              color: "#fff",
            }}
          >
            <option value="">All Months</option>
            {[
              "January", "February", "March", "April",
              "May", "June", "July", "August",
              "September", "October", "November", "December",
            ].map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear ?? ""}
            onChange={(e) =>
              setSelectedYear(
                e.target.value !== "" ? parseInt(e.target.value) : null,
              )
            }
            style={{
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #444",
              background: "#1e1e1e",
              color: "#fff",
            }}
          >
            <option value="">All Years</option>
            {Array.from(
              new Set(
                billRecords.map((r) => new Date(r.due_date).getFullYear()),
              ),
            )
              .sort((a, b) => b - a)
              .map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
          </select>
        </div>
        <button
          onClick={onOpenManualBill}
          style={{
            padding: "8px 16px",
            background: "#2da44e",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          + Add Manual Record
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 15,
          fontSize: "0.9rem",
          color: "#ccc",
        }}
      >
        <span>Sort by:</span>
        <button
          onClick={() => requestSort("due_date")}
          style={{
            background: "none",
            border: "none",
            color: sortConfig?.key === "due_date" ? "#fff" : "#888",
            cursor: "pointer",
            textDecoration:
              sortConfig?.key === "due_date" ? "underline" : "none",
          }}
        >
          Date{" "}
          {sortConfig?.key === "due_date" &&
            (sortConfig.direction === "asc" ? "↑" : "↓")}
        </button>
        <button
          onClick={() => requestSort("amount")}
          style={{
            background: "none",
            border: "none",
            color: sortConfig?.key === "amount" ? "#fff" : "#888",
            cursor: "pointer",
            textDecoration: sortConfig?.key === "amount" ? "underline" : "none",
          }}
        >
          Amount{" "}
          {sortConfig?.key === "amount" &&
            (sortConfig.direction === "asc" ? "↑" : "↓")}
        </button>
        <button
          onClick={() => requestSort("status")}
          style={{
            background: "none",
            border: "none",
            color: sortConfig?.key === "status" ? "#fff" : "#888",
            cursor: "pointer",
            textDecoration: sortConfig?.key === "status" ? "underline" : "none",
          }}
        >
          Status{" "}
          {sortConfig?.key === "status" &&
            (sortConfig.direction === "asc" ? "↑" : "↓")}
        </button>
        <button
          onClick={() => requestSort("has_document")}
          style={{
            background: "none",
            border: "none",
            color: sortConfig?.key === "has_document" ? "#fff" : "#888",
            cursor: "pointer",
            textDecoration:
              sortConfig?.key === "has_document" ? "underline" : "none",
          }}
        >
          Document{" "}
          {sortConfig?.key === "has_document" &&
            (sortConfig.direction === "asc" ? "↑" : "↓")}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {paginatedRecords.map((rec) => (
          <div key={rec.id} className={`bill-record-item ${rec.status}`}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold" }}>{rec.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#aaa" }}>
                Due: {new Date(rec.due_date).toLocaleDateString()}
              </div>
              {rec.description && (
                <div
                  style={{ fontSize: "0.8rem", color: "#777", marginTop: 2 }}
                >
                  {rec.description}
                </div>
              )}
              {rec.tags && rec.tags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {rec.tags.map((tag: Tag) => (
                    <span
                      key={tag.id}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: "0.7rem",
                        background: tag.color,
                        color: "#fff",
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 100, textAlign: "right", fontWeight: "bold" }}>
              ${rec.amount}
            </div>
            <div style={{ width: 100, textAlign: "center" }}>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: rec.status === "paid" ? "#1b5e20" : "#b71c1c",
                  fontSize: "0.8rem",
                }}
              >
                {rec.status.toUpperCase()}
              </span>
            </div>
            <div
              style={{
                width: onViewBill ? 300 : 220,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              {/* View Details Button */}
              {onViewBill && (
                <button
                  onClick={() => onViewBill(rec.id)}
                  style={{
                    background: "#333",
                    border: "1px solid #555",
                    color: "#ddd",
                    cursor: "pointer",
                    padding: "5px 10px",
                    fontSize: "0.8rem",
                    borderRadius: 4,
                  }}
                >
                  View
                </button>
              )}
              {/* Document Section */}
              {rec.document_path ? (
                <div
                  title={rec.document_path}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "0.8rem",
                    color: "#4caf50",
                  }}
                >
                  <span>✓ Doc</span>
                  <button
                    onClick={() => triggerUpload(rec.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid #444",
                      color: "#aaa",
                      cursor: "pointer",
                      padding: "2px 5px",
                      fontSize: "0.7em",
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => triggerUpload(rec.id)}
                  style={{
                    background: "#333",
                    border: "1px solid #555",
                    color: "#ddd",
                    cursor: "pointer",
                    padding: "5px 10px",
                    fontSize: "0.8rem",
                  }}
                >
                  + Attach Doc
                </button>
              )}

              {rec.status === "unpaid" && (
                <button
                  onClick={() => handlePay(rec.id)}
                  style={{
                    background: "#007acc",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    padding: "5px 10px",
                    borderRadius: 4,
                  }}
                >
                  Mark Paid
                </button>
              )}
            </div>
          </div>
        ))}
        {paginatedRecords.length === 0 && (
          <div
            style={{
              color: "#666",
              fontStyle: "italic",
              textAlign: "center",
              padding: 20,
            }}
          >
            No records found
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            padding: "15px 0",
            borderTop: "1px solid #333",
          }}
        >
          <div style={{ color: "#888", fontSize: "0.9rem" }}>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredRecords.length)} of{" "}
            {filteredRecords.length} records
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: "5px 10px",
                background: currentPage === 1 ? "#222" : "#333",
                border: "1px solid #444",
                color: currentPage === 1 ? "#555" : "#ddd",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                borderRadius: 4,
              }}
            >
              ← Prev
            </button>

            {getPageNumbers().map((page, idx) =>
              page === "..." ? (
                <span key={idx} style={{ color: "#666", padding: "0 5px" }}>
                  ...
                </span>
              ) : (
                <button
                  key={idx}
                  onClick={() => goToPage(page as number)}
                  style={{
                    padding: "5px 10px",
                    background: currentPage === page ? "#007acc" : "#333",
                    border: "1px solid #444",
                    color: "#fff",
                    cursor: "pointer",
                    borderRadius: 4,
                    minWidth: 35,
                  }}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: "5px 10px",
                background: currentPage === totalPages ? "#222" : "#333",
                border: "1px solid #444",
                color: currentPage === totalPages ? "#555" : "#ddd",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                borderRadius: 4,
              }}
            >
              Next →
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>Per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "5px 8px",
                background: "#1e1e1e",
                border: "1px solid #444",
                color: "#ddd",
                borderRadius: 4,
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
