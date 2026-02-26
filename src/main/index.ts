import { app, shell, BrowserWindow, ipcMain, protocol } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { FileStorage } from "./storage/FileStorage";
import { listNotes, saveNote, deleteNote } from "./notes";
import {
  createReminder,
  deleteReminder,
  listReminders,
} from "./reminders";
import { sendReminderNotification } from "./notifications";
import {
  listAutomaticBills,
  createAutomaticBill,
  updateAutomaticBill,
  deleteAutomaticBill,
  generateManualBillFromAuto,
  listBillRecords,
  createBillRecord,
  updateBillRecord,
  markBillPaid,
  updateBillRecordDocument,
  matchTransactionToAutoBill,
} from "./bills";
import { testMySQLConnection, testMinIOConnection, testSqliteConnection } from "./connection-tests";
import {
  getRecentWorkspaces,
  openWorkspace,
  createWorkspace,
  showOpenFolderDialog,
  showCreateFolderDialog,
  getWorkspaceConfig,
  getCurrentWorkspacePath,
  updateWorkspaceConfig,
  removeRecentWorkspace,
} from "./workspace";
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from "./contacts";
import {
  listOwedAmounts,
  getOwedAmount,
  getOwedAmountsForContact,
  createOwedAmount,
  updateOwedAmount,
  markOwedAmountPaid,
  markOwedAmountUnpaid,
  deleteOwedAmount,
  createOwedAmountFromBill,
  getBillOwedBy,
  setBillOwedBy,
  getBillOwedTo,
  setBillOwedTo,
} from "./owed-amounts";
import { listTasks, createTask, updateTask, deleteTask } from "./tasks";
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "./calendar-events";
import {
  listTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getTagsForBillRecord,
  setTagsForBillRecord,
  getTagsForAutomaticBill,
  setTagsForAutomaticBill,
  getTagsForTaxDocument,
  setTagsForTaxDocument,
  getTagsForPayment,
  setTagsForPayment,
  getTagsForInvoice,
  setTagsForInvoice,
  getTagsForTransaction,
  setTagsForTransaction,
} from "./tags";
import {
  createTaxDocument,
  listTaxDocuments,
  listTaxDocumentsByYear,
  getTaxDocument,
  updateTaxDocument,
  deleteTaxDocument,
  getTaxYears,
} from "./tax";
import {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  updatePaymentDocument,
  deletePayment,
} from "./payments";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceDocument,
  markInvoicePaid,
  deleteInvoice,
} from "./invoices";
import {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  updateTransactionDocument,
  deleteTransaction,
  applyTagRulesToTransactions,
  checkDuplicateTransactions,
  aggregateTransactionsByTag,
  aggregateTransactionsByType,
  aggregateTransactionsByPeriod,
  aggregateTransactionsByDescriptionFilter,
} from "./transactions";
import {
  listTagRules,
  createTagRule,
  updateTagRule,
  deleteTagRule,
  replaceAllTagRules,
} from "./tag-rules";
import {
  parseCsv,
  detectColumnMapping,
  classifyTransactions,
  applyMapping,
  commitTransactions,
  buildMappingPrompt,
  buildClassifyPrompt,
  runOllamaPrompt,
} from "./csv-import";
import {
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  listPriceHistory,
  addPriceHistory,
  deletePriceHistory,
  listBrands,
  addBrand,
  updateBrand,
  deleteBrand,
} from "./ingredients";
import {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeIngredients,
  setRecipeIngredients,
  getRecipeNutrition,
  getRecipeCost,
} from "./recipes";
import {
  listMealPlans,
  getMealPlan,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  listMealPlanEntries,
  createMealPlanEntry,
  updateMealPlanEntry,
  deleteMealPlanEntry,
  getDailyNutrition,
  getLeftovers,
  syncMealPlanToCalendar,
} from "./meal-plans";
import {
  listShoppingLists,
  getShoppingList,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  listShoppingListItems,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  generateFromMealPlan,
  linkTransaction as linkShoppingListTransaction,
} from "./shopping-lists";
import {
  listMealBudgets,
  createMealBudget,
  updateMealBudget,
  deleteMealBudget,
  getBudgetSpending,
} from "./meal-budgets";
import {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  touchProfile,
} from "./profiles";

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 640,
    minHeight: 480,
    show: false,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

