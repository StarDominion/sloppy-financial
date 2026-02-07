import { useState, useRef, useEffect, useCallback } from "react";
import { NotesEditor } from "./NotesEditor";
import { NotesList } from "./NotesList";
import { BillRecords } from "./BillRecords";
import { AutoBillsList } from "./AutoBillsList";
import { MenuBar } from "./MenuBar";
import { AutoBillForm } from "./AutoBillForm";
import { ManualBillForm } from "./ManualBillForm";
import BillDetail from "./BillDetail";
import Contacts from "./Contacts";
import ContactForm from "./ContactForm";
import ContactDetail from "./ContactDetail";
import { MonthlySummary } from "./MonthlySummary";
import { TaxUpload } from "./TaxUpload";
import { TaxDocumentsList } from "./TaxDocumentsList";
import { PaymentsList } from "./PaymentsList";
import { PaymentForm } from "./PaymentForm";
import { PaymentDetail } from "./PaymentDetail";
import { InvoicesList } from "./InvoicesList";
import { InvoiceForm } from "./InvoiceForm";
import { InvoiceDetail } from "./InvoiceDetail";
import { RemindersList } from "./RemindersList";
import { TransactionsList } from "./TransactionsList";
import { TransactionForm } from "./TransactionForm";
import { TransactionDetail } from "./TransactionDetail";
import { TransactionAnalytics } from "./TransactionAnalytics";
import { CsvImport } from "./CsvImport";
import { Settings } from "./Settings";

type TabType =
  | "notes"
  | "notes-list"
  | "bill-records"
  | "auto-bills"
  | "create-auto-bill"
  | "edit-auto-bill"
  | "create-manual-bill"
  | "bill-detail"
  | "monthly-summary"
  | "contacts"
  | "create-contact"
  | "edit-contact"
  | "contact-detail"
  | "tax-upload"
  | "tax-documents"
  | "payments"
  | "create-payment"
  | "payment-detail"
  | "invoices"
  | "create-invoice"
  | "invoice-detail"
  | "reminders"
  | "transactions"
  | "create-transaction"
  | "transaction-detail"
  | "transaction-analytics"
  | "csv-import";

interface Tab {
  id: string;
  type: TabType;
  title: string;
  data?: any; // e.g., noteId or initial content
}

interface WorkspaceProps {
  profileId: number;
  onSwitchProfile: () => void;
}

