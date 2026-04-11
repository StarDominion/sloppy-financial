import React from "react";
import { Modal } from "../common/Modal";

// Manually update on release
const GIT_COMMIT = "unknown";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps): React.JSX.Element {
  return (
    <Modal isOpen={isOpen} title="About Sloppy Financial" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, color: "#ddd" }}>
        <div style={{ fontSize: "1.1em", fontWeight: "bold" }}>
          Made by Star Dominion group
        </div>
        <div>Version 0.1</div>
        <div style={{ color: "#888", fontSize: "0.9em" }}>
          Commit: <span style={{ fontFamily: "monospace", color: "#aaa" }}>{GIT_COMMIT}</span>
        </div>
      </div>
    </Modal>
  );
}
