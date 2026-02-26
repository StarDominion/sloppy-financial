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
import { TaskList } from "./TaskList";
import { Calendar } from "./Calendar";
import { Settings } from "./Settings";
import { MealPlanning } from "./MealPlanning";
import { IngredientDetail } from "./IngredientDetail";
import { RecipeDetail } from "./RecipeDetail";
import { MealSchedule } from "./MealSchedule";
import { ShoppingList } from "./ShoppingList";

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
  | "csv-import"
  | "task-list"
  | "calendar"
  | "meal-planning"
  | "ingredient-detail"
  | "create-ingredient"
  | "recipe-detail"
  | "create-recipe"
  | "meal-plan-detail"
  | "shopping-list-detail";

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
  const storageKey = `profile-tabs-${profileId}`;

  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tabs || [];
      }
    } catch { /* ignore */ }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.activeTabId || null;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Persist tabs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ tabs, activeTabId }));
  }, [tabs, activeTabId, storageKey]);

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

  // Dismiss context menu on any click
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    window.addEventListener("click", dismiss);
    return () => window.removeEventListener("click", dismiss);
  }, [contextMenu]);

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const closeTabsToRight = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const idsToClose = tabs.slice(idx + 1).map((t) => t.id);
    const newTabs = tabs.slice(0, idx + 1);
    setTabs(newTabs);
    if (activeTabId && idsToClose.includes(activeTabId)) {
      setActiveTabId(newTabs[newTabs.length - 1]?.id ?? null);
    }
  };

  const closeTabsToLeft = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const idsToClose = tabs.slice(0, idx).map((t) => t.id);
    const newTabs = tabs.slice(idx);
    setTabs(newTabs);
    if (activeTabId && idsToClose.includes(activeTabId)) {
      setActiveTabId(newTabs[0]?.id ?? null);
    }
  };

  const closeOtherTabs = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    setTabs([tab]);
    setActiveTabId(tab.id);
  };

  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
  };

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
      case "task-list":
        title = "Task List";
        break;
      case "calendar":
        title = "Calendar";
        break;
      case "meal-planning":
        title = "Meal Planning";
        break;
      case "ingredient-detail":
        title = "Ingredient Details";
        break;
      case "create-ingredient":
        title = "New Ingredient";
        break;
      case "recipe-detail":
        title = "Recipe Details";
        break;
      case "create-recipe":
        title = "New Recipe";
        break;
      case "meal-plan-detail":
        title = "Meal Schedule";
        break;
      case "shopping-list-detail":
        title = "Shopping List";
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
      case "open-task-list":
        addTab("task-list");
        break;
      case "open-calendar":
        addTab("calendar");
        break;
      case "open-meal-planning":
        addTab("meal-planning");
        break;
      case "new-ingredient":
        addTab("create-ingredient");
        break;
      case "new-recipe":
        addTab("create-recipe");
        break;
      case "new-meal-plan":
        addTab("meal-planning");
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
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
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
                  tabId={tab.id}
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
                  onViewBill={(billId) =>
                    addTab("bill-detail", { billId })
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
              {tab.type === "task-list" && (
                <TaskList profileId={profileId} />
              )}
              {tab.type === "calendar" && (
                <Calendar profileId={profileId} />
              )}
              {tab.type === "meal-planning" && (
                <MealPlanning
                  profileId={profileId}
                  onOpenTab={(type, data) => addTab(type as TabType, data)}
                />
              )}
              {(tab.type === "ingredient-detail" || tab.type === "create-ingredient") && (
                <IngredientDetail
                  ingredientId={tab.data?.ingredientId ?? null}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                />
              )}
              {(tab.type === "recipe-detail" || tab.type === "create-recipe") && (
                <RecipeDetail
                  recipeId={tab.data?.recipeId ?? null}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "meal-plan-detail" && (
                <MealSchedule
                  mealPlanId={tab.data?.mealPlanId}
                  profileId={profileId}
                  onGenerateShoppingList={(shoppingListId) =>
                    addTab("shopping-list-detail", { shoppingListId })
                  }
                  onClose={() => closeTab(tab.id)}
                />
              )}
              {tab.type === "shopping-list-detail" && (
                <ShoppingList
                  shoppingListId={tab.data?.shoppingListId}
                  profileId={profileId}
                  onClose={() => closeTab(tab.id)}
                />
              )}
            </div>
          ))
        )}
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Tab Context Menu */}
      {contextMenu && (() => {
        const idx = tabs.findIndex((t) => t.id === contextMenu.tabId);
        const hasLeft = idx > 0;
        const hasRight = idx < tabs.length - 1;
        const hasOthers = tabs.length > 1;
        const menuItems: { label: string; action: () => void; disabled?: boolean }[] = [
          { label: "Close", action: () => closeTab(contextMenu.tabId) },
          { label: "Close Others", action: () => closeOtherTabs(contextMenu.tabId), disabled: !hasOthers },
          { label: "Close to the Left", action: () => closeTabsToLeft(contextMenu.tabId), disabled: !hasLeft },
          { label: "Close to the Right", action: () => closeTabsToRight(contextMenu.tabId), disabled: !hasRight },
          { label: "Close All", action: () => closeAllTabs() },
        ];
        return (
          <div
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              background: "#252525",
              border: "1px solid #444",
              borderRadius: 6,
              padding: "4px 0",
              zIndex: 2000,
              minWidth: 180,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item) => (
              <div
                key={item.label}
                onClick={() => {
                  if (!item.disabled) {
                    item.action();
                    setContextMenu(null);
                  }
                }}
                style={{
                  padding: "6px 16px",
                  fontSize: 13,
                  color: item.disabled ? "#555" : "#ddd",
                  cursor: item.disabled ? "default" : "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) e.currentTarget.style.background = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
