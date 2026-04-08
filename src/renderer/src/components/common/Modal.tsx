import React from "react";

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  title,
  onClose,
  children,
}: ModalProps): React.JSX.Element | null {
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
          backgroundColor: "#252526",
          border: "1px solid #454545",
          borderRadius: "5px",
          width: "500px",
          maxWidth: "90%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "15px 20px",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            fontSize: "1.1em",
          }}
        >
          <span>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              fontSize: "1.2em",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