let notesWindow: BrowserWindow | null = null;

function createNotesWindow(noteId?: number): void {
  if (notesWindow) {
    notesWindow.focus();
    const urlHash = noteId ? `#/notes?id=${noteId}` : "#/notes";
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      notesWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}${urlHash}`);
    } else {
      notesWindow.loadFile(join(__dirname, "../renderer/index.html"), {
        hash: urlHash,
      });
    }
    return;
  }

  notesWindow = new BrowserWindow({
    width: 900,
    height: 720,
    minWidth: 760,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  notesWindow.on("ready-to-show", () => {
    notesWindow?.show();
  });

  notesWindow.on("closed", () => {
    notesWindow = null;
  });

  const urlHash = noteId ? `#/notes?id=${noteId}` : "#/notes";
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    notesWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}${urlHash}`);
  } else {
    notesWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: urlHash,
    });
  }
}

let workspaceWindow: BrowserWindow | null = null;

function createWorkspaceWindow(): void {
  if (workspaceWindow) {
    workspaceWindow.focus();
    return;
  }

  workspaceWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 760,
    minHeight: 500,
    show: false,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  workspaceWindow.on("ready-to-show", () => {
    workspaceWindow?.show();
  });

  workspaceWindow.on("closed", () => {
    workspaceWindow = null;
  });

  const urlHash = "#/workspace";
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    workspaceWindow.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"]}${urlHash}`,
    );
  } else {
    workspaceWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      hash: urlHash,
    });
  }
}