export function Workspace({ profileId, onSwitchProfile }: WorkspaceProps): React.JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [tabs, updateScrollButtons]);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons);
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons]);

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsRef.current) {
      e.preventDefault();
      tabsRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
    }
  };

  const addTab = (type: TabType, initialData?: any) => {
    const id = Date.now().toString() + Math.random().toString().slice(2);
    let title = "New Tab";

    switch (type) {
      case "notes":
        title = "New Note";
        break;
      case "notes-list":
        title = "Notes";
        break;
      case "bill-records":
        title = "Bills";
        break;
      case "auto-bills":
        title = "Automatic Bills";
        break;
      case "create-auto-bill":
        title = "New Auto Bill";
        break;
      case "edit-auto-bill":
        title = "Edit Auto Bill";
        break;
      case "create-manual-bill":
        title = "New Manual Bill";
        break;
      case "bill-detail":
        title = "Bill Details";
        break;
      case "monthly-summary":
        title = "Monthly Summary";
        break;
      case "contacts":
        title = "Contacts";
        break;
      case "create-contact":
        title = "New Contact";
        break;
      case "edit-contact":
        title = "Edit Contact";
        break;
      case "contact-detail":
        title = "Contact Details";
        break;
      case "tax-upload":
        title = "Upload Tax Document";
        break;
      case "tax-documents":
        title = "Tax Documents";
        break;
      case "payments":
        title = "Income & Payments";
        break;
      case "create-payment":
        title = "New Payment";
        break;
      case "payment-detail":
        title = "Payment Details";
        break;
      case "invoices":
        title = "Invoices";
        break;
      case "create-invoice":
        title = "New Invoice";
        break;
      case "invoice-detail":
        title = "Invoice Details";
        break;
      case "reminders":
        title = "Reminders";
        break;
      case "transactions":
        title = "Transactions";
        break;
      case "create-transaction":
        title = "New Transaction";
        break;
      case "transaction-detail":
        title = "Transaction Details";
        break;
      case "transaction-analytics":
        title = "Transaction Analytics";
        break;
      case "csv-import":
        title = "Import Transactions";
        break;
    }

    const newTab: Tab = {
      id,
      type,
      title,
      data: initialData,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(id);
  };

  const closeTab = (id: string) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(
        newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null,
      );
    }
  };

  const handleMenuBarAction = (action: string) => {
    switch (action) {
      case "new-note":
        addTab("notes");
        break;
      case "open-notes-list":
        addTab("notes-list");
        break;
      case "open-bills":
        addTab("bill-records");
        break;
      case "open-auto-bills":
        addTab("auto-bills");
        break;
      case "new-auto-bill":
        addTab("create-auto-bill");
        break;
      case "new-manual-bill":
        addTab("create-manual-bill");
        break;
      case "open-monthly-summary":
        addTab("monthly-summary");
        break;
      case "open-contacts":
        addTab("contacts");
        break;
      case "new-contact":
        addTab("create-contact");
        break;
      case "tax-upload":
        addTab("tax-upload");
        break;
      case "open-tax-documents":
        addTab("tax-documents");
        break;
      case "open-payments":
        addTab("payments");
        break;
      case "new-payment":
        addTab("create-payment");
        break;
      case "open-invoices":
        addTab("invoices");
        break;
      case "new-invoice":
        addTab("create-invoice");
        break;
      case "open-reminders":
        addTab("reminders");
        break;
      case "open-transactions":
        addTab("transactions");
        break;
      case "new-transaction":
        addTab("create-transaction");
        break;
      case "open-transaction-analytics":
        addTab("transaction-analytics");
        break;
      case "csv-import":
        addTab("csv-import");
        break;
      case "open-settings":
        setShowSettings(true);
        break;
      case "switch-profile":
        onSwitchProfile();
        break;
      case "close-tab":
        if (activeTabId) closeTab(activeTabId);
        break;
      case "exit":
        window.api.window.close(); // or some exit API
        break;
      case "toggle-fullscreen":
        window.api.window.toggleMaximize();
        break;
      case "minimize":
        window.api.window.minimize();
        break;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        height: "100%",
        overflow: "hidden",
        background: "#1e1e1e",
      }}
    >
      <MenuBar onAction={handleMenuBarAction} />

      {/* Tab Bar */}
      <div className="workspace-tabs-container">
        {canScrollLeft && (
          <button className="workspace-tabs-scroll workspace-tabs-scroll--left" onClick={() => scrollTabs('left')} title="Scroll tabs left">
            ‹
          </button>
        )}
        <div className="workspace-tabs" ref={tabsRef} onWheel={handleTabsWheel}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`workspace-tab ${activeTabId === tab.id ? "active" : ""}`}
            >
              <span>{tab.title}</span>
              <span
                className="workspace-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ✕
              </span>
            </div>
          ))}
          {tabs.length === 0 && (
            <div style={{ padding: "8px 16px", fontSize: 13, color: "#666" }}>
              No open tabs
            </div>
          )}
        </div>
        {canScrollRight && (
          <button className="workspace-tabs-scroll workspace-tabs-scroll--right" onClick={() => scrollTabs('right')} title="Scroll tabs right">
            ›
          </button>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {tabs.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              color: "#444",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h1 style={{ marginBottom: 8 }}>Welcome to Sloppy Financial</h1>
            <p>Use the File menu to create a new note or manage bills.</p>
            <button
              onClick={onSwitchProfile}
              style={{
                marginTop: 16,
                padding: "8px 20px",
                background: "#333",
                color: "#aaa",
                border: "1px solid #555",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🔄 Switch Profile
            </button>
          </div>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                height: "100%",
                display: activeTabId === tab.id ? "block" : "none",
                padding: 10,
              }}
            >
              {tab.type === "notes" && (
                <NotesEditor
                  initialNoteId={tab.data?.noteId}
                  profileId={profileId}
                  onNoteSaved={(note) => {
                    setTabs((prev) =>
                      prev.map((t) =>
                        t.id === tab.id ? { ...t, title: note.title } : t,
                      ),
                    );
                  }}
                  onTitleChange={(title) => {
                    setTabs((prev) =>
                      prev.map((t) =>
                        t.id === tab.id ? { ...t, title: title || "New Note" } : t,
                      ),
                    );
                  }}
                  onDelete={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "notes-list" && (
                <NotesList
                  profileId={profileId}
                  onOpenNote={(noteId) => addTab("notes", { noteId })}
                  onNewNote={() => addTab("notes")}
                />
              )}
              {tab.type === "bill-records" && (
                <BillRecords
                  profileId={profileId}
                  onOpenManualBill={() => addTab("create-manual-bill")}
                  onViewBill={(billId) => addTab("bill-detail", { billId })}
                />
              )}
              {tab.type === "monthly-summary" && (
                <MonthlySummary
                  profileId={profileId}
                  onViewBill={(billId) => addTab("bill-detail", { billId })}
                />
              )}
              {tab.type === "auto-bills" && (
                <AutoBillsList
                  profileId={profileId}
                  onOpenAutoBill={(bill) =>
                    addTab(bill ? "edit-auto-bill" : "create-auto-bill", bill)
                  }
                />
              )}
              {(tab.type === "create-auto-bill" ||
                tab.type === "edit-auto-bill") && (
                <AutoBillForm
                  initialData={tab.data}
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "create-manual-bill" && (
                <ManualBillForm
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "bill-detail" && (
                <BillDetail
                  billId={tab.data?.billId}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                  onCreateContact={() => addTab("create-contact")}
                />
              )}
              {tab.type === "contacts" && (
                <Contacts
                  profileId={profileId}
                  onEdit={(contactId) =>
                    addTab(
                      contactId === null ? "create-contact" : "edit-contact",
                      { contactId },
                    )
                  }
                  onView={(contactId) =>
                    addTab("contact-detail", { contactId })
                  }
                />
              )}
              {(tab.type === "create-contact" ||
                tab.type === "edit-contact") && (
                <ContactForm
                  contactId={tab.data?.contactId ?? null}
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "contact-detail" && (
                <ContactDetail
                  contactId={tab.data?.contactId}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                  onEdit={() => {
                    closeTab(tab.id);
                    addTab("edit-contact", { contactId: tab.data?.contactId });
                  }}
                />
              )}
              {tab.type === "tax-documents" && (
                <TaxDocumentsList
                  profileId={profileId}
                  onUpload={() => addTab("tax-upload")}
                />
              )}
              {tab.type === "tax-upload" && (
                <TaxUpload
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "payments" && (
                <PaymentsList
                  profileId={profileId}
                  onNewPayment={() => addTab("create-payment")}
                  onViewPayment={(paymentId) =>
                    addTab("payment-detail", { paymentId })
                  }
                />
              )}
              {tab.type === "create-payment" && (
                <PaymentForm
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                  onCreateContact={() => addTab("create-contact")}
                />
              )}
              {tab.type === "payment-detail" && (
                <PaymentDetail
                  paymentId={tab.data?.paymentId}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "invoices" && (
                <InvoicesList
                  profileId={profileId}
                  onNewInvoice={() => addTab("create-invoice")}
                  onViewInvoice={(invoiceId) =>
                    addTab("invoice-detail", { invoiceId })
                  }
                />
              )}
              {tab.type === "create-invoice" && (
                <InvoiceForm
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                  onCreateContact={() => addTab("create-contact")}
                />
              )}
              {tab.type === "invoice-detail" && (
                <InvoiceDetail
                  invoiceId={tab.data?.invoiceId}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "reminders" && (
                <RemindersList profileId={profileId} />
              )}
              {tab.type === "transactions" && (
                <TransactionsList
                  profileId={profileId}
                  onNewTransaction={() => addTab("create-transaction")}
                  onViewTransaction={(transactionId) =>
                    addTab("transaction-detail", { transactionId })
                  }
                />
              )}
              {tab.type === "create-transaction" && (
                <TransactionForm
                  profileId={profileId}
                  onSave={() => closeTab(tab.id)}
                  onCancel={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "transaction-detail" && (
                <TransactionDetail
                  transactionId={tab.data?.transactionId}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "transaction-analytics" && (
                <TransactionAnalytics profileId={profileId} />
              )}
              {tab.type === "csv-import" && (
                <CsvImport
                  profileId={profileId}
                  onDone={() => closeTab(tab.id)}
                />
              )}
            </div>
          ))
        )}
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
