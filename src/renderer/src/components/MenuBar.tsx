import React, { useState, useEffect, useRef } from "react";

interface MenuBarProps {
  onAction: (action: string) => void;
}

export function MenuBar({ onAction }: MenuBarProps): React.JSX.Element {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menus = {
    file: [
      { label: "Workspace Settings", action: "open-settings" },
      { label: "Switch Profile", action: "switch-profile" },
      { type: "separator" },
      { label: "Close Tab", action: "close-tab" },
      { type: "separator" },
      { label: "Exit", action: "exit" },
    ],
    notes: [
      { label: "New Note", action: "new-note" },
      { type: "separator" },
      { label: "View All Notes", action: "open-notes-list" },
    ],
    bills: [
      { label: "Bills", action: "open-bills" },
      { label: "Automatic Bills", action: "open-auto-bills" },
      { label: "Monthly Summary", action: "open-monthly-summary" },
      { type: "separator" },
      { label: "New Manual Bill", action: "new-manual-bill" },
      { label: "New Auto Bill", action: "new-auto-bill" },
    ],
    contacts: [
      { label: "View Contacts", action: "open-contacts" },
      { type: "separator" },
      { label: "New Contact", action: "new-contact" },
    ],
    pay: [
      { label: "Income", action: "open-payments" },
      { type: "separator" },
      { label: "New Payment", action: "new-payment" },
    ],
    invoices: [
      { label: "View Invoices", action: "open-invoices" },
      { type: "separator" },
      { label: "New Invoice", action: "new-invoice" },
    ],
    reminders: [
      { label: "View Reminders", action: "open-reminders" },
    ],
    transactions: [
      { label: "View Transactions", action: "open-transactions" },
      { label: "Analytics", action: "open-transaction-analytics" },
      { type: "separator" },
      { label: "New Transaction", action: "new-transaction" },
      { label: "Import CSV", action: "csv-import" },
    ],
    tax: [
      { label: "View Documents", action: "open-tax-documents" },
      { type: "separator" },
      { label: "Upload Document", action: "tax-upload" },
    ],
    view: [
      { label: "Toggle Fullscreen", action: "toggle-fullscreen" },
      { label: "Minimize", action: "minimize" },
    ],
    help: [{ label: "About", action: "about" }],
  };

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleAction = (action: string) => {
    onAction(action);
    setActiveMenu(null);
  };

  return (
    <div className="menubar" ref={menuRef}>
      <div className="menubar-logo">Sloppy Financial</div>
      {Object.entries(menus).map(([key, items]) => (
        <div key={key} className="menubar-item-container">
          <div
            className={`menubar-item ${activeMenu === key ? "active" : ""}`}
            onClick={() => handleMenuClick(key)}
            onMouseEnter={() => activeMenu && setActiveMenu(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </div>

          {activeMenu === key && (
            <div className="menubar-dropdown">
              {items.map((item, index) =>
                item.type === "separator" ? (
                  <div key={index} className="menubar-separator" />
                ) : (
                  <div
                    key={index}
                    className="menubar-dropdown-item"
                    onClick={() => handleAction(item.action!)}
                  >
                    {item.label}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
