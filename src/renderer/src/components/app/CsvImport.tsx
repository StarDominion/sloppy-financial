import React, { useState, useRef, useCallback, useEffect } from "react";

type TransactionType = "deposit" | "withdrawal";

const TYPE_OPTIONS: TransactionType[] = ["deposit", "withdrawal"];

function toTransactionType(t: string): TransactionType {
  if (t === "deposit" || t === "withdrawal") return t;
  return "withdrawal";
}

interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
}

interface ImportRow {
  _rowIndex: number;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  reference: string;
  suggestedTags: string[];
  excluded: boolean;
  duplicate: boolean;
  rulesApplied: boolean;
}

type MatchType = "substring" | "full_string" | "regex";

interface TagRule {
  substring: string;
  tag: string;
  matchType: MatchType;
  toggleTransaction: boolean;
  replaceDescription: string;
}

interface CsvImportProps {
  profileId: number;
  onDone: () => void;
}

type Step = "upload" | "mapping" | "review";

export function CsvImport({ profileId, onDone }: CsvImportProps): React.JSX.Element {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [commitResult, setCommitResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prompt editor state
  const [mappingPromptOpen, setMappingPromptOpen] = useState(false);
  const [mappingPrompt, setMappingPrompt] = useState("");
  const [mappingPromptResponse, setMappingPromptResponse] = useState("");
  const [mappingPromptLoading, setMappingPromptLoading] = useState(false);
  const [, setClassifyPromptOpen] = useState(false);
  const [classifyPrompt, setClassifyPrompt] = useState("");
  const [classifyPromptResponse, setClassifyPromptResponse] = useState("");
  const [classifyPromptLoading, setClassifyPromptLoading] = useState(false);

  // Tag rules state
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [, setTagRulesOpen] = useState(false);
  const [tagRulesSearch, setTagRulesSearch] = useState("");
  const [sortByUntagged, setSortByUntagged] = useState(false);

  // Review tab state
  const [reviewTab, setReviewTab] = useState<"transactions" | "rules" | "classify">("transactions");

  // Ref for tag rules scrolling
  const tagRulesContainerRef = useRef<HTMLDivElement>(null);

  // Inverse option for credit cards (swap deposit/withdrawal)
  const [inverseTypes, setInverseTypes] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  // Reset page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortByUntagged]);

  // Load saved tag rules from database on mount
  useEffect(() => {
    if (!profileId) return;

    const loadTagRules = async () => {
      try {
        const savedRules = await window.api.tagRules.list(profileId);
        setTagRules(
          savedRules.map((r) => ({
            substring: r.substring,
            tag: r.tag,
            matchType: r.match_type || "substring",
            toggleTransaction: r.toggle_transaction || false,
            replaceDescription: r.replace_description || "",
          })),
        );
      } catch (err) {
        console.error("Failed to load tag rules:", err);
      }
    };
    loadTagRules();
  }, [profileId]);

  // ─── Step 1: Upload CSV ───────────────────────────────────────────

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg("");
    setCommitResult(null);

    const text = await file.text();
    setLoading(true);
    setStatusMsg("Parsing CSV...");

    try {
      const { headers, rows } = await window.api.csvImport.parse(text);
      if (headers.length === 0 || rows.length === 0) {
        setErrorMsg("CSV file appears empty or has no data rows.");
        setLoading(false);
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Use Ollama to detect column mapping
      setStatusMsg("Detecting column mapping with AI...");
      const detectedMapping = await window.api.csvImport.detectMapping(headers, rows.slice(0, 5));
      setMapping(detectedMapping);

      // Build default prompt for the editor
      const defaultPrompt = await window.api.csvImport.buildMappingPrompt(headers, rows.slice(0, 5));
      setMappingPrompt(defaultPrompt);
      setMappingPromptResponse("");

      setStep("mapping");
      setStatusMsg("");
    } catch (err) {
      setErrorMsg(`Failed to parse CSV: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Step 2: Confirm Mapping ─────────────────────────────────────

  const handleMappingChange = (csvCol: string, dbCol: string) => {
    setMapping((prev) =>
      prev.map((m) => (m.csvColumn === csvCol ? { ...m, dbColumn: dbCol } : m)),
    );
  };

  const handleApplyMapping = useCallback(
    async (skipClassification: boolean = false) => {
      setLoading(true);
      setErrorMsg("");
      setStatusMsg("Applying column mapping...");

      try {
        const mapped = await window.api.csvImport.applyMapping(csvRows, mapping);

        let classifications: Array<{
          _rowIndex: number;
          type: TransactionType;
          suggestedTags: string[];
        }> = [];

        if (!skipClassification) {
          // Classify with Ollama
          setStatusMsg("Classifying transactions with AI...");
          let tags: { id: number; name: string }[] = [];
          try {
            tags = await window.api.tags.list(profileId);
          } catch {
            // no tags available
          }

          const rawClassifications = await window.api.csvImport.classify(mapped, tags);
          classifications = rawClassifications.map((c) => ({
            ...c,
            type: toTransactionType(c.type),
          }));

          // Build default classify prompt for the editor
          const defaultClassifyPrompt = await window.api.csvImport.buildClassifyPrompt(
            mapped.map((t) => ({
              _rowIndex: t._rowIndex,
              description: t.description,
              amount: t.amount,
              type: t.type,
            })),
            tags,
          );
          setClassifyPrompt(defaultClassifyPrompt);
          setClassifyPromptResponse("");
        }

        // Merge classifications into import rows
        const rows: ImportRow[] = mapped.map((t) => {
          const cls = classifications.find((c) => c._rowIndex === t._rowIndex);
          let type = toTransactionType(cls?.type || t.type);

          // Apply inverse if enabled (swap deposit/withdrawal for credit cards)
          if (inverseTypes) {
            type = type === "deposit" ? "withdrawal" : "deposit";
          }

          return {
            ...t,
            type,
            suggestedTags: cls?.suggestedTags || [],
            excluded: false,
            duplicate: false,
            rulesApplied: false,
          };
        });

        // Check for duplicates
        setStatusMsg("Checking for duplicate transactions...");
        try {
          const duplicateKeys = await window.api.transactions.checkDuplicates(
            profileId,
            rows.map((r) => ({ transaction_date: r.transaction_date, amount: r.amount })),
          );

          // Mark duplicates and auto-exclude them
          rows.forEach((row) => {
            const key = `${row.transaction_date}:${row.amount}`;
            if (duplicateKeys.has(key)) {
              row.duplicate = true;
              row.excluded = true; // Auto-exclude duplicates
            }
          });
        } catch (dupErr) {
          console.warn("Failed to check duplicates:", dupErr);
        }

        setImportRows(rows);
        setStep("review");
        setStatusMsg("");
      } catch (err) {
        setErrorMsg(`Mapping failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    },
    [csvRows, mapping, profileId, inverseTypes],
  );

  // ─── Step 3: Review & Edit ───────────────────────────────────────

  const [classifyingRow, setClassifyingRow] = useState<number | null>(null);

  const handleClassifySingle = useCallback(async (rowIndex: number) => {
    const row = importRows.find((r) => r._rowIndex === rowIndex);
    if (!row) return;

    setClassifyingRow(rowIndex);
    try {
      let tags: { id: number; name: string }[] = [];
      try { tags = await window.api.tags.list(profileId); } catch { /* no tags */ }

      const classifications = await window.api.csvImport.classify(
        [{
          _rowIndex: row._rowIndex,
          type: row.type,
          amount: row.amount,
          description: row.description,
          transaction_date: row.transaction_date,
          reference: row.reference,
        }],
        tags,
      );

      const cls = classifications.find((c) => c._rowIndex === rowIndex);
      if (cls) {
        setImportRows((prev) =>
          prev.map((r) =>
            r._rowIndex === rowIndex
              ? { ...r, type: toTransactionType(cls.type), suggestedTags: cls.suggestedTags }
              : r,
          ),
        );
      }
    } catch (err) {
      setErrorMsg(`Classification failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setClassifyingRow(null);
    }
  }, [importRows, profileId]);

  const updateRow = (rowIndex: number, field: keyof ImportRow, value: any) => {
    setImportRows((prev) =>
      prev.map((r) => (r._rowIndex === rowIndex ? { ...r, [field]: value } : r)),
    );
  };

  const toggleExclude = (rowIndex: number) => {
    setImportRows((prev) =>
      prev.map((r) => (r._rowIndex === rowIndex ? { ...r, excluded: !r.excluded } : r)),
    );
  };

  const toggleExcludeAll = () => {
    const allExcluded = importRows.every((r) => r.excluded);
    setImportRows((prev) => prev.map((r) => ({ ...r, excluded: !allExcluded })));
  };

  const toggleExcludeDuplicates = () => {
    const allDuplicatesExcluded = importRows.filter((r) => r.duplicate).every((r) => r.excluded);
    setImportRows((prev) =>
      prev.map((r) => (r.duplicate ? { ...r, excluded: !allDuplicatesExcluded } : r)),
    );
  };

  const handleCommit = useCallback(async () => {
    const toImport = importRows.filter((r) => !r.excluded);
    if (toImport.length === 0) {
      setErrorMsg("No transactions selected for import.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setStatusMsg(`Importing ${toImport.length} transactions...`);

    try {
      const result = await window.api.csvImport.commit(
        profileId,
        toImport.map((r) => ({
          _rowIndex: r._rowIndex,
          type: r.type,
          amount: r.amount,
          description: r.description,
          transaction_date: r.transaction_date,
          reference: r.reference,
          suggestedTags: r.suggestedTags,
        })),
      );

      setCommitResult(result);
      setStatusMsg("");

      if (result.errors.length === 0) {
        setStatusMsg(`Successfully imported ${result.imported} transactions!`);
      }
    } catch (err) {
      setErrorMsg(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [importRows, profileId]);

  const handleReset = () => {
    setStep("upload");
    setFileName("");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping([]);
    setImportRows([]);
    setCommitResult(null);
    setStatusMsg("");
    setErrorMsg("");
    setMappingPrompt("");
    setMappingPromptResponse("");
    setMappingPromptOpen(false);
    setClassifyPrompt("");
    setClassifyPromptResponse("");
    setClassifyPromptOpen(false);
    // Don't clear tagRules - they persist across imports and are loaded from DB
    setTagRulesOpen(false);
    setSortByUntagged(false);
    setCurrentPage(1);
    setItemsPerPage(100);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Prompt editor handlers ──────────────────────────────────────

  const handleRunMappingPrompt = useCallback(async () => {
    setMappingPromptLoading(true);
    setMappingPromptResponse("");
    try {
      const raw = await window.api.csvImport.runPrompt(mappingPrompt);
      setMappingPromptResponse(raw);
    } catch (err) {
      setMappingPromptResponse(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setMappingPromptLoading(false);
    }
  }, [mappingPrompt]);

  const handleApplyMappingResponse = useCallback(() => {
    try {
      const jsonMatch = mappingPromptResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ColumnMapping[];
        const valid = parsed.filter((m) => m.csvColumn && m.dbColumn && csvHeaders.includes(m.csvColumn));
        if (valid.length > 0) {
          setMapping(valid);
          setStatusMsg("Mapping updated from prompt response.");
          return;
        }
      }
      const parsed = JSON.parse(mappingPromptResponse);
      if (Array.isArray(parsed)) { setMapping(parsed); setStatusMsg("Mapping updated from prompt response."); return; }
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) { setMapping(parsed[key]); setStatusMsg("Mapping updated from prompt response."); return; }
      }
      setErrorMsg("Could not parse mapping from response.");
    } catch {
      setErrorMsg("Could not parse mapping from response. Expected valid JSON.");
    }
  }, [mappingPromptResponse, csvHeaders]);

  const handleRunClassifyPrompt = useCallback(async () => {
    setClassifyPromptLoading(true);
    setClassifyPromptResponse("");
    try {
      const raw = await window.api.csvImport.runPrompt(classifyPrompt);
      setClassifyPromptResponse(raw);
    } catch (err) {
      setClassifyPromptResponse(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setClassifyPromptLoading(false);
    }
  }, [classifyPrompt]);

  const handleApplyClassifyResponse = useCallback(() => {
    try {
      let parsed: any[] = [];
      const jsonMatch = classifyPromptResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        const obj = JSON.parse(classifyPromptResponse);
        if (Array.isArray(obj)) parsed = obj;
        else {
          for (const key of Object.keys(obj)) {
            if (Array.isArray(obj[key])) { parsed = obj[key]; break; }
          }
        }
      }
      if (parsed.length === 0) { setErrorMsg("Could not parse classifications from response."); return; }

      const validTypes = ["deposit", "withdrawal", "transfer", "payment", "refund", "fee", "interest", "other"];
      setImportRows((prev) =>
        prev.map((row) => {
          const match = parsed.find((p: any) => p.index === row._rowIndex);
          if (match) {
            return {
              ...row,
              type: validTypes.includes(match.type) ? match.type : row.type,
              suggestedTags: Array.isArray(match.suggestedTags) ? match.suggestedTags : row.suggestedTags,
            };
          }
          return row;
        }),
      );
      setStatusMsg("Classifications updated from prompt response.");
    } catch {
      setErrorMsg("Could not parse classifications from response. Expected valid JSON.");
    }
  }, [classifyPromptResponse]);

  // ─── Tag rules handlers ────────────────────────────────────────

  const addTagRule = () => {
    setTagRules((prev) => [
      {
        substring: "",
        tag: "",
        matchType: "substring",
        toggleTransaction: false, // Keep for backwards compatibility with saved rules
        replaceDescription: "",
      },
      ...prev,
    ]);
    // Scroll to top of tag rules container
    setTimeout(() => {
      if (tagRulesContainerRef.current) {
        tagRulesContainerRef.current.scrollTop = 0;
      }
    }, 50);
  };

  const updateTagRule = (index: number, field: keyof TagRule, value: string) => {
    setTagRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const removeTagRule = (index: number) => {
    setTagRules((prev) => prev.filter((_, i) => i !== index));
  };

  const applyTagRules = useCallback(async () => {
    const activeRules = tagRules.filter((r) => r.substring.trim() && r.tag.trim());
    if (activeRules.length === 0) return;

    // Save rules to database
    try {
      await window.api.tagRules.replaceAll(
        profileId,
        activeRules.map((r) => ({
          substring: r.substring,
          tag: r.tag,
          matchType: r.matchType,
          toggleTransaction: r.toggleTransaction,
          replaceDescription: r.replaceDescription || undefined,
        })),
      );
    } catch (err) {
      console.error("Failed to save tag rules:", err);
      setErrorMsg(`Failed to save tag rules: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    let checkedCount = 0;
    let matchedCount = 0;
    setImportRows((prev) =>
      prev.map((row) => {
        // Skip rows that already had rules applied
        if (row.rulesApplied) {
          return row;
        }

        let description = row.description;
        let type = row.type;
        const newTags = [...row.suggestedTags];
        let anyRuleMatched = false;

        for (const rule of activeRules) {
          let matched = false;

          try {
            if (rule.matchType === "substring") {
              matched = description.toLowerCase().includes(rule.substring.toLowerCase());
            } else if (rule.matchType === "full_string") {
              matched = description.toLowerCase() === rule.substring.toLowerCase();
            } else if (rule.matchType === "regex") {
              const regex = new RegExp(rule.substring, "i");
              matched = regex.test(description);
            }
          } catch (err) {
            console.error(`Invalid regex in rule: ${rule.substring}`, err);
            matched = false;
          }

          if (matched) {
            anyRuleMatched = true;
            if (!newTags.includes(rule.tag)) {
              newTags.push(rule.tag);
            }
            if (rule.replaceDescription.trim()) {
              description = rule.replaceDescription;
            }
          }
        }

        checkedCount++;
        if (anyRuleMatched) matchedCount++;
        return { ...row, description, type, suggestedTags: newTags, rulesApplied: anyRuleMatched };
      }),
    );
    setStatusMsg(`Applied ${activeRules.length} tag rule(s) to ${checkedCount} unchecked row(s). ${matchedCount} row(s) matched.`);
  }, [tagRules, profileId]);

  // ─── DB columns for mapping dropdown ─────────────────────────────

  const dbColumns = [
    { value: "type", label: "Type" },
    { value: "amount", label: "Amount" },
    { value: "description", label: "Description" },
    { value: "transaction_date", label: "Transaction Date" },
    { value: "reference", label: "Reference" },
    { value: "ignore", label: "— Ignore —" },
  ];

  // ─── Render ──────────────────────────────────────────────────────

  const includedCount = importRows.filter((r) => !r.excluded).length;
  const untaggedCount = importRows.filter((r) => !r.excluded && r.suggestedTags.length === 0).length;
  const duplicateCount = importRows.filter((r) => r.duplicate).length;

  const sortedRows = sortByUntagged
    ? [...importRows].sort((a, b) => {
        const aUntagged = a.suggestedTags.length === 0 ? 0 : 1;
        const bUntagged = b.suggestedTags.length === 0 ? 0 : 1;
        return aUntagged - bUntagged;
      })
    : importRows;

  const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayRows = sortedRows.slice(startIndex, startIndex + itemsPerPage);

  // Filter tag rules by search query
  const filteredTagRules = tagRules.filter((rule) => {
    if (!tagRulesSearch.trim()) return true;
    const search = tagRulesSearch.toLowerCase();
    return (
      rule.substring.toLowerCase().includes(search) ||
      rule.replaceDescription.toLowerCase().includes(search)
    );
  });

  // Calculate match count for each rule
  const getRuleMatchCount = (rule: TagRule): number => {
    if (!rule.substring.trim()) return 0;

    return importRows.filter((row) => {
      const description = row.description;
      try {
        if (rule.matchType === "substring") {
          return description.toLowerCase().includes(rule.substring.toLowerCase());
        } else if (rule.matchType === "full_string") {
          return description.toLowerCase() === rule.substring.toLowerCase();
        } else if (rule.matchType === "regex") {
          const regex = new RegExp(rule.substring, "i");
          return regex.test(description);
        }
      } catch (err) {
        return false;
      }
      return false;
    }).length;
  };

  // Calculate total affected records if rules were applied
  const getAffectedRecordsCount = (): number => {
    const activeRules = tagRules.filter((r) => r.substring.trim() && r.tag.trim());
    if (activeRules.length === 0) return 0;

    return importRows.filter((row) => {
      if (row.rulesApplied) return false; // Skip already checked rows

      const description = row.description;
      return activeRules.some((rule) => {
        try {
          if (rule.matchType === "substring") {
            return description.toLowerCase().includes(rule.substring.toLowerCase());
          } else if (rule.matchType === "full_string") {
            return description.toLowerCase() === rule.substring.toLowerCase();
          } else if (rule.matchType === "regex") {
            const regex = new RegExp(rule.substring, "i");
            return regex.test(description);
          }
        } catch (err) {
          return false;
        }
        return false;
      });
    }).length;
  };

  const activeRulesCount = tagRules.filter((r) => r.substring.trim() && r.tag.trim()).length;
  const affectedRecordsCount = getAffectedRecordsCount();

  return (
    <div className="csv-import">
      <div className="csv-import__header">
        <h2>Import Bank Transactions</h2>
        <div className="csv-import__steps">
          <span className={`csv-import__step ${step === "upload" ? "active" : "done"}`}>
            1. Upload
          </span>
          <span className="csv-import__step-arrow">→</span>
          <span className={`csv-import__step ${step === "mapping" ? "active" : step === "review" ? "done" : ""}`}>
            2. Map Columns
          </span>
          <span className="csv-import__step-arrow">→</span>
          <span className={`csv-import__step ${step === "review" ? "active" : ""}`}>
            3. Review & Import
          </span>
        </div>
      </div>

      {/* Status / Error messages */}
      {statusMsg && (
        <div className="csv-import__status">{statusMsg}</div>
      )}
      {errorMsg && (
        <div className="csv-import__error">{errorMsg}</div>
      )}

      {/* ── Upload Step ── */}
      {step === "upload" && (
        <div className="csv-import__upload-area">
          <div
            className="csv-import__dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="csv-import__dropzone-icon">📄</div>
            <div className="csv-import__dropzone-text">
              {fileName ? (
                <>Selected: <strong>{fileName}</strong></>
              ) : (
                <>Click to select a CSV file</>
              )}
            </div>
            <div className="csv-import__dropzone-hint">
              Supports standard bank export CSV files
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          {loading && (
            <div className="csv-import__spinner">Processing...</div>
          )}
        </div>
      )}

      {/* ── Mapping Step ── */}
      {step === "mapping" && (
        <div className="csv-import__mapping">
          <p className="csv-import__mapping-info">
            {csvRows.length} rows found. Map CSV columns to transaction fields:
          </p>

          <table className="csv-import__mapping-table">
            <thead>
              <tr>
                <th>CSV Column</th>
                <th>Sample Value</th>
                <th>Maps To</th>
              </tr>
            </thead>
            <tbody>
              {csvHeaders.map((header) => {
                const m = mapping.find((mm) => mm.csvColumn === header);
                const sample = csvRows[0]?.[header] || "";
                return (
                  <tr key={header}>
                    <td className="csv-import__mapping-col">{header}</td>
                    <td className="csv-import__mapping-sample">{sample}</td>
                    <td>
                      <select
                        className="csv-import__select"
                        value={m?.dbColumn || "ignore"}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                      >
                        {dbColumns.map((col) => (
                          <option key={col.value} value={col.value}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="csv-import__prompt-panel">
            <button
              className="csv-import__prompt-toggle"
              onClick={() => setMappingPromptOpen(!mappingPromptOpen)}
            >
              {mappingPromptOpen ? "Hide" : "Show"} Mapping Prompt
              <span className="csv-import__prompt-toggle-icon">{mappingPromptOpen ? "\u25B2" : "\u25BC"}</span>
            </button>
            {mappingPromptOpen && (
              <div className="csv-import__prompt-editor">
                <label className="csv-import__prompt-label">Prompt sent to Ollama for column mapping:</label>
                <textarea
                  className="csv-import__prompt-textarea"
                  value={mappingPrompt}
                  onChange={(e) => setMappingPrompt(e.target.value)}
                  rows={12}
                />
                <div className="csv-import__prompt-actions">
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={async () => {
                      const p = await window.api.csvImport.buildMappingPrompt(csvHeaders, csvRows.slice(0, 5));
                      setMappingPrompt(p);
                    }}
                  >
                    Reset to Default
                  </button>
                  <button
                    className="csv-import__btn csv-import__btn--primary"
                    onClick={handleRunMappingPrompt}
                    disabled={mappingPromptLoading || !mappingPrompt.trim()}
                  >
                    {mappingPromptLoading ? "Running..." : "Run Prompt"}
                  </button>
                </div>
                {mappingPromptResponse && (
                  <div className="csv-import__prompt-response">
                    <label className="csv-import__prompt-label">Ollama Response:</label>
                    <pre className="csv-import__prompt-response-text">{mappingPromptResponse}</pre>
                    <button
                      className="csv-import__btn csv-import__btn--primary"
                      onClick={handleApplyMappingResponse}
                    >
                      Apply Response to Mapping
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="csv-import__inverse-option">
            <label>
              <input
                type="checkbox"
                checked={inverseTypes}
                onChange={(e) => setInverseTypes(e.target.checked)}
              />
              <span>
                Inverse deposit/withdrawal
                <span style={{ display: "block", fontSize: "12px", color: "#888", fontWeight: 400, marginTop: "2px" }}>
                  Enable for credit card statements where charges appear as positive
                </span>
              </span>
            </label>
          </div>

          <div className="csv-import__actions">
            <button className="csv-import__btn csv-import__btn--secondary" onClick={handleReset}>
              ← Back
            </button>
            <button
              className="csv-import__btn csv-import__btn--secondary"
              onClick={() => handleApplyMapping(true)}
              disabled={loading || !mapping.some((m) => m.dbColumn !== "ignore")}
              title="Skip AI classification and use column mapping only"
            >
              Skip Classification →
            </button>
            <button
              className="csv-import__btn csv-import__btn--primary"
              onClick={() => handleApplyMapping(false)}
              disabled={loading || !mapping.some((m) => m.dbColumn !== "ignore")}
            >
              {loading ? "Processing..." : "Apply Mapping & Classify →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Review Step ── */}
      {step === "review" && !commitResult && (
        <div className="csv-import__review">
          <div className="csv-import__review-toolbar">
            <div className="csv-import__review-counts">
              <span className="csv-import__review-count">
                {includedCount} of {importRows.length} selected
              </span>
              {untaggedCount > 0 && (
                <span className="csv-import__untagged-count">
                  {untaggedCount} untagged
                </span>
              )}
              {duplicateCount > 0 && (
                <span className="csv-import__duplicate-count">
                  {duplicateCount} duplicate{duplicateCount !== 1 ? "s" : ""}
                </span>
              )}
              {activeRulesCount > 0 && (
                <span className="csv-import__rules-info" title={`${activeRulesCount} active rule${activeRulesCount !== 1 ? 's' : ''} would affect ${affectedRecordsCount} unchecked transaction${affectedRecordsCount !== 1 ? 's' : ''}`}>
                  {activeRulesCount} rule{activeRulesCount !== 1 ? "s" : ""} → {affectedRecordsCount} match{affectedRecordsCount !== 1 ? "es" : ""}
                </span>
              )}
            </div>
            <div className="csv-import__review-actions">
              <button
                className="csv-import__btn csv-import__btn--secondary"
                onClick={addTagRule}
                title="Add a new tag rule"
              >
                + Add Rule
              </button>
              <button
                className="csv-import__btn csv-import__btn--secondary"
                onClick={() => applyTagRules()}
                disabled={activeRulesCount === 0}
                title={activeRulesCount > 0 ? `Apply ${activeRulesCount} rule${activeRulesCount !== 1 ? 's' : ''} to ${affectedRecordsCount} transaction${affectedRecordsCount !== 1 ? 's' : ''}` : "No active rules to apply"}
              >
                Apply Rules
              </button>
              <button className="csv-import__btn csv-import__btn--secondary" onClick={handleReset}>
                ← Start Over
              </button>
              <button className="csv-import__btn csv-import__btn--secondary" onClick={() => setStep("mapping")}>
                ← Back to Mapping
              </button>
              <button
                className="csv-import__btn csv-import__btn--primary"
                onClick={handleCommit}
                disabled={loading || includedCount === 0}
              >
                {loading ? "Importing..." : `Import ${includedCount} Transactions`}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="csv-import__tabs">
            <button
              className={`csv-import__tab ${reviewTab === "transactions" ? "csv-import__tab--active" : ""}`}
              onClick={() => setReviewTab("transactions")}
            >
              Transactions ({importRows.length})
            </button>
            <button
              className={`csv-import__tab ${reviewTab === "rules" ? "csv-import__tab--active" : ""}`}
              onClick={() => setReviewTab("rules")}
            >
              Tag Rules ({tagRules.length})
            </button>
            <button
              className={`csv-import__tab ${reviewTab === "classify" ? "csv-import__tab--active" : ""}`}
              onClick={() => setReviewTab("classify")}
            >
              Classification Prompt
            </button>
          </div>

          {/* Transactions Tab */}
          {reviewTab === "transactions" && (
            <>
              <div className="csv-import__tab-toolbar">
                <button
                  className={`csv-import__btn-sort ${sortByUntagged ? "csv-import__btn-sort--active" : ""}`}
                  onClick={() => setSortByUntagged((v) => !v)}
                  title="Sort untagged rows to top"
                >
                  {sortByUntagged ? "Sorted: untagged first" : "Sort by untagged"}
                </button>
                {duplicateCount > 0 && (
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={toggleExcludeDuplicates}
                    title="Toggle exclude all duplicates"
                  >
                    {importRows.filter((r) => r.duplicate).every((r) => r.excluded)
                      ? "Include Duplicates"
                      : "Exclude Duplicates"}
                  </button>
                )}
              </div>

              <div className="csv-import__table-wrapper">
            <table className="csv-import__table">
              <thead>
                <tr>
                  <th className="csv-import__th-check">
                    <input
                      type="checkbox"
                      checked={importRows.length > 0 && importRows.every((r) => !r.excluded)}
                      onChange={toggleExcludeAll}
                      title="Select/deselect all"
                    />
                  </th>
                  <th>#</th>
                  <th>Rules</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>Suggested Tags</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row) => (
                  <tr
                    key={row._rowIndex}
                    className={`${row.excluded ? "csv-import__row--excluded" : ""} ${row.duplicate ? "csv-import__row--duplicate" : ""}`}
                  >
                    <td className="csv-import__td-check">
                      <input
                        type="checkbox"
                        checked={!row.excluded}
                        onChange={() => toggleExclude(row._rowIndex)}
                      />
                    </td>
                    <td className="csv-import__td-num">
                      {row._rowIndex + 1}
                      {row.duplicate && (
                        <span className="csv-import__duplicate-badge" title="Duplicate transaction (same date & amount)">
                          ⚠
                        </span>
                      )}
                    </td>
                    <td className="csv-import__td-rules">
                      {row.rulesApplied && (
                        <span className="csv-import__rules-badge" title="A tag rule matched this row">
                          ✓
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="csv-import__input csv-import__input--date"
                        value={row.transaction_date}
                        onChange={(e) =>
                          updateRow(row._rowIndex, "transaction_date", e.target.value)
                        }
                        disabled={row.excluded}
                      />
                    </td>
                    <td>
                      <select
                        className="csv-import__select csv-import__select--type"
                        value={row.type}
                        onChange={(e) =>
                          updateRow(row._rowIndex, "type", e.target.value as TransactionType)
                        }
                        disabled={row.excluded}
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="csv-import__input csv-import__input--amount"
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(row._rowIndex, "amount", parseFloat(e.target.value) || 0)
                        }
                        disabled={row.excluded}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="csv-import__input csv-import__input--desc"
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row._rowIndex, "description", e.target.value)
                        }
                        disabled={row.excluded}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="csv-import__input csv-import__input--ref"
                        value={row.reference}
                        onChange={(e) =>
                          updateRow(row._rowIndex, "reference", e.target.value)
                        }
                        disabled={row.excluded}
                      />
                    </td>
                    <td className="csv-import__td-tags">
                      {row.suggestedTags.length > 0 ? (
                        row.suggestedTags.map((tag, i) => (
                          <span key={i} className="csv-import__tag">{tag}</span>
                        ))
                      ) : (
                        <span className="csv-import__no-tags">—</span>
                      )}
                    </td>
                    <td className="csv-import__td-action">
                      <button
                        className="csv-import__btn-reclassify"
                        onClick={() => handleClassifySingle(row._rowIndex)}
                        disabled={row.excluded || classifyingRow !== null}
                        title="Reclassify this transaction with AI"
                      >
                        {classifyingRow === row._rowIndex ? "..." : "Reclassify"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {importRows.length > 50 && (
            <div className="csv-import__pagination">
              <div className="csv-import__pagination-info">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedRows.length)} of {sortedRows.length} rows
              </div>
              <div className="csv-import__pagination-controls">
                <select
                  className="csv-import__select"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={200}>200 per page</option>
                  <option value={500}>500 per page</option>
                </select>
                <div className="csv-import__pagination-buttons">
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    ««
                  </button>
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  <span className="csv-import__pagination-page">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    »»
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          )}

          {/* Tag Rules Tab */}
          {reviewTab === "rules" && (
            <div className="csv-import__tab-content" ref={tagRulesContainerRef}>
              <div className="csv-import__tag-rules-editor">
                <p className="csv-import__tag-rules-hint">
                  Match text in descriptions to auto-assign tags and optionally replace the description.
                </p>
                {tagRules.length > 3 && (
                  <input
                    type="text"
                    className="csv-import__input csv-import__tag-rules-search"
                    placeholder="Search rules by match text or replacement..."
                    value={tagRulesSearch}
                    onChange={(e) => setTagRulesSearch(e.target.value)}
                  />
                )}
                <button
                  className="csv-import__btn csv-import__btn--secondary csv-import__btn-add-rule-top"
                  onClick={addTagRule}
                  title="Add a new tag rule at the top"
                >
                  + Add Rule
                </button>
                {filteredTagRules.map((rule) => {
                  const actualIndex = tagRules.indexOf(rule);
                  const matchCount = getRuleMatchCount(rule);
                  return (
                    <div key={actualIndex} className="csv-import__tag-rule-row">
                      <input
                        type="text"
                        className="csv-import__input csv-import__tag-rule-input"
                        placeholder="Text to match..."
                        value={rule.substring}
                        onChange={(e) => updateTagRule(actualIndex, "substring", e.target.value)}
                      />
                      <select
                        className="csv-import__select csv-import__tag-rule-select"
                        value={rule.matchType}
                        onChange={(e) => updateTagRule(actualIndex, "matchType", e.target.value as MatchType)}
                      >
                        <option value="substring">Substring</option>
                        <option value="full_string">Full String</option>
                        <option value="regex">Regex</option>
                      </select>
                      <input
                        type="text"
                        className="csv-import__input csv-import__tag-rule-input csv-import__tag-rule-input--tag"
                        placeholder="Tag name"
                        value={rule.tag}
                        onChange={(e) => updateTagRule(actualIndex, "tag", e.target.value)}
                      />
                      <span className={`csv-import__tag-rule-match-count ${matchCount === 0 ? 'csv-import__tag-rule-match-count--empty' : ''}`} title={`${matchCount} transaction${matchCount !== 1 ? 's' : ''} match this rule`}>
                        {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches'}
                      </span>
                      <input
                        type="text"
                        className="csv-import__input csv-import__tag-rule-input csv-import__tag-rule-input--desc"
                        placeholder="Replace description with... (optional)"
                        value={rule.replaceDescription}
                        onChange={(e) => updateTagRule(actualIndex, "replaceDescription", e.target.value)}
                      />
                      <button
                        className="csv-import__btn-rule-remove"
                        onClick={() => removeTagRule(actualIndex)}
                        title="Remove rule"
                      >
                        x
                      </button>
                    </div>
                  );
                })}
                {filteredTagRules.length === 0 && tagRulesSearch.trim() && (
                  <p className="csv-import__tag-rules-no-results">
                    No rules match your search.
                  </p>
                )}
                {tagRules.length === 0 && (
                  <p className="csv-import__tag-rules-hint" style={{ textAlign: 'center', marginTop: '20px' }}>
                    No rules defined yet. Use the "+ Add Rule" button above to create your first rule.
                  </p>
                )}
                {tagRules.length > 0 && (
                  <button
                    className="csv-import__btn csv-import__btn--secondary csv-import__btn-add-rule-bottom"
                    onClick={addTagRule}
                    title="Add a new tag rule at the top"
                  >
                    + Add Rule
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Classification Prompt Tab */}
          {reviewTab === "classify" && (
            <div className="csv-import__tab-content">
              <div className="csv-import__prompt-editor">
                <label className="csv-import__prompt-label">Prompt sent to Ollama for transaction classification:</label>
                <textarea
                  className="csv-import__prompt-textarea"
                  value={classifyPrompt}
                  onChange={(e) => setClassifyPrompt(e.target.value)}
                  rows={12}
                />
                <div className="csv-import__prompt-actions">
                  <button
                    className="csv-import__btn csv-import__btn--secondary"
                    onClick={async () => {
                      let tags: { id: number; name: string }[] = [];
                      try { tags = await window.api.tags.list(profileId); } catch { /* no tags */ }
                      const p = await window.api.csvImport.buildClassifyPrompt(
                        importRows.map((r) => ({ _rowIndex: r._rowIndex, description: r.description, amount: r.amount, type: r.type })),
                        tags,
                      );
                      setClassifyPrompt(p);
                    }}
                  >
                    Reset to Default
                  </button>
                  <button
                    className="csv-import__btn csv-import__btn--primary"
                    onClick={handleRunClassifyPrompt}
                    disabled={classifyPromptLoading || !classifyPrompt.trim()}
                  >
                    {classifyPromptLoading ? "Running..." : "Run Prompt"}
                  </button>
                </div>
                {classifyPromptResponse && (
                  <div className="csv-import__prompt-response">
                    <label className="csv-import__prompt-label">Ollama Response:</label>
                    <pre className="csv-import__prompt-response-text">{classifyPromptResponse}</pre>
                    <button
                      className="csv-import__btn csv-import__btn--primary"
                      onClick={handleApplyClassifyResponse}
                    >
                      Apply Response to Classifications
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {commitResult && (
        <div className="csv-import__result">
          <div className={`csv-import__result-box ${commitResult.errors.length > 0 ? "csv-import__result-box--partial" : "csv-import__result-box--success"}`}>
            <h3>Import Complete</h3>
            <p className="csv-import__result-count">
              ✓ {commitResult.imported} transaction{commitResult.imported !== 1 ? "s" : ""} imported successfully
            </p>
            {commitResult.errors.length > 0 && (
              <div className="csv-import__result-errors">
                <p>⚠ {commitResult.errors.length} error{commitResult.errors.length !== 1 ? "s" : ""}:</p>
                <ul>
                  {commitResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="csv-import__actions" style={{ marginTop: 16 }}>
            <button className="csv-import__btn csv-import__btn--secondary" onClick={handleReset}>
              Import Another File
            </button>
            <button className="csv-import__btn csv-import__btn--primary" onClick={onDone}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
