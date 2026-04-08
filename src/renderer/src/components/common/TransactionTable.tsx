import React, { useState } from "react";
import { TransactionDetailModal } from "./TransactionDetailModal";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  reference: string | null;
  bill_name?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  profileId: number;
  maxHeight?: number | string;
}

export function TransactionTable({
  transactions,
  profileId,
  maxHeight = 400,
}: TransactionTableProps): React.JSX.Element {
  const [selectedTxnId, setSelectedTxnId] = useState<number | null>(null);

  return (
    <>
      {transactions.length === 0 ? (
        <div className="txn-table-empty">No transactions to display</div>
      ) : (
        <div className="txn-table-wrapper" style={{ maxHeight }}>
          <table className="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th className="txn-table-col-right">Amount</th>
                <th className="txn-table-col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id} className="txn-table-row" onClick={() => setSelectedTxnId(txn.id)}>
                  <td className="txn-table-col-nowrap">
                    {new Date(txn.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="txn-table-col-desc">{txn.description || "-"}</td>
                  <td>
                    <span className={`txn-table-type-badge ${txn.type}`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className={`txn-table-col-right ${txn.type === "deposit" ? "txn-table-amount-deposit" : "txn-table-amount-withdrawal"}`}>
                    ${Number(txn.amount).toFixed(2)}
                  </td>
                  <td className="txn-table-col-actions">
                    <button
                      className="txn-table-view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTxnId(txn.id);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDetailModal
        isOpen={selectedTxnId !== null}
        transactionId={selectedTxnId!}
        profileId={profileId}
        onClose={() => setSelectedTxnId(null)}
      />
    </>
  );
}
