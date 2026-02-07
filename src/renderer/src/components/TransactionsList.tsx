import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";
import TagSelector from "./TagSelector";

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  reference: string | null;
  bill_record_id: number | null;
  document_path: string | null;
  document_original_name: string | null;
  created_at: string;
  bill_name?: string;
};

type Tag = {
  id: number;
  name: string;
  color: string;
};

type TransactionWithTags = Transaction & {
  tags?: Tag[];
};

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  payment: "Payment",
  refund: "Refund",
  fee: "Fee",
  interest: "Interest",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  deposit: "#2da44e",
  withdrawal: "#cf222e",
  transfer: "#0969da",
  payment: "#bf8700",
  refund: "#8957e5",
  fee: "#fa4549",
  interest: "#1a7f37",
  other: "#656d76",
};

interface TransactionsListProps {
  profileId: number;
  onNewTransaction: () => void;
  onViewTransaction: (transactionId: number) => void;
}

export function TransactionsList({
  profileId,
  onNewTransaction,
  onViewTransaction,
}: TransactionsListProps): React.JSX.Element {
  const [transactions, setTransactions] = useState<TransactionWithTags[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<string>("transaction_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterUntagged, setFilterUntagged] = useState(false);
  const [minTagCount, setMinTagCount] = useState<number | null>(null);
  const [amountFilterValue, setAmountFilterValue] = useState<number | null>(null);
  const [amountFilterType, setAmountFilterType] = useState<"gt" | "lt" | "eq">("gt");

  // Tag rules state
  const [tagRules, setTagRules] = useState<Array<{substring: string; tag: string; replaceDescription: string }>>([]);
  const [tagRulesOpen, setTagRulesOpen] = useState(false);
  const [applyingRules, setApplyingRules] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingTagsForId, setEditingTagsForId] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadTransactions();
    loadTags();
    return onDataChange("transactions", () => {
      loadTransactions();
      loadTags();
    });
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterType,
    selectedTagFilter,
    filterUntagged,
    minTagCount,
    amountFilterValue,
    amountFilterType,
    searchTerm,
    selectedMonth,
    selectedYear,
    sortKey,
    sortDir,
  ]);

  async function loadTransactions(): Promise<void> {
    try {
      setLoading(true);
      const data = await window.api.transactions.list(profileId);
      // Load tags for each transaction
      const withTags = await Promise.all(
        data.map(async (t) => {
          try {
            const tags = await window.api.tags.getForTransaction(t.id);
            return { ...t, tags };
          } catch {
            return { ...t, tags: [] };
          }
        }),
      );
      setTransactions(withTags);
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags(): Promise<void> {
    try {
      const tags = await window.api.tags.list(profileId);
      setAllTags(tags);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  }

  const requestSort = (key: string): void => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const addTagRule = (): void => {
    setTagRules((prev) => [...prev, { substring: "", tag: "", replaceDescription: "" }]);
  };

  const updateTagRule = (index: number, field: "substring" | "tag" | "replaceDescription", value: string): void => {
    setTagRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const removeTagRule = (index: number): void => {
    setTagRules((prev) => prev.filter((_, i) => i !== index));
  };

  const applyTagRules = async (): Promise<void> => {
    const activeRules = tagRules.filter((r) => r.substring.trim() && r.tag.trim());
    if (activeRules.length === 0) return;

    setApplyingRules(true);
    try {
      const result = await window.api.transactions.applyTagRules(profileId, activeRules);
      alert(`Applied tag rules to ${result.updated} transactions.${result.errors.length > 0 ? `\n\nErrors:\n${result.errors.join("\n")}` : ""}`);
      await loadTransactions();
      await loadTags();
    } catch (err) {
      alert(`Failed to apply tag rules: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setApplyingRules(false);
    }
  };

  const copyDescription = async (id: number, description: string | null): Promise<void> => {
    if (!description) return;
    try {
      await navigator.clipboard.writeText(description);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleTagsChange = async (transactionId: number, tagIds: number[]): Promise<void> => {
    try {
      await window.api.tags.setForTransaction(transactionId, tagIds);
      await loadTransactions();
      setEditingTagsForId(null);
    } catch (err) {
      console.error("Failed to update tags:", err);
      alert("Failed to update tags");
    }
  };

  const filtered = transactions.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (selectedTagFilter !== null) {
      if (!t.tags || !t.tags.some((tag) => tag.id === selectedTagFilter))
        return false;
    }
    if (filterUntagged) {
      if (t.tags && t.tags.length > 0) return false;
    }
    if (minTagCount !== null) {
      const tagCount = t.tags?.length || 0;
      if (tagCount < minTagCount) return false;
    }
    if (amountFilterValue !== null) {
      const amount = Number(t.amount);
      if (amountFilterType === "gt" && amount <= amountFilterValue) return false;
      if (amountFilterType === "lt" && amount >= amountFilterValue) return false;
      if (amountFilterType === "eq" && amount !== amountFilterValue) return false;
    }
    if (selectedMonth !== null || selectedYear !== null) {
      const d = new Date(t.transaction_date);
      if (selectedYear !== null && d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== null && d.getMonth() !== selectedMonth) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (t.description || "").toLowerCase().includes(term) ||
        (t.reference || "").toLowerCase().includes(term) ||
        (t.bill_name || "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number = a[sortKey as keyof Transaction] as string | number;
    let bVal: string | number = b[sortKey as keyof Transaction] as string | number;
    if (sortKey === "transaction_date") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    if (sortKey === "amount") {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + itemsPerPage);

  const totalDeposits = filtered
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSpent = filtered
    .filter((t) => t.type === "withdrawal" || t.type === "payment" || t.type === "fee")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const netAmount = totalDeposits - totalSpent;

  const sortIndicator = (key: string): string => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const thStyle = (key: string): React.CSSProperties => ({
    padding: "10px 8px",
    cursor: "pointer",
    color: sortKey === key ? "#fff" : "#999",
    userSelect: "none",
  });

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading transactions...</p>
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
        <h2 style={{ margin: 0 }}>Transactions</h2>
        <button
          onClick={onNewTransaction}
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
          + New Transaction
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
            flex: 1,
            maxWidth: 250,
          }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={selectedTagFilter ?? ""}
          onChange={(e) =>
            setSelectedTagFilter(
              e.target.value ? parseInt(e.target.value) : null,
            )
          }
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="">All Tags</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: 4,
            cursor: "pointer",
            userSelect: "none",
            color: filterUntagged ? "#fff" : "#999",
          }}
        >
          <input
            type="checkbox"
            checked={filterUntagged}
            onChange={(e) => setFilterUntagged(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Untagged only
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <label
            htmlFor="minTagCount"
            style={{
              color: minTagCount !== null ? "#fff" : "#999",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Min tags:
          </label>
          <input
            id="minTagCount"
            type="number"
            min="0"
            placeholder="Any"
            value={minTagCount ?? ""}
            onChange={(e) =>
              setMinTagCount(
                e.target.value !== "" ? parseInt(e.target.value) : null,
              )
            }
            style={{
              width: 60,
              padding: "4px 8px",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 3,
              fontSize: 14,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#1e1e1e",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <label
            htmlFor="amountFilter"
            style={{
              color: amountFilterValue !== null ? "#fff" : "#999",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Amount:
          </label>
          <select
            value={amountFilterType}
            onChange={(e) => setAmountFilterType(e.target.value as "gt" | "lt" | "eq")}
            style={{
              padding: "4px 6px",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 3,
              fontSize: 14,
            }}
          >
            <option value="gt">&gt;</option>
            <option value="lt">&lt;</option>
            <option value="eq">=</option>
          </select>
          <input
            id="amountFilter"
            type="number"
            step="0.01"
            placeholder="Any"
            value={amountFilterValue ?? ""}
            onChange={(e) =>
              setAmountFilterValue(
                e.target.value !== "" ? parseFloat(e.target.value) : null,
              )
            }
            style={{
              width: 80,
              padding: "4px 8px",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 3,
              fontSize: 14,
            }}
          />
        </div>
        <select
          value={selectedMonth ?? ""}
          onChange={(e) =>
            setSelectedMonth(
              e.target.value !== "" ? parseInt(e.target.value) : null,
            )
          }
          style={{
            padding: "8px 12px",
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
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
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 4,
          }}
        >
          <option value="">All Years</option>
          {Array.from(
            new Set(
              transactions.map((t) =>
                new Date(t.transaction_date).getFullYear(),
              ),
            ),
          )
            .sort((a, b) => b - a)
            .map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
        </select>
        <div style={{ color: "#aaa", fontSize: 14, marginLeft: "auto", display: "flex", gap: 20 }}>
          <span>
            <strong style={{ color: "#2da44e" }}>
              ${totalDeposits.toFixed(2)}
            </strong>{" "}
            deposits
          </span>
          <span>
            <strong style={{ color: "#cf222e" }}>
              ${totalSpent.toFixed(2)}
            </strong>{" "}
            spent
          </span>
          <span>
            <strong style={{ color: netAmount >= 0 ? "#2da44e" : "#cf222e" }}>
              ${netAmount.toFixed(2)}
            </strong>{" "}
            net
          </span>
          <span style={{ marginLeft: 10 }}>
            ({filtered.length} transactions)
          </span>
        </div>
      </div>

      {/* Tag Rules Panel */}
      <div
        style={{
          marginBottom: 12,
          border: "1px solid #333",
          borderRadius: 6,
          background: "#1a1a1a",
        }}
      >
        <button
          onClick={() => setTagRulesOpen(!tagRulesOpen)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            padding: "10px 14px",
            border: "none",
            background: "transparent",
            color: "#aaa",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <span>Tag Rules ({tagRules.length})</span>
          <span style={{ fontSize: 10 }}>{tagRulesOpen ? "\u25B2" : "\u25BC"}</span>
        </button>
        {tagRulesOpen && (
          <div style={{ padding: "0 14px 14px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#888", fontStyle: "italic" }}>
              Match substrings in descriptions to auto-assign tags and optionally replace the description.
            </p>
            {tagRules.map((rule, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="Substring to match..."
                  value={rule.substring}
                  onChange={(e) => updateTagRule(i, "substring", e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "6px 8px",
                    background: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: 3,
                    color: "#e0e0e0",
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  placeholder="Tag name"
                  value={rule.tag}
                  onChange={(e) => updateTagRule(i, "tag", e.target.value)}
                  style={{
                    flex: "0 0 120px",
                    padding: "6px 8px",
                    background: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: 3,
                    color: "#e0e0e0",
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  placeholder="Replace description with... (optional)"
                  value={rule.replaceDescription}
                  onChange={(e) => updateTagRule(i, "replaceDescription", e.target.value)}
                  style={{
                    flex: 1.5,
                    minWidth: 0,
                    padding: "6px 8px",
                    background: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: 3,
                    color: "#e0e0e0",
                    fontSize: 13,
                  }}
                />
                <button
                  onClick={() => removeTagRule(i)}
                  title="Remove rule"
                  style={{
                    flex: "0 0 28px",
                    height: 28,
                    padding: 0,
                    border: "1px solid #555",
                    borderRadius: 3,
                    background: "#3a2020",
                    color: "#f48771",
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  x
                </button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button
                onClick={addTagRule}
                style={{
                  padding: "6px 12px",
                  background: "#333",
                  color: "#ccc",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Add Rule
              </button>
              <button
                onClick={applyTagRules}
                disabled={applyingRules || tagRules.filter((r) => r.substring.trim() && r.tag.trim()).length === 0}
                style={{
                  padding: "6px 12px",
                  background: applyingRules ? "#555" : "#0e639c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: applyingRules ? "not-allowed" : "pointer",
                  opacity: applyingRules || tagRules.filter((r) => r.substring.trim() && r.tag.trim()).length === 0 ? 0.5 : 1,
                }}
              >
                {applyingRules ? "Applying..." : "Apply Rules"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {paginated.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#666",
              padding: 40,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              No transactions found
            </p>
            <p style={{ fontSize: 13 }}>
              Click &quot;+ New Transaction&quot; to record a transaction.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #444",
                  textAlign: "left",
                }}
              >
                <th
                  style={thStyle("transaction_date")}
                  onClick={() => requestSort("transaction_date")}
                >
                  Date{sortIndicator("transaction_date")}
                </th>
                <th
                  style={thStyle("type")}
                  onClick={() => requestSort("type")}
                >
                  Type{sortIndicator("type")}
                </th>
                <th style={{ padding: "10px 8px", color: "#999" }}>
                  Description
                </th>
                <th style={{ padding: "10px 8px", color: "#999" }}>
                  Bill
                </th>
                <th style={{ padding: "10px 8px", color: "#999" }}>
                  Tags
                </th>
                <th
                  style={{
                    ...thStyle("amount"),
                    textAlign: "right",
                  }}
                  onClick={() => requestSort("amount")}
                >
                  Amount{sortIndicator("amount")}
                </th>
                <th
                  style={{
                    padding: "10px 8px",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  📎
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((txn) => {
                const typeColor = TYPE_COLORS[txn.type] || "#656d76";
                return (
                  <tr
                    key={txn.id}
                    style={{
                      borderBottom: "1px solid #333",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#2a2a2a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      onClick={() => onViewTransaction(txn.id)}
                      style={{
                        padding: "10px 8px",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        color: "#0969da",
                        textDecoration: "underline",
                      }}
                    >
                      {new Date(txn.transaction_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontSize: 12,
                          background: typeColor + "22",
                          color: typeColor,
                          border: `1px solid ${typeColor}`,
                        }}
                      >
                        {TYPE_LABELS[txn.type] || txn.type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        color: "#aaa",
                        maxWidth: 200,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                          title={txn.description || ""}
                        >
                          {txn.description || "—"}
                        </span>
                        {txn.description && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyDescription(txn.id, txn.description);
                            }}
                            style={{
                              padding: "2px 6px",
                              background: copiedId === txn.id ? "#2da44e" : "#333",
                              color: copiedId === txn.id ? "#fff" : "#aaa",
                              border: "1px solid #444",
                              borderRadius: 3,
                              cursor: "pointer",
                              fontSize: 11,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              transition: "all 0.2s",
                            }}
                            title={copiedId === txn.id ? "Copied!" : "Copy description"}
                          >
                            {copiedId === txn.id ? "✓" : "Copy"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        color: txn.bill_name ? "#0969da" : "#444",
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {txn.bill_name || "—"}
                    </td>
                    <td
                      style={{ padding: "10px 8px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editingTagsForId === txn.id ? (
                        <div
                          style={{
                            position: "relative",
                            background: "#2a2a2a",
                            padding: "12px",
                            borderRadius: 6,
                            border: "1px solid #444",
                            minWidth: 250,
                          }}
                        >
                          <TagSelector
                            selectedTagIds={txn.tags?.map((t) => t.id) || []}
                            onChange={(tagIds) => handleTagsChange(txn.id, tagIds)}
                            profileId={profileId}
                          />
                          <button
                            onClick={() => setEditingTagsForId(null)}
                            style={{
                              marginTop: 8,
                              padding: "6px 12px",
                              background: "#0969da",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 13,
                              width: "100%",
                            }}
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingTagsForId(txn.id)}
                          style={{
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: 4,
                            minHeight: 24,
                            display: "flex",
                            alignItems: "center",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#333")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {txn.tags && txn.tags.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              {txn.tags.slice(0, 3).map((tag) => (
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
                              {txn.tags.length > 3 && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#888",
                                  }}
                                >
                                  +{txn.tags.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#666", fontSize: 12 }}>+ Add tags</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                        fontWeight: "bold",
                        color: typeColor,
                      }}
                    >
                      ${Number(txn.amount).toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        color: txn.document_path ? "#2da44e" : "#444",
                      }}
                    >
                      {txn.document_path ? "📄" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #333",
          }}
        >
          <div style={{ color: "#888", fontSize: "0.9rem" }}>
            Showing {startIndex + 1}-
            {Math.min(startIndex + itemsPerPage, sorted.length)} of{" "}
            {sorted.length} transactions
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            <span style={{ color: "#aaa", fontSize: 13, padding: "0 8px" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              style={{
                padding: "5px 10px",
                background: currentPage === totalPages ? "#222" : "#333",
                border: "1px solid #444",
                color: currentPage === totalPages ? "#555" : "#ddd",
                cursor:
                  currentPage === totalPages ? "not-allowed" : "pointer",
                borderRadius: 4,
              }}
            >
              Next →
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#888", fontSize: "0.9rem" }}>
              Per page:
            </span>
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