// Register custom protocol for serving stored files (images, etc.) in the renderer.
// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app-file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Handle app-file:// protocol requests by reading from FileStorage
  protocol.handle("app-file", async (request) => {
    const url = new URL(request.url);
    const storageKey = url.pathname.replace(/^\/+/, "");
    try {
      const result = await FileStorage.getInstance().download(storageKey);
      return new Response(new Uint8Array(result.data), {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "max-age=3600",
        },
      });
    } catch {
      return new Response("File not found", { status: 404 });
    }
  });

  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC handlers
  ipcMain.handle("notes:list", async (_, profileId: number) => listNotes(profileId));
  ipcMain.handle("notes:save", async (_, payload) => saveNote(payload));
  ipcMain.handle("notes:delete", async (_, id: number) => deleteNote(id));
  ipcMain.handle("window:openNotes", async (_, noteId?: number) =>
    createNotesWindow(noteId),
  );
  ipcMain.handle("window:openWorkspace", async (event) => {
    createWorkspaceWindow();
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
  ipcMain.handle("window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.handle("window:toggleMaximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.handle("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
  ipcMain.handle("reminders:list", async (_, profileId: number) => listReminders(profileId));
  ipcMain.handle("reminders:create", async (_, payload) =>
    createReminder(payload),
  );

  // Bills IPC
  ipcMain.handle("bills:listAutomatic", async (_, profileId: number) => listAutomaticBills(profileId));
  ipcMain.handle("bills:createAutomatic", async (_, data) =>
    createAutomaticBill(data),
  );
  ipcMain.handle("bills:updateAutomatic", async (_, { id, data }) =>
    updateAutomaticBill(id, data),
  );
  ipcMain.handle("bills:deleteAutomatic", async (_, id) =>
    deleteAutomaticBill(id),
  );
  ipcMain.handle("bills:generateManual", async (_, { id, date }) =>
    generateManualBillFromAuto(id, new Date(date)),
  );
  ipcMain.handle("bills:listRecords", async (_, profileId: number) => listBillRecords(profileId));
  ipcMain.handle("bills:createRecord", async (_, data) =>
    createBillRecord(data),
  );
  ipcMain.handle("bills:updateRecord", async (_, { id, data }) =>
    updateBillRecord(id, data),
  );
  ipcMain.handle("bills:payRecord", async (_, id) => markBillPaid(id));
  ipcMain.handle("bills:updateRecordDocument", async (_, { id, storageKey, originalName, md5Hash }) =>
    updateBillRecordDocument(id, storageKey, originalName, md5Hash),
  );
  ipcMain.handle("bills:matchTransaction", async (_, { transactionId, automaticBillId, profileId }) =>
    matchTransactionToAutoBill(transactionId, automaticBillId, profileId),
  );
  // Contacts IPC
  ipcMain.handle("contacts:list", async (_, profileId: number) => listContacts(profileId));
  ipcMain.handle("contacts:get", async (_, id) => getContact(id));
  ipcMain.handle("contacts:create", async (_, data) => createContact(data));
  ipcMain.handle("contacts:update", async (_, { id, data }) =>
    updateContact(id, data),
  );
  ipcMain.handle("contacts:delete", async (_, id) => deleteContact(id));

  // Tasks IPC
  ipcMain.handle("tasks:list", async (_, profileId: number) => listTasks(profileId));
  ipcMain.handle("tasks:create", async (_, data) => createTask(data));
  ipcMain.handle("tasks:update", async (_, { id, data }) => updateTask(id, data));
  ipcMain.handle("tasks:delete", async (_, id) => deleteTask(id));

  // Calendar Events IPC
  ipcMain.handle("calendarEvents:list", async (_, { profileId, startDate, endDate }) =>
    listCalendarEvents(profileId, startDate, endDate),
  );
  ipcMain.handle("calendarEvents:create", async (_, data) => createCalendarEvent(data));
  ipcMain.handle("calendarEvents:update", async (_, { id, data }) => updateCalendarEvent(id, data));
  ipcMain.handle("calendarEvents:delete", async (_, id) => deleteCalendarEvent(id));

  // Owed Amounts IPC
  ipcMain.handle("owedAmounts:list", async (_, profileId: number) => listOwedAmounts(profileId));
  ipcMain.handle("owedAmounts:get", async (_, id) => getOwedAmount(id));
  ipcMain.handle("owedAmounts:getForContact", async (_, contactId) =>
    getOwedAmountsForContact(contactId),
  );
  ipcMain.handle("owedAmounts:create", async (_, data) =>
    createOwedAmount(data),
  );
  ipcMain.handle("owedAmounts:update", async (_, { id, data }) =>
    updateOwedAmount(id, data),
  );
  ipcMain.handle("owedAmounts:markPaid", async (_, id) =>
    markOwedAmountPaid(id),
  );
  ipcMain.handle("owedAmounts:markUnpaid", async (_, id) =>
    markOwedAmountUnpaid(id),
  );
  ipcMain.handle("owedAmounts:delete", async (_, id) => deleteOwedAmount(id));
  ipcMain.handle(
    "owedAmounts:createFromBill",
    async (_, { billRecordId, contactId, profileId }) =>
      createOwedAmountFromBill(billRecordId, contactId, profileId),
  );

  // Bill Owed By IPC
  ipcMain.handle("billOwedBy:get", async (_, billRecordId) =>
    getBillOwedBy(billRecordId),
  );
  ipcMain.handle("billOwedBy:set", async (_, { billRecordId, contactId }) =>
    setBillOwedBy(billRecordId, contactId),
  );

  // Bill Owed To IPC
  ipcMain.handle("billOwedTo:get", async (_, billRecordId) =>
    getBillOwedTo(billRecordId),
  );
  ipcMain.handle("billOwedTo:set", async (_, { billRecordId, contactId }) =>
    setBillOwedTo(billRecordId, contactId),
  );

  // Tags IPC
  ipcMain.handle("tags:list", async (_, profileId: number) => listTags(profileId));
  ipcMain.handle("tags:get", async (_, id) => getTag(id));
  ipcMain.handle("tags:create", async (_, data) => createTag(data));
  ipcMain.handle("tags:update", async (_, { id, data }) => updateTag(id, data));
  ipcMain.handle("tags:delete", async (_, id) => deleteTag(id));
  ipcMain.handle("tags:getForBillRecord", async (_, billRecordId) =>
    getTagsForBillRecord(billRecordId),
  );
  ipcMain.handle("tags:setForBillRecord", async (_, { billRecordId, tagIds }) =>
    setTagsForBillRecord(billRecordId, tagIds),
  );
  ipcMain.handle("tags:getForAutomaticBill", async (_, automaticBillId) =>
    getTagsForAutomaticBill(automaticBillId),
  );
  ipcMain.handle(
    "tags:setForAutomaticBill",
    async (_, { automaticBillId, tagIds }) =>
      setTagsForAutomaticBill(automaticBillId, tagIds),
  );
  ipcMain.handle("tags:getForTaxDocument", async (_, taxDocumentId) =>
    getTagsForTaxDocument(taxDocumentId),
  );
  ipcMain.handle(
    "tags:setForTaxDocument",
    async (_, { taxDocumentId, tagIds }) =>
      setTagsForTaxDocument(taxDocumentId, tagIds),
  );
  ipcMain.handle("tags:getForPayment", async (_, paymentId) =>
    getTagsForPayment(paymentId),
  );
  ipcMain.handle(
    "tags:setForPayment",
    async (_, { paymentId, tagIds }) =>
      setTagsForPayment(paymentId, tagIds),
  );
  ipcMain.handle("tags:getForInvoice", async (_, invoiceId) =>
    getTagsForInvoice(invoiceId),
  );
  ipcMain.handle(
    "tags:setForInvoice",
    async (_, { invoiceId, tagIds }) =>
      setTagsForInvoice(invoiceId, tagIds),
  );
  ipcMain.handle("tags:getForTransaction", async (_, transactionId) =>
    getTagsForTransaction(transactionId),
  );
  ipcMain.handle(
    "tags:setForTransaction",
    async (_, { transactionId, tagIds }) =>
      setTagsForTransaction(transactionId, tagIds),
  );

  // Tax IPC
  ipcMain.handle("tax:createDocument", async (_, data) =>
    createTaxDocument(data),
  );
  ipcMain.handle("tax:listDocuments", async (_, profileId: number) => listTaxDocuments(profileId));
  ipcMain.handle("tax:listDocumentsByYear", async (_, { year, profileId }) =>
    listTaxDocumentsByYear(year, profileId),
  );
  ipcMain.handle("tax:getDocument", async (_, id) => getTaxDocument(id));
  ipcMain.handle("tax:updateDocument", async (_, { id, data }) =>
    updateTaxDocument(id, data),
  );
  ipcMain.handle("tax:deleteDocument", async (_, id) => deleteTaxDocument(id));
  ipcMain.handle("tax:getYears", async (_, profileId: number) => getTaxYears(profileId));

  // Payments IPC
  ipcMain.handle("payments:list", async (_, profileId: number) => listPayments(profileId));
  ipcMain.handle("payments:get", async (_, id) => getPayment(id));
  ipcMain.handle("payments:create", async (_, data) => createPayment(data));
  ipcMain.handle("payments:update", async (_, { id, data }) => updatePayment(id, data));
  ipcMain.handle("payments:updateDocument", async (_, { id, storageKey, originalName, md5Hash }) =>
    updatePaymentDocument(id, storageKey, originalName, md5Hash),
  );
  ipcMain.handle("payments:delete", async (_, id) => deletePayment(id));

  // Invoices IPC
  ipcMain.handle("invoices:list", async (_, profileId: number) => listInvoices(profileId));
  ipcMain.handle("invoices:get", async (_, id) => getInvoice(id));
  ipcMain.handle("invoices:create", async (_, data) => createInvoice(data));
  ipcMain.handle("invoices:update", async (_, { id, data }) => updateInvoice(id, data));
  ipcMain.handle("invoices:updateDocument", async (_, { id, storageKey, originalName, md5Hash }) =>
    updateInvoiceDocument(id, storageKey, originalName, md5Hash),
  );
  ipcMain.handle("invoices:markPaid", async (_, id) => markInvoicePaid(id));
  ipcMain.handle("invoices:delete", async (_, id) => deleteInvoice(id));

  // Transactions IPC
  ipcMain.handle("transactions:list", async (_, profileId: number) => listTransactions(profileId));
  ipcMain.handle("transactions:get", async (_, id) => getTransaction(id));
  ipcMain.handle("transactions:create", async (_, data) => createTransaction(data));
  ipcMain.handle("transactions:update", async (_, { id, data }) => updateTransaction(id, data));
  ipcMain.handle("transactions:updateDocument", async (_, { id, storageKey, originalName, md5Hash }) =>
    updateTransactionDocument(id, storageKey, originalName, md5Hash),
  );
  ipcMain.handle("transactions:delete", async (_, id) => deleteTransaction(id));
  ipcMain.handle("transactions:applyTagRules", async (_, { profileId, rules }) => {
    return applyTagRulesToTransactions(profileId, rules);
  });
  ipcMain.handle("transactions:checkDuplicates", async (_, { profileId, transactions }) => {
    return checkDuplicateTransactions(profileId, transactions);
  });

  // Transaction Analytics IPC
  ipcMain.handle("transactions:aggregateByTag", async (_, { profileId, startDate, endDate }) => {
    return aggregateTransactionsByTag(profileId, startDate, endDate);
  });
  ipcMain.handle("transactions:aggregateByType", async (_, { profileId, startDate, endDate }) => {
    return aggregateTransactionsByType(profileId, startDate, endDate);
  });
  ipcMain.handle("transactions:aggregateByPeriod", async (_, { profileId, granularity, startDate, endDate }) => {
    return aggregateTransactionsByPeriod(profileId, granularity, startDate, endDate);
  });
  ipcMain.handle("transactions:aggregateByDescription", async (_, { profileId, descriptionSubstrings, startDate, endDate }) => {
    return aggregateTransactionsByDescriptionFilter(profileId, descriptionSubstrings, startDate, endDate);
  });

  // Tag Rules IPC
  ipcMain.handle("tagRules:list", async (_, profileId: number) => listTagRules(profileId));
  ipcMain.handle("tagRules:create", async (_, data) => createTagRule(data));
  ipcMain.handle("tagRules:update", async (_, { id, data }) => updateTagRule(id, data));
  ipcMain.handle("tagRules:delete", async (_, id) => deleteTagRule(id));
  ipcMain.handle("tagRules:replaceAll", async (_, { profileId, rules }) => replaceAllTagRules(profileId, rules));

  // CSV Import IPC
  ipcMain.handle("csvImport:parse", async (_, csvText: string) => {
    return parseCsv(csvText);
  });
  ipcMain.handle("csvImport:detectMapping", async (_, { headers, sampleRows, customPrompt }) => {
    return detectColumnMapping(headers, sampleRows, customPrompt);
  });
  ipcMain.handle("csvImport:applyMapping", async (_, { rows, mapping }) => {
    return applyMapping(rows, mapping);
  });
  ipcMain.handle("csvImport:classify", async (_, { transactions, existingTags, customPrompt }) => {
    return classifyTransactions(transactions, existingTags, customPrompt);
  });
  ipcMain.handle("csvImport:commit", async (_, { profileId, transactions }) => {
    return commitTransactions(profileId, transactions);
  });
  ipcMain.handle("csvImport:buildMappingPrompt", async (_, { headers, sampleRows }) => {
    return buildMappingPrompt(headers, sampleRows);
  });
  ipcMain.handle("csvImport:buildClassifyPrompt", async (_, { transactions, existingTags }) => {
    return buildClassifyPrompt(transactions, existingTags);
  });
  ipcMain.handle("csvImport:runPrompt", async (_, prompt: string) => {
    return runOllamaPrompt(prompt);
  });

  ipcMain.handle("reminders:delete", async (_, id) => deleteReminder(id));
  ipcMain.handle("reminders:testNotification", async (_, { title, body }) => {
    sendReminderNotification(title, body);
  });
  ipcMain.handle("minio:upload", async (_, payload) => {
    const buffer = Buffer.from(payload.data);
    const result = await FileStorage.getInstance().upload(payload.name, payload.mime, buffer);
    // Return compatible format for backward compatibility
    return {
      objectName: result.storageKey,
      bucket: result.metadata?.bucket || "financial",
      originalName: result.originalName,
      md5Hash: result.md5Hash,
    };
  });

  ipcMain.handle("minio:getUrl", async (_, objectName) => {
    return FileStorage.getInstance().getUrl(objectName);
  });

  ipcMain.handle("minio:download", async (_, objectName) => {
    const result = await FileStorage.getInstance().download(objectName);
    return {
      data: Array.from(result.data),
      contentType: result.contentType,
    };
  });

  // Profiles IPC
  ipcMain.handle("profiles:list", async () => listProfiles());
  ipcMain.handle("profiles:get", async (_, id) => getProfile(id));
  ipcMain.handle("profiles:create", async (_, data) => createProfile(data));
  ipcMain.handle("profiles:update", async (_, { id, data }) => updateProfile(id, data));
  ipcMain.handle("profiles:delete", async (_, id) => deleteProfile(id));
  ipcMain.handle("profiles:touch", async (_, id) => touchProfile(id));

  // Ingredients IPC
  ipcMain.handle("ingredients:list", async (_, profileId) => listIngredients(profileId));
  ipcMain.handle("ingredients:get", async (_, id) => getIngredient(id));
  ipcMain.handle("ingredients:create", async (_, data) => createIngredient(data));
  ipcMain.handle("ingredients:update", async (_, { id, data }) => updateIngredient(id, data));
  ipcMain.handle("ingredients:delete", async (_, id) => deleteIngredient(id));
  ipcMain.handle("ingredients:listPriceHistory", async (_, ingredientId) => listPriceHistory(ingredientId));
  ipcMain.handle("ingredients:addPriceHistory", async (_, data) => addPriceHistory(data));
  ipcMain.handle("ingredients:deletePriceHistory", async (_, id) => deletePriceHistory(id));
  ipcMain.handle("ingredients:listBrands", async (_, ingredientId) => listBrands(ingredientId));
  ipcMain.handle("ingredients:addBrand", async (_, data) => addBrand(data));
  ipcMain.handle("ingredients:updateBrand", async (_, { id, data }) => updateBrand(id, data));
  ipcMain.handle("ingredients:deleteBrand", async (_, id) => deleteBrand(id));

  // Recipes IPC
  ipcMain.handle("recipes:list", async (_, profileId) => listRecipes(profileId));
  ipcMain.handle("recipes:get", async (_, id) => getRecipe(id));
  ipcMain.handle("recipes:create", async (_, data) => createRecipe(data));
  ipcMain.handle("recipes:update", async (_, { id, data }) => updateRecipe(id, data));
  ipcMain.handle("recipes:delete", async (_, id) => deleteRecipe(id));
  ipcMain.handle("recipes:getIngredients", async (_, recipeId) => getRecipeIngredients(recipeId));
  ipcMain.handle("recipes:setIngredients", async (_, { recipeId, items }) => setRecipeIngredients(recipeId, items));
  ipcMain.handle("recipes:getNutrition", async (_, recipeId) => getRecipeNutrition(recipeId));
  ipcMain.handle("recipes:getCost", async (_, recipeId) => getRecipeCost(recipeId));

  // Meal Plans IPC
  ipcMain.handle("mealPlans:list", async (_, profileId) => listMealPlans(profileId));
  ipcMain.handle("mealPlans:get", async (_, id) => getMealPlan(id));
  ipcMain.handle("mealPlans:create", async (_, data) => createMealPlan(data));
  ipcMain.handle("mealPlans:update", async (_, { id, data }) => updateMealPlan(id, data));
  ipcMain.handle("mealPlans:delete", async (_, id) => deleteMealPlan(id));
  ipcMain.handle("mealPlans:listEntries", async (_, mealPlanId) => listMealPlanEntries(mealPlanId));
  ipcMain.handle("mealPlans:createEntry", async (_, data) => createMealPlanEntry(data));
  ipcMain.handle("mealPlans:updateEntry", async (_, { id, data }) => updateMealPlanEntry(id, data));
  ipcMain.handle("mealPlans:deleteEntry", async (_, id) => deleteMealPlanEntry(id));
  ipcMain.handle("mealPlans:getDailyNutrition", async (_, { mealPlanId, date }) => getDailyNutrition(mealPlanId, date));
  ipcMain.handle("mealPlans:getLeftovers", async (_, { mealPlanId, date, recipeId }) => getLeftovers(mealPlanId, date, recipeId));
  ipcMain.handle("mealPlans:syncToCalendar", async (_, { mealPlanId, profileId }) => syncMealPlanToCalendar(mealPlanId, profileId));

  // Shopping Lists IPC
  ipcMain.handle("shoppingLists:list", async (_, profileId) => listShoppingLists(profileId));
  ipcMain.handle("shoppingLists:get", async (_, id) => getShoppingList(id));
  ipcMain.handle("shoppingLists:create", async (_, data) => createShoppingList(data));
  ipcMain.handle("shoppingLists:update", async (_, { id, data }) => updateShoppingList(id, data));
  ipcMain.handle("shoppingLists:delete", async (_, id) => deleteShoppingList(id));
  ipcMain.handle("shoppingLists:listItems", async (_, shoppingListId) => listShoppingListItems(shoppingListId));
  ipcMain.handle("shoppingLists:addItem", async (_, data) => addShoppingListItem(data));
  ipcMain.handle("shoppingLists:updateItem", async (_, { id, data }) => updateShoppingListItem(id, data));
  ipcMain.handle("shoppingLists:deleteItem", async (_, id) => deleteShoppingListItem(id));
  ipcMain.handle("shoppingLists:generateFromPlan", async (_, { mealPlanId, profileId }) => generateFromMealPlan(mealPlanId, profileId));
  ipcMain.handle("shoppingLists:linkTransaction", async (_, { shoppingListId, transactionId }) => linkShoppingListTransaction(shoppingListId, transactionId));

  // Meal Budgets IPC
  ipcMain.handle("mealBudgets:list", async (_, profileId) => listMealBudgets(profileId));
  ipcMain.handle("mealBudgets:create", async (_, data) => createMealBudget(data));
  ipcMain.handle("mealBudgets:update", async (_, { id, data }) => updateMealBudget(id, data));
  ipcMain.handle("mealBudgets:delete", async (_, id) => deleteMealBudget(id));
  ipcMain.handle("mealBudgets:getSpending", async (_, { profileId, startDate, endDate }) => getBudgetSpending(profileId, startDate, endDate));

  // Connection test IPC
  ipcMain.handle("settings:testMySQL", async (_, mysqlConfig) =>
    testMySQLConnection(mysqlConfig),
  );
  ipcMain.handle("settings:testMinIO", async (_, minioConfig) =>
    testMinIOConnection(minioConfig),
  );
  ipcMain.handle("settings:testSqlite", async (_, sqliteConfig) =>
    testSqliteConnection(sqliteConfig),
  );

  // Workspace IPC
  ipcMain.handle("workspace:listRecent", async () => {
    return getRecentWorkspaces();
  });
  ipcMain.handle("workspace:open", async (_, folderPath: string) => {
    await openWorkspace(folderPath);
    return { success: true };
  });
  ipcMain.handle("workspace:create", async (_, folderPath: string, config?: any) => {
    await createWorkspace(folderPath, config);
    await openWorkspace(folderPath);
    return { success: true };
  });
  ipcMain.handle("workspace:showOpenDialog", async () => {
    return showOpenFolderDialog();
  });
  ipcMain.handle("workspace:showCreateDialog", async () => {
    return showCreateFolderDialog();
  });
  ipcMain.handle("workspace:getConfig", async () => {
    return getWorkspaceConfig();
  });
  ipcMain.handle("workspace:updateConfig", async (_, updates: any) => {
    const path = getCurrentWorkspacePath();
    if (!path) throw new Error("No workspace open");
    await updateWorkspaceConfig(path, updates);
    return { success: true };
  });
  ipcMain.handle("workspace:removeRecent", async (_, folderPath: string) => {
    await removeRecentWorkspace(folderPath);
    return { success: true };
  });
  ipcMain.handle("workspace:getCurrent", async () => {
    return getCurrentWorkspacePath();
  });

  // No DB/storage initialization at startup - deferred to workspace:open
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
