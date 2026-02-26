import { useEffect, useState } from "react";
import { onDataChange, emitDataChange } from "../dataEvents";

type ShoppingListData = {
  id: number;
  name: string;
  status: string;
  transaction_id: number | null;
  estimated_total: number | null;
  created_at: string;
  updated_at: string;
};

type ShoppingItem = {
  id: number;
  shopping_list_id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  estimated_price: number | null;
  checked: number;
  created_at: string;
};

type Transaction = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
};

interface ShoppingListProps {
  shoppingListId: number;
  profileId: number;
  onClose: () => void;
}

export function ShoppingList({
  shoppingListId,
  profileId,
  onClose,
}: ShoppingListProps) {
  const [list, setList] = useState<ShoppingListData | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Add item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  useEffect(() => {
    loadData();
    const unsub = onDataChange("shopping-lists", loadData);
    return unsub;
  }, [shoppingListId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    try {
      setLoading(true);
      const listData = await window.api.shoppingLists.get(shoppingListId);
      setList(listData);
      setNameInput(listData.name);
      const itemsData = await window.api.shoppingLists.getItems(shoppingListId);
      setItems(itemsData);
    } catch (err) {
      console.error("Error loading shopping list:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    try {
      await window.api.shoppingLists.update(shoppingListId, { name: nameInput.trim() });
      emitDataChange("shopping-lists");
      setEditingName(false);
    } catch (err) {
      console.error("Error updating name:", err);
    }
  }

  async function handleToggleChecked(item: ShoppingItem) {
    try {
      await window.api.shoppingLists.updateItem(item.id, {
        checked: item.checked ? 0 : 1,
      });
      emitDataChange("shopping-lists");
    } catch (err) {
      console.error("Error toggling item:", err);
    }
  }

  async function handleDeleteItem(itemId: number) {
    try {
      await window.api.shoppingLists.deleteItem(itemId);
      emitDataChange("shopping-lists");
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim()) return;
    try {
      await window.api.shoppingLists.addItem({
        shoppingListId,
        name: newItemName.trim(),
        quantity: newItemQuantity ? parseFloat(newItemQuantity) : undefined,
        unit: newItemUnit.trim() || null,
        estimatedPrice: newItemPrice ? parseFloat(newItemPrice) : null,
      });
      emitDataChange("shopping-lists");
      setNewItemName("");
      setNewItemQuantity("");
      setNewItemUnit("");
      setNewItemPrice("");
    } catch (err) {
      console.error("Error adding item:", err);
    }
  }

  async function handleMarkComplete() {
    try {
      await window.api.shoppingLists.update(shoppingListId, { status: "completed" });
      emitDataChange("shopping-lists");
    } catch (err) {
      console.error("Error marking complete:", err);
    }
  }

  async function handleOpenLinkModal() {
    try {
      const txns = await window.api.transactions.list(profileId);
      setTransactions(txns);
      setShowLinkModal(true);
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  }

  async function handleLinkTransaction(transactionId: number) {
    try {
      await window.api.shoppingLists.linkTransaction(shoppingListId, transactionId);
      emitDataChange("shopping-lists");
      setShowLinkModal(false);
    } catch (err) {
      console.error("Error linking transaction:", err);
    }
  }

  const estimatedTotal = items.reduce(
    (sum, item) =>
      sum + (item.estimated_price ?? 0) * (item.quantity ?? 1),
    0,
  );

  const statusColor =
    list?.status === "completed"
      ? "#2da44e"
      : list?.status === "active"
        ? "#0969da"
        : "#656d76";

  if (loading) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Loading shopping list...</p>
      </div>
    );
  }

  if (!list) {
    return (
      <div style={{ padding: 20, color: "#fff" }}>
        <p>Shopping list not found.</p>
        <button
          onClick={onClose}
          style={{
            padding: "8px 16px",
            background: "#333",
            color: "#ddd",
            border: "1px solid #555",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        color: "#fff",
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          {editingName ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                autoFocus
                style={{
                  padding: "6px 10px",
                  background: "#252525",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: 4,
                  fontSize: 18,
                  fontWeight: "bold",
                }}
              />
              <button
                onClick={handleSaveName}
                style={{
                  padding: "6px 12px",
                  background: "#2da44e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setNameInput(list.name);
                  setEditingName(false);
                }}
                style={{
                  padding: "6px 12px",
                  background: "#333",
                  color: "#ddd",
                  border: "1px solid #555",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h2
              style={{ margin: 0, marginBottom: 8, cursor: "pointer" }}
              onClick={() => setEditingName(true)}
            >
              {list.name}
            </h2>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                borderRadius: 10,
                fontSize: 13,
                background: statusColor + "22",
                color: statusColor,
                border: `1px solid ${statusColor}`,
              }}
            >
              {list.status}
            </span>
            {list.transaction_id && (
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 10,
                  fontSize: 13,
                  background: "#0969da22",
                  color: "#0969da",
                  border: "1px solid #0969da",
                }}
              >
                Linked Transaction #{list.transaction_id}
              </span>
            )}
            <span style={{ color: "#999", fontSize: 14 }}>
              Estimated Total: ${estimatedTotal.toFixed(2)}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {list.status !== "completed" && (
            <button
              onClick={handleMarkComplete}
              style={{
                padding: "8px 16px",
                background: "#2da44e",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={handleOpenLinkModal}
            style={{
              padding: "8px 16px",
              background: "#0969da",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Link Transaction
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#333",
              color: "#ddd",
              border: "1px solid #555",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div
        style={{
          background: "#252525",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0" }}>Items</h3>
        {items.length === 0 ? (
          <p style={{ color: "#999" }}>No items yet. Add one below.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#999", width: 40 }}></th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#999" }}>Name</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#999" }}>Quantity</th>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#999" }}>Unit</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "#999" }}>Est. Price</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#999", width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #333",
                    opacity: item.checked ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: "8px 12px" }}>
                    <input
                      type="checkbox"
                      checked={!!item.checked}
                      onChange={() => handleToggleChecked(item)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.quantity ?? "-"}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.unit ?? "-"}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.estimated_price != null
                      ? `$${Number(item.estimated_price).toFixed(2)}`
                      : "-"}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      style={{
                        padding: "4px 8px",
                        background: "transparent",
                        color: "#ff6b6b",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        textDecoration: "underline",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add Item Form */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 2, minWidth: 150 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Name
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddItem();
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 80 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Quantity
            </label>
            <input
              type="number"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              placeholder="Qty"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 80 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Unit
            </label>
            <input
              type="text"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              placeholder="e.g. lbs"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ display: "block", fontSize: 12, color: "#999", marginBottom: 4 }}>
              Est. Price
            </label>
            <input
              type="number"
              step="0.01"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              placeholder="$0.00"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#1e1e1e",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={handleAddItem}
            disabled={!newItemName.trim()}
            style={{
              padding: "8px 16px",
              background: newItemName.trim() ? "#2da44e" : "#333",
              color: newItemName.trim() ? "#fff" : "#666",
              border: "none",
              borderRadius: 4,
              cursor: newItemName.trim() ? "pointer" : "not-allowed",
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            Add Item
          </button>
        </div>
      </div>

      {/* Link Transaction Modal */}
      {showLinkModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowLinkModal(false)}
        >
          <div
            style={{
              background: "#1e1e1e",
              border: "1px solid #444",
              borderRadius: 8,
              padding: 24,
              minWidth: 450,
              maxWidth: 550,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0" }}>Link to Transaction</h3>
            {transactions.length === 0 ? (
              <p style={{ color: "#999" }}>No transactions found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {transactions.map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() => handleLinkTransaction(txn.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#2a2a2a",
                      border: "1px solid #444",
                      borderRadius: 6,
                      color: "#ddd",
                      cursor: "pointer",
                      fontSize: 14,
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#0969da";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#444";
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        #{txn.id} - {txn.description || txn.type}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {new Date(txn.transaction_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      style={{
                        color: txn.type === "deposit" ? "#2da44e" : "#cf222e",
                        fontWeight: "bold",
                      }}
                    >
                      ${Number(txn.amount).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLinkModal(false)}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                background: "#333",
                color: "#ddd",
                border: "1px solid #555",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
