import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  notes: {
    list: (profileId: number) => ipcRenderer.invoke("notes:list", profileId),
    save: (note: { id?: number; title: string; content: string; profileId: number }) =>
      ipcRenderer.invoke("notes:save", note),
    delete: (id: number) => ipcRenderer.invoke("notes:delete", id),
  },
  reminders: {
    list: (profileId: number) => ipcRenderer.invoke("reminders:list", profileId),
    create: (payload: {
      title: string;
      body: string;
      scheduleType: "once" | "cron";
      scheduledAt?: string | null;
      cronExpr?: string | null;
      profileId: number;
    }) => ipcRenderer.invoke("reminders:create", payload),
    delete: (id: number) => ipcRenderer.invoke("reminders:delete", id),
    testNotification: (title: string, body: string) =>
      ipcRenderer.invoke("reminders:testNotification", { title, body }),
  },
  bills: {
    listAutomatic: (profileId: number) => ipcRenderer.invoke("bills:listAutomatic", profileId),
    createAutomatic: (data: any) =>
      ipcRenderer.invoke("bills:createAutomatic", data),
    updateAutomatic: (id: number, data: any) =>
      ipcRenderer.invoke("bills:updateAutomatic", { id, data }),
    deleteAutomatic: (id: number) =>
      ipcRenderer.invoke("bills:deleteAutomatic", id),
    generateManual: (id: number, date: Date | string) =>
      ipcRenderer.invoke("bills:generateManual", { id, date }),
    listRecords: (profileId: number) => ipcRenderer.invoke("bills:listRecords", profileId),
    createRecord: (data: any) => ipcRenderer.invoke("bills:createRecord", data),
    updateRecord: (id: number, data: any) =>
      ipcRenderer.invoke("bills:updateRecord", { id, data }),
    payRecord: (id: number) => ipcRenderer.invoke("bills:payRecord", id),
    updateRecordDocument: (id: number, storageKey: string, originalName?: string, md5Hash?: string) =>
      ipcRenderer.invoke("bills:updateRecordDocument", { id, storageKey, originalName, md5Hash }),
    matchTransaction: (transactionId: number, automaticBillId: number, profileId: number) =>
      ipcRenderer.invoke("bills:matchTransaction", { transactionId, automaticBillId, profileId }),
  },
  contacts: {
    list: (profileId: number) => ipcRenderer.invoke("contacts:list", profileId),
    get: (id: number) => ipcRenderer.invoke("contacts:get", id),
    create: (data: any) => ipcRenderer.invoke("contacts:create", data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke("contacts:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("contacts:delete", id),
  },
  tasks: {
    list: (profileId: number) => ipcRenderer.invoke("tasks:list", profileId),
    create: (data: { title: string; description?: string | null; profileId: number }) =>
      ipcRenderer.invoke("tasks:create", data),
    update: (id: number, data: { title?: string; description?: string | null; completed?: number; sort_order?: number }) =>
      ipcRenderer.invoke("tasks:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("tasks:delete", id),
  },
  calendarEvents: {
    list: (profileId: number, startDate: string, endDate: string) =>
      ipcRenderer.invoke("calendarEvents:list", { profileId, startDate, endDate }),
    create: (data: {
      profileId: number;
      title: string;
      description?: string | null;
      startTime: string;
      durationMinutes: number;
      color?: string | null;
    }) => ipcRenderer.invoke("calendarEvents:create", data),
    update: (id: number, data: {
      title?: string;
      description?: string | null;
      startTime?: string;
      durationMinutes?: number;
      color?: string | null;
    }) => ipcRenderer.invoke("calendarEvents:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("calendarEvents:delete", id),
  },
  owedAmounts: {
    list: (profileId: number) => ipcRenderer.invoke("owedAmounts:list", profileId),
    get: (id: number) => ipcRenderer.invoke("owedAmounts:get", id),
    getForContact: (contactId: number) =>
      ipcRenderer.invoke("owedAmounts:getForContact", contactId),
    create: (data: any) => ipcRenderer.invoke("owedAmounts:create", data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke("owedAmounts:update", { id, data }),
    markPaid: (id: number) => ipcRenderer.invoke("owedAmounts:markPaid", id),
    markUnpaid: (id: number) =>
      ipcRenderer.invoke("owedAmounts:markUnpaid", id),
    delete: (id: number) => ipcRenderer.invoke("owedAmounts:delete", id),
    createFromBill: (billRecordId: number, contactId: number, profileId: number) =>
      ipcRenderer.invoke("owedAmounts:createFromBill", {
        billRecordId,
        contactId,
        profileId,
      }),
  },
  billOwedBy: {
    get: (billRecordId: number) =>
      ipcRenderer.invoke("billOwedBy:get", billRecordId),
    set: (billRecordId: number, contactId: number | null) =>
      ipcRenderer.invoke("billOwedBy:set", { billRecordId, contactId }),
  },
  billOwedTo: {
    get: (billRecordId: number) =>
      ipcRenderer.invoke("billOwedTo:get", billRecordId),
    set: (billRecordId: number, contactId: number | null) =>
      ipcRenderer.invoke("billOwedTo:set", { billRecordId, contactId }),
  },
  tags: {
    list: (profileId: number) => ipcRenderer.invoke("tags:list", profileId),
    get: (id: number) => ipcRenderer.invoke("tags:get", id),
    create: (data: any) => ipcRenderer.invoke("tags:create", data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke("tags:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("tags:delete", id),
    getForBillRecord: (billRecordId: number) =>
      ipcRenderer.invoke("tags:getForBillRecord", billRecordId),
    setForBillRecord: (billRecordId: number, tagIds: number[]) =>
      ipcRenderer.invoke("tags:setForBillRecord", { billRecordId, tagIds }),
    getForAutomaticBill: (automaticBillId: number) =>
      ipcRenderer.invoke("tags:getForAutomaticBill", automaticBillId),
    setForAutomaticBill: (automaticBillId: number, tagIds: number[]) =>
      ipcRenderer.invoke("tags:setForAutomaticBill", {
        automaticBillId,
        tagIds,
      }),
    getForTaxDocument: (taxDocumentId: number) =>
      ipcRenderer.invoke("tags:getForTaxDocument", taxDocumentId),
    setForTaxDocument: (taxDocumentId: number, tagIds: number[]) =>
      ipcRenderer.invoke("tags:setForTaxDocument", {
        taxDocumentId,
        tagIds,
      }),
    getForPayment: (paymentId: number) =>
      ipcRenderer.invoke("tags:getForPayment", paymentId),
    setForPayment: (paymentId: number, tagIds: number[]) =>
      ipcRenderer.invoke("tags:setForPayment", { paymentId, tagIds }),
    getForInvoice: (invoiceId: number) =>
      ipcRenderer.invoke("tags:getForInvoice", invoiceId),
    setForInvoice: (invoiceId: number, tagIds: number[]) =>
      ipcRenderer.invoke("tags:setForInvoice", { invoiceId, tagIds }),
    getForTransaction: (transactionId: number) =>
      ipcRenderer.invoke("tags:getForTransaction", transactionId),
    setForTransaction: (transactionId: number, tagIds: number[]) =>
      ipcRenderer.invoke("tags:setForTransaction", { transactionId, tagIds }),
  },
  tax: {
    createDocument: (data: {
      year: number;
      description: string | null;
      document_path: string;
      file_name: string;
      storage_key?: string;
      md5_hash?: string;
      profileId: number;
    }) => ipcRenderer.invoke("tax:createDocument", data),
    listDocuments: (profileId: number) => ipcRenderer.invoke("tax:listDocuments", profileId),
    listDocumentsByYear: (year: number, profileId: number) =>
      ipcRenderer.invoke("tax:listDocumentsByYear", { year, profileId }),
    getDocument: (id: number) => ipcRenderer.invoke("tax:getDocument", id),
    updateDocument: (id: number, data: any) =>
      ipcRenderer.invoke("tax:updateDocument", { id, data }),
    deleteDocument: (id: number) =>
      ipcRenderer.invoke("tax:deleteDocument", id),
    getYears: (profileId: number) => ipcRenderer.invoke("tax:getYears", profileId),
  },
  payments: {
    list: (profileId: number) => ipcRenderer.invoke("payments:list", profileId),
    get: (id: number) => ipcRenderer.invoke("payments:get", id),
    create: (data: any) => ipcRenderer.invoke("payments:create", data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke("payments:update", { id, data }),
    updateDocument: (id: number, storageKey: string, originalName?: string, md5Hash?: string) =>
      ipcRenderer.invoke("payments:updateDocument", { id, storageKey, originalName, md5Hash }),
    delete: (id: number) => ipcRenderer.invoke("payments:delete", id),
  },
  invoices: {
    list: (profileId: number) => ipcRenderer.invoke("invoices:list", profileId),
    get: (id: number) => ipcRenderer.invoke("invoices:get", id),
    create: (data: any) => ipcRenderer.invoke("invoices:create", data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke("invoices:update", { id, data }),
    updateDocument: (id: number, storageKey: string, originalName?: string, md5Hash?: string) =>
      ipcRenderer.invoke("invoices:updateDocument", { id, storageKey, originalName, md5Hash }),
    markPaid: (id: number) => ipcRenderer.invoke("invoices:markPaid", id),
    delete: (id: number) => ipcRenderer.invoke("invoices:delete", id),
  },
  transactions: {
    list: (profileId: number) => ipcRenderer.invoke("transactions:list", profileId),
    get: (id: number) => ipcRenderer.invoke("transactions:get", id),
    create: (data: any) => ipcRenderer.invoke("transactions:create", data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke("transactions:update", { id, data }),
    updateDocument: (id: number, storageKey: string, originalName?: string, md5Hash?: string) =>
      ipcRenderer.invoke("transactions:updateDocument", { id, storageKey, originalName, md5Hash }),
    delete: (id: number) => ipcRenderer.invoke("transactions:delete", id),
    applyTagRules: (profileId: number, rules: any[]) =>
      ipcRenderer.invoke("transactions:applyTagRules", { profileId, rules }),
    checkDuplicates: (profileId: number, transactions: any[]) =>
      ipcRenderer.invoke("transactions:checkDuplicates", { profileId, transactions }),
    aggregateByTag: (profileId: number, startDate?: string, endDate?: string) =>
      ipcRenderer.invoke("transactions:aggregateByTag", { profileId, startDate, endDate }),
    aggregateByType: (profileId: number, startDate?: string, endDate?: string) =>
      ipcRenderer.invoke("transactions:aggregateByType", { profileId, startDate, endDate }),
    aggregateByPeriod: (profileId: number, granularity: "day" | "week" | "month" | "year", startDate?: string, endDate?: string) =>
      ipcRenderer.invoke("transactions:aggregateByPeriod", { profileId, granularity, startDate, endDate }),
    aggregateByDescription: (profileId: number, descriptionSubstrings: string[], startDate?: string, endDate?: string) =>
      ipcRenderer.invoke("transactions:aggregateByDescription", { profileId, descriptionSubstrings, startDate, endDate }),
  },
  tagRules: {
    list: (profileId: number) => ipcRenderer.invoke("tagRules:list", profileId),
    create: (data: any) => ipcRenderer.invoke("tagRules:create", data),
    update: (id: number, data: any) => ipcRenderer.invoke("tagRules:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("tagRules:delete", id),
    replaceAll: (profileId: number, rules: any[]) =>
      ipcRenderer.invoke("tagRules:replaceAll", { profileId, rules }),
  },
  csvImport: {
    parse: (csvText: string) => ipcRenderer.invoke("csvImport:parse", csvText),
    detectMapping: (headers: string[], sampleRows: any[], customPrompt?: string) =>
      ipcRenderer.invoke("csvImport:detectMapping", { headers, sampleRows, customPrompt }),
    applyMapping: (rows: any[], mapping: any[]) =>
      ipcRenderer.invoke("csvImport:applyMapping", { rows, mapping }),
    classify: (transactions: any[], existingTags: any[], customPrompt?: string) =>
      ipcRenderer.invoke("csvImport:classify", { transactions, existingTags, customPrompt }),
    commit: (profileId: number, transactions: any[]) =>
      ipcRenderer.invoke("csvImport:commit", { profileId, transactions }),
    buildMappingPrompt: (headers: string[], sampleRows: any[]) =>
      ipcRenderer.invoke("csvImport:buildMappingPrompt", { headers, sampleRows }),
    buildClassifyPrompt: (transactions: any[], existingTags: any[]) =>
      ipcRenderer.invoke("csvImport:buildClassifyPrompt", { transactions, existingTags }),
    runPrompt: (prompt: string) =>
      ipcRenderer.invoke("csvImport:runPrompt", prompt),
  },
  ingredients: {
    list: (profileId: number) => ipcRenderer.invoke("ingredients:list", profileId),
    get: (id: number) => ipcRenderer.invoke("ingredients:get", id),
    create: (data: any) => ipcRenderer.invoke("ingredients:create", data),
    update: (id: number, data: any) => ipcRenderer.invoke("ingredients:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("ingredients:delete", id),
    listPriceHistory: (ingredientId: number) => ipcRenderer.invoke("ingredients:listPriceHistory", ingredientId),
    addPriceHistory: (data: any) => ipcRenderer.invoke("ingredients:addPriceHistory", data),
    deletePriceHistory: (id: number) => ipcRenderer.invoke("ingredients:deletePriceHistory", id),
    listBrands: (ingredientId: number) => ipcRenderer.invoke("ingredients:listBrands", ingredientId),
    addBrand: (data: any) => ipcRenderer.invoke("ingredients:addBrand", data),
    updateBrand: (id: number, data: any) => ipcRenderer.invoke("ingredients:updateBrand", { id, data }),
    deleteBrand: (id: number) => ipcRenderer.invoke("ingredients:deleteBrand", id),
  },
  recipes: {
    list: (profileId: number) => ipcRenderer.invoke("recipes:list", profileId),
    get: (id: number) => ipcRenderer.invoke("recipes:get", id),
    create: (data: any) => ipcRenderer.invoke("recipes:create", data),
    update: (id: number, data: any) => ipcRenderer.invoke("recipes:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("recipes:delete", id),
    getIngredients: (recipeId: number) => ipcRenderer.invoke("recipes:getIngredients", recipeId),
    setIngredients: (recipeId: number, items: any[]) => ipcRenderer.invoke("recipes:setIngredients", { recipeId, items }),
    getNutrition: (recipeId: number) => ipcRenderer.invoke("recipes:getNutrition", recipeId),
    getCost: (recipeId: number) => ipcRenderer.invoke("recipes:getCost", recipeId),
  },
  mealPlans: {
    list: (profileId: number) => ipcRenderer.invoke("mealPlans:list", profileId),
    get: (id: number) => ipcRenderer.invoke("mealPlans:get", id),
    create: (data: any) => ipcRenderer.invoke("mealPlans:create", data),
    update: (id: number, data: any) => ipcRenderer.invoke("mealPlans:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("mealPlans:delete", id),
    listEntries: (mealPlanId: number) => ipcRenderer.invoke("mealPlans:listEntries", mealPlanId),
    createEntry: (data: any) => ipcRenderer.invoke("mealPlans:createEntry", data),
    updateEntry: (id: number, data: any) => ipcRenderer.invoke("mealPlans:updateEntry", { id, data }),
    deleteEntry: (id: number) => ipcRenderer.invoke("mealPlans:deleteEntry", id),
    getDailyNutrition: (mealPlanId: number, date: string) =>
      ipcRenderer.invoke("mealPlans:getDailyNutrition", { mealPlanId, date }),
    getLeftovers: (mealPlanId: number, date: string, recipeId: number) =>
      ipcRenderer.invoke("mealPlans:getLeftovers", { mealPlanId, date, recipeId }),
    syncToCalendar: (mealPlanId: number, profileId: number) =>
      ipcRenderer.invoke("mealPlans:syncToCalendar", { mealPlanId, profileId }),
  },
  shoppingLists: {
    list: (profileId: number) => ipcRenderer.invoke("shoppingLists:list", profileId),
    get: (id: number) => ipcRenderer.invoke("shoppingLists:get", id),
    create: (data: any) => ipcRenderer.invoke("shoppingLists:create", data),
    update: (id: number, data: any) => ipcRenderer.invoke("shoppingLists:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("shoppingLists:delete", id),
    listItems: (shoppingListId: number) => ipcRenderer.invoke("shoppingLists:listItems", shoppingListId),
    addItem: (data: any) => ipcRenderer.invoke("shoppingLists:addItem", data),
    updateItem: (id: number, data: any) => ipcRenderer.invoke("shoppingLists:updateItem", { id, data }),
    deleteItem: (id: number) => ipcRenderer.invoke("shoppingLists:deleteItem", id),
    generateFromPlan: (mealPlanId: number, profileId: number) =>
      ipcRenderer.invoke("shoppingLists:generateFromPlan", { mealPlanId, profileId }),
    linkTransaction: (shoppingListId: number, transactionId: number) =>
      ipcRenderer.invoke("shoppingLists:linkTransaction", { shoppingListId, transactionId }),
  },
  mealBudgets: {
    list: (profileId: number) => ipcRenderer.invoke("mealBudgets:list", profileId),
    create: (data: any) => ipcRenderer.invoke("mealBudgets:create", data),
    update: (id: number, data: any) => ipcRenderer.invoke("mealBudgets:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("mealBudgets:delete", id),
    getSpending: (profileId: number, startDate: string, endDate: string) =>
      ipcRenderer.invoke("mealBudgets:getSpending", { profileId, startDate, endDate }),
  },
  profiles: {
    list: () => ipcRenderer.invoke("profiles:list"),
    get: (id: number) => ipcRenderer.invoke("profiles:get", id),
    create: (data: { name: string; type: "personal" | "corporate" }) =>
      ipcRenderer.invoke("profiles:create", data),
    update: (id: number, data: { name?: string; type?: "personal" | "corporate" }) =>
      ipcRenderer.invoke("profiles:update", { id, data }),
    delete: (id: number) => ipcRenderer.invoke("profiles:delete", id),
    touch: (id: number) => ipcRenderer.invoke("profiles:touch", id),
  },
  minio: {
    upload: (payload: { name: string; mime: string; data: Uint8Array }) =>
      ipcRenderer.invoke("minio:upload", payload),
    getUrl: (objectName: string) =>
      ipcRenderer.invoke("minio:getUrl", objectName),
    download: (objectName: string) =>
      ipcRenderer.invoke("minio:download", objectName),
  },
  migrations: {
    checkStatus: () => ipcRenderer.invoke("migrations:checkStatus"),
    checkPermissions: () => ipcRenderer.invoke("migrations:checkPermissions"),
    run: () => ipcRenderer.invoke("migrations:run"),
  },
  workspace: {
    listRecent: () => ipcRenderer.invoke("workspace:listRecent"),
    open: (folderPath: string) => ipcRenderer.invoke("workspace:open", folderPath),
    create: (folderPath: string, config?: any) =>
      ipcRenderer.invoke("workspace:create", folderPath, config),
    showOpenDialog: () => ipcRenderer.invoke("workspace:showOpenDialog"),
    showCreateDialog: () => ipcRenderer.invoke("workspace:showCreateDialog"),
    getConfig: () => ipcRenderer.invoke("workspace:getConfig"),
    updateConfig: (updates: any) => ipcRenderer.invoke("workspace:updateConfig", updates),
    removeRecent: (folderPath: string) =>
      ipcRenderer.invoke("workspace:removeRecent", folderPath),
    getCurrent: () => ipcRenderer.invoke("workspace:getCurrent"),
    testMySQL: (config: any) => ipcRenderer.invoke("settings:testMySQL", config),
    testMinIO: (config: any) => ipcRenderer.invoke("settings:testMinIO", config),
    testSqlite: (config: any) => ipcRenderer.invoke("settings:testSqlite", config),
  },
  window: {
    openNotes: (noteId?: number) =>
      ipcRenderer.invoke("window:openNotes", noteId),
    openWorkspace: () => ipcRenderer.invoke("window:openWorkspace"),
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggleMaximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
