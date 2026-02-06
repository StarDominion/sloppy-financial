import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { onDataChange, emitDataChange } from "../dataEvents";

interface AutoBillsListProps {
  onOpenAutoBill: (bill?: any) => void;
  profileId: number;
}

type Tag = {
  id: number;
  name: string;
  color: string;
  created_at: string;
};

type AutoBillWithTags = any & {
  tags?: Tag[];
};

export function AutoBillsList({
  onOpenAutoBill,
  profileId,
}: AutoBillsListProps): React.JSX.Element {
  const [autoBills, setAutoBills] = useState<AutoBillWithTags[]>([]);
  const [filteredBills, setFilteredBills] = useState<AutoBillWithTags[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | null>(
    null,
  );

  // State for manual generation from auto bill
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [generationDate, setGenerationDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    loadData();
    loadTags();
    return onDataChange("auto-bills", () => {
      loadData();
      loadTags();
    });
  }, []);

  useEffect(() => {
    filterBills();
  }, [autoBills, selectedTagFilter]);

  const loadTags = async () => {
    try {
      const tags = await window.api.tags.list(profileId);
      setAllTags(tags);
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  };

  const loadData = async () => {
    const autos = await window.api.bills.listAutomatic(profileId);
    // Load tags for each automatic bill
    const autosWithTags = await Promise.all(
      autos.map(async (auto) => {
        try {
          const tags = await window.api.tags.getForAutomaticBill(auto.id);
          return { ...auto, tags };
        } catch (err) {
          console.error("Error loading tags for auto bill:", auto.id, err);
          return { ...auto, tags: [] };
        }
      }),
    );
    setAutoBills(autosWithTags);
  };

  const filterBills = () => {
    let result = [...autoBills];

    // Filter by tag
    if (selectedTagFilter !== null) {
      result = result.filter(
        (bill) =>
          bill.tags &&
          bill.tags.some((tag: Tag) => tag.id === selectedTagFilter),
      );
    }

    setFilteredBills(result);
  };

  const handleGenerateManualFromAuto = async () => {
    if (!generatingId) return;
    await window.api.bills.generateManual(generatingId, generationDate);
    setGeneratingId(null);
    emitDataChange("auto-bills");
    emitDataChange("bills");
    loadData();
  };

  const handleDeleteAuto = async (id: number) => {
    await window.api.bills.deleteAutomatic(id);
    emitDataChange("auto-bills");
    loadData();
  };

  return (
    <div className="auto-bills">
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
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
        <button
          onClick={() => onOpenAutoBill()}
          style={{
            padding: "8px 16px",
            background: "#2da44e",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          + Add New Auto Bill
        </button>
      </div>

      <Modal
        isOpen={generatingId !== null}
        title="Generate Bill Instance"
        onClose={() => setGeneratingId(null)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <p style={{ margin: 0, color: "#ccc" }}>
            Select the Due Date for this bill instance:
          </p>
          <input
            type="date"
            style={{
              padding: 8,
              background: "#1e1e1e",
              border: "1px solid #444",
              color: "#fff",
            }}
            value={generationDate}
            onChange={(e) => setGenerationDate(e.target.value)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 10,
            }}
          >
            <button
              onClick={() => setGeneratingId(null)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid #555",
                color: "#ccc",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateManualFromAuto}
              style={{
                padding: "8px 16px",
                background: "#2da44e",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Generate
            </button>
          </div>
        </div>
      </Modal>

      <table
        style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ padding: 10 }}>Name</th>
            <th>Amount</th>
            <th>Desc</th>
            <th>Gen Days</th>
            <th>Due Days</th>
            <th>Tags</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredBills.map((bill) => (
            <tr key={bill.id} style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: 10 }}>{bill.name}</td>
              <td>${bill.amount}</td>
              <td
                style={{
                  fontSize: "0.8rem",
                  color: "#aaa",
                  maxWidth: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {bill.description}
              </td>
              <td>{bill.generation_days}</td>
              <td>{bill.due_dates || bill.due_day}</td>
              <td>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {bill.tags && bill.tags.length > 0 ? (
                    bill.tags.map((tag: Tag) => (
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
                    ))
                  ) : (
                    <span style={{ color: "#555", fontSize: "0.8rem" }}>-</span>
                  )}
                </div>
              </td>
              <td>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    onClick={() => setGeneratingId(bill.id)}
                    title="Generate Now"
                    style={{
                      color: "#2da44e",
                      background: "transparent",
                      border: "1px solid #2da44e",
                      cursor: "pointer",
                      padding: "2px 5px",
                      fontSize: "0.8rem",
                      borderRadius: 3,
                    }}
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => onOpenAutoBill(bill)}
                    style={{
                      color: "#007acc",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAuto(bill.id)}
                    style={{
                      color: "#ff6b6b",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredBills.length === 0 && (
        <div
          style={{
            color: "#666",
            fontStyle: "italic",
            textAlign: "center",
            padding: 20,
          }}
        >
          {autoBills.length === 0
            ? "No automatic bills configured"
            : "No bills match the selected tag"}
        </div>
      )}
    </div>
  );
}
