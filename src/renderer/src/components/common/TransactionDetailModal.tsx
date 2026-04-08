import React from "react";
import { TransactionDetail } from "../transactions/TransactionDetail";

interface TransactionDetailModalProps {
  isOpen: boolean;
  transactionId: number;
  profileId: number;
  onClose: () => void;
  onOpenInTab?: (transactionId: number) => void;
}

export function TransactionDetailModal({
  isOpen,
  transactionId,
  profileId,
  onClose,
  onOpenInTab,
}: TransactionDetailModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#1e1e1e",
          border: "1px solid #454545",
          borderRadius: 8,
          width: 680,
          maxWidth: "90%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {onOpenInTab && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "8px 12px 0",
            }}
          >
            <button
              onClick={() => {
                onOpenInTab(transactionId);
                onClose();
              }}
              style={{
                padding: "4px 10px",
                background: "#2d2d2d",
                border: "1px solid #3e3e42",
                color: "#cccccc",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0e639c";
                e.currentTarget.style.borderColor = "#0e639c";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#2d2d2d";
                e.currentTarget.style.borderColor = "#3e3e42";
                e.currentTarget.style.color = "#cccccc";
              }}
            >
              Open in Tab
            </button>
          </div>
        )}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <TransactionDetail
            transactionId={transactionId}
            profileId={profileId}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
