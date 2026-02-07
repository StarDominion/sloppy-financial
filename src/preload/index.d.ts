import { ElectronAPI } from "@electron-toolkit/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      notes: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            title: string;
            content: string;
            created_at: string;
            updated_at: string;
          }>
        >;
        save: (note: {
          id?: number;
          title: string;
          content: string;
          profileId: number;
        }) => Promise<{
          id: number;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        }>;
        delete: (id: number) => Promise<void>;
      };
      bills: {
        listAutomatic: (profileId: number) => Promise<
          Array<{
            id: number;
            name: string;
            amount: number;
            description: string | null;
            frequency: "weekly" | "monthly" | "yearly";
            due_day: number;
            due_dates: string | null;
            generation_days: string | null;
            next_due_date: string | null;
            created_at: string;
          }>
        >;
        createAutomatic: (data: {
          name: string;
          amount: number;
          description?: string;
          frequency: "weekly" | "monthly" | "yearly";
          due_day: number;
          due_dates?: string;
          generation_days?: string;
          profileId: number;
        }) => Promise<number>;
        updateAutomatic: (
          id: number,
          data: Partial<{
            name: string;
            amount: number;
            description?: string;
            due_dates?: string;
            generation_days?: string;
          }>,
        ) => Promise<void>;
        deleteAutomatic: (id: number) => Promise<void>;
        generateManual: (id: number, date: Date | string) => Promise<void>;
        listRecords: (profileId: number) => Promise<
          Array<{
            id: number;
            automatic_bill_id: number | null;
            name: string;
            amount: number;
            description: string | null;
            due_date: string;
            status: "paid" | "unpaid";
            paid_date: string | null;
            document_path: string | null;
            document_original_name: string | null;
            document_storage_key: string | null;
            document_md5_hash: string | null;
            created_at: string;
          }>
        >;
        createRecord: (data: {
          name: string;
          amount: number;
          description?: string | null;
          due_date: string | Date;
          status?: "paid" | "unpaid";
          profileId: number;
        }) => Promise<number>;
        updateRecord: (
          id: number,
          data: {
            name?: string;
            amount?: number;
            description?: string | null;
            due_date?: string | Date;
            status?: "paid" | "unpaid";
          },
        ) => Promise<void>;
        payRecord: (id: number) => Promise<void>;
        updateRecordDocument: (id: number, storageKey: string, originalName?: string, md5Hash?: string) => Promise<void>;
      };
      contacts: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            notes: string | null;
            created_at: string;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
        } | null>;
        create: (data: {
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          profileId: number;
        }) => Promise<number>;
        update: (
          id: number,
          data: {
            name?: string;
            email?: string | null;
            phone?: string | null;
            address?: string | null;
            notes?: string | null;
          },
        ) => Promise<void>;
        delete: (id: number) => Promise<void>;
      };
      owedAmounts: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            contact_id: number;
            bill_record_id: number | null;
            amount: number;
            reason: string | null;
            is_paid: boolean;
            paid_date: string | null;
            created_at: string;
            contact_name?: string;
            bill_name?: string;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          contact_id: number;
          bill_record_id: number | null;
          amount: number;
          reason: string | null;
          is_paid: boolean;
          paid_date: string | null;
          created_at: string;
          contact_name?: string;
          bill_name?: string;
        } | null>;
        getForContact: (contactId: number) => Promise<
          Array<{
            id: number;
            contact_id: number;
            bill_record_id: number | null;
            amount: number;
            reason: string | null;
            is_paid: boolean;
            paid_date: string | null;
            created_at: string;
            contact_name?: string;
            bill_name?: string;
          }>
        >;
        create: (data: {
          contact_id: number;
          amount: number;
          reason?: string | null;
          bill_record_id?: number | null;
          profileId: number;
        }) => Promise<number>;
        update: (
          id: number,
          data: {
            amount?: number;
            reason?: string | null;
            bill_record_id?: number | null;
          },
        ) => Promise<void>;
        markPaid: (id: number) => Promise<void>;
        markUnpaid: (id: number) => Promise<void>;
        delete: (id: number) => Promise<void>;
        createFromBill: (
          billRecordId: number,
          contactId: number,
          profileId: number,
        ) => Promise<number>;
      };
      billOwedBy: {
        get: (
          billRecordId: number,
        ) => Promise<{ contact_id: number; contact_name: string } | null>;
        set: (billRecordId: number, contactId: number | null) => Promise<void>;
      };
      tags: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          name: string;
          color: string;
          created_at: string;
        } | null>;
        create: (data: { name: string; color?: string; profileId: number }) => Promise<number>;
        update: (
          id: number,
          data: {
            name?: string;
            color?: string;
          },
        ) => Promise<void>;
        delete: (id: number) => Promise<void>;
        getForBillRecord: (billRecordId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        setForBillRecord: (
          billRecordId: number,
          tagIds: number[],
        ) => Promise<void>;
        getForAutomaticBill: (automaticBillId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        setForAutomaticBill: (
          automaticBillId: number,
          tagIds: number[],
        ) => Promise<void>;
        getForTaxDocument: (taxDocumentId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        setForTaxDocument: (
          taxDocumentId: number,
          tagIds: number[],
        ) => Promise<void>;
        getForPayment: (paymentId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        setForPayment: (
          paymentId: number,
          tagIds: number[],
        ) => Promise<void>;
        getForInvoice: (invoiceId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        setForInvoice: (
          invoiceId: number,
          tagIds: number[],
        ) => Promise<void>;
        getForTransaction: (transactionId: number) => Promise<
          Array<{
            id: number;
            name: string;
            color: string;
            created_at: string;
          }>
        >;
        setForTransaction: (
          transactionId: number,
          tagIds: number[],
        ) => Promise<void>;
      };
      tax: {
        createDocument: (data: {
          year: number;
          description: string | null;
          document_path: string;
          file_name: string;
          storage_key?: string;
          md5_hash?: string;
          profileId: number;
        }) => Promise<number>;
        listDocuments: (profileId: number) => Promise<
          Array<{
            id: number;
            year: number;
            description: string | null;
            document_path: string;
            file_name: string;
            storage_key: string | null;
            md5_hash: string | null;
            created_at: string;
            updated_at: string;
          }>
        >;
        listDocumentsByYear: (year: number, profileId: number) => Promise<
          Array<{
            id: number;
            year: number;
            description: string | null;
            document_path: string;
            file_name: string;
            storage_key: string | null;
            md5_hash: string | null;
            created_at: string;
            updated_at: string;
          }>
        >;
        getDocument: (id: number) => Promise<{
          id: number;
          year: number;
          description: string | null;
          document_path: string;
          file_name: string;
          storage_key: string | null;
          md5_hash: string | null;
          created_at: string;
          updated_at: string;
        } | null>;
        updateDocument: (
          id: number,
          data: { description?: string | null; year?: number },
        ) => Promise<void>;
        deleteDocument: (id: number) => Promise<void>;
        getYears: (profileId: number) => Promise<number[]>;
      };
      payments: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            profile_id: number;
            contact_id: number;
            amount: number;
            category: string;
            description: string | null;
            payment_date: string;
            reference: string | null;
            document_path: string | null;
            document_storage_key: string | null;
            document_original_name: string | null;
            document_md5_hash: string | null;
            created_at: string;
            updated_at: string;
            contact_name?: string;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          profile_id: number;
          contact_id: number;
          amount: number;
          category: string;
          description: string | null;
          payment_date: string;
          reference: string | null;
          document_path: string | null;
          document_storage_key: string | null;
          document_original_name: string | null;
          document_md5_hash: string | null;
          created_at: string;
          updated_at: string;
          contact_name?: string;
        } | null>;
        create: (data: {
          profileId: number;
          contact_id: number;
          amount: number;
          category: string;
          description?: string | null;
          payment_date: string;
          reference?: string | null;
        }) => Promise<number>;
        update: (
          id: number,
          data: {
            contact_id?: number;
            amount?: number;
            category?: string;
            description?: string | null;
            payment_date?: string;
            reference?: string | null;
          },
        ) => Promise<void>;
        updateDocument: (
          id: number,
          storageKey: string,
          originalName?: string,
          md5Hash?: string,
        ) => Promise<void>;
        delete: (id: number) => Promise<void>;
      };
      invoices: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            profile_id: number;
            contact_id: number | null;
            invoice_number: string | null;
            amount: number;
            description: string | null;
            status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
            issue_date: string;
            due_date: string | null;
            paid_date: string | null;
            document_path: string | null;
            document_storage_key: string | null;
            document_original_name: string | null;
            document_md5_hash: string | null;
            created_at: string;
            updated_at: string;
            contact_name?: string;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          profile_id: number;
          contact_id: number | null;
          invoice_number: string | null;
          amount: number;
          description: string | null;
          status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
          issue_date: string;
          due_date: string | null;
          paid_date: string | null;
          document_path: string | null;
          document_storage_key: string | null;
          document_original_name: string | null;
          document_md5_hash: string | null;
          created_at: string;
          updated_at: string;
          contact_name?: string;
        } | null>;
        create: (data: {
          profileId: number;
          contact_id?: number | null;
          invoice_number?: string | null;
          amount: number;
          description?: string | null;
          status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
          issue_date: string;
          due_date?: string | null;
        }) => Promise<number>;
        update: (
          id: number,
          data: {
            contact_id?: number | null;
            invoice_number?: string | null;
            amount?: number;
            description?: string | null;
            status?: "draft" | "sent" | "paid" | "overdue" | "cancelled";
            issue_date?: string;
            due_date?: string | null;
            paid_date?: string | null;
          },
        ) => Promise<void>;
        updateDocument: (
          id: number,
          storageKey: string,
          originalName?: string,
          md5Hash?: string,
        ) => Promise<void>;
        markPaid: (id: number) => Promise<void>;
        delete: (id: number) => Promise<void>;
      };
      transactions: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            profile_id: number;
            type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
            amount: number;
            description: string | null;
            transaction_date: string;
            reference: string | null;
            bill_record_id: number | null;
            document_path: string | null;
            document_storage_key: string | null;
            document_original_name: string | null;
            document_md5_hash: string | null;
            created_at: string;
            updated_at: string;
            bill_name?: string;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          profile_id: number;
          type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
          amount: number;
          description: string | null;
          transaction_date: string;
          reference: string | null;
          bill_record_id: number | null;
          document_path: string | null;
          document_storage_key: string | null;
          document_original_name: string | null;
          document_md5_hash: string | null;
          created_at: string;
          updated_at: string;
          bill_name?: string;
        } | null>;
        create: (data: {
          profileId: number;
          type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
          amount: number;
          description?: string | null;
          transaction_date: string;
          reference?: string | null;
          bill_record_id?: number | null;
        }) => Promise<number>;
        update: (
          id: number,
          data: {
            type?: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
            amount?: number;
            description?: string | null;
            transaction_date?: string;
            reference?: string | null;
            bill_record_id?: number | null;
          },
        ) => Promise<void>;
        updateDocument: (
          id: number,
          storageKey: string,
          originalName?: string,
          md5Hash?: string,
        ) => Promise<void>;
        delete: (id: number) => Promise<void>;
        applyTagRules: (
          profileId: number,
          rules: Array<{
            substring: string;
            tag: string;
            replaceDescription: string;
          }>,
        ) => Promise<{ updated: number; errors: string[] }>;
        checkDuplicates: (
          profileId: number,
          transactions: Array<{
            transaction_date: string;
            amount: number;
          }>,
        ) => Promise<Set<string>>;
        aggregateByTag: (
          profileId: number,
          startDate?: string,
          endDate?: string,
        ) => Promise<
          Array<{
            tag_id: number | null;
            tag_name: string;
            tag_color: string;
            transaction_count: number;
            total_amount: number;
            deposit_amount: number;
            withdrawal_amount: number;
          }>
        >;
        aggregateByType: (
          profileId: number,
          startDate?: string,
          endDate?: string,
        ) => Promise<
          Array<{
            type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
            transaction_count: number;
            total_amount: number;
            avg_amount: number;
            min_amount: number;
            max_amount: number;
          }>
        >;
        aggregateByPeriod: (
          profileId: number,
          granularity: "day" | "week" | "month" | "year",
          startDate?: string,
          endDate?: string,
        ) => Promise<
          Array<{
            period: string;
            transaction_count: number;
            total_amount: number;
            deposit_amount: number;
            withdrawal_amount: number;
            net_amount: number;
          }>
        >;
        aggregateByDescription: (
          profileId: number,
          descriptionSubstrings: string[],
          startDate?: string,
          endDate?: string,
        ) => Promise<
          Array<{
            matched_substring: string;
            transaction_count: number;
            total_amount: number;
            earliest_date: string;
            latest_date: string;
          }>
        >;
      };
      tagRules: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            profile_id: number;
            substring: string;
            tag: string;
            replace_description: string | null;
            created_at: Date;
            updated_at: Date;
          }>
        >;
        create: (data: {
          profileId: number;
          substring: string;
          tag: string;
          replaceDescription?: string;
        }) => Promise<number>;
        update: (
          id: number,
          data: {
            substring?: string;
            tag?: string;
            replaceDescription?: string;
          },
        ) => Promise<void>;
        delete: (id: number) => Promise<void>;
        replaceAll: (
          profileId: number,
          rules: Array<{
            substring: string;
            tag: string;
            replaceDescription?: string;
          }>,
        ) => Promise<void>;
      };
      csvImport: {
        parse: (csvText: string) => Promise<{
          headers: string[];
          rows: Array<Record<string, string>>;
        }>;
        detectMapping: (
          headers: string[],
          sampleRows: Array<Record<string, string>>,
          customPrompt?: string,
        ) => Promise<
          Array<{
            csvColumn: string;
            dbColumn: string;
          }>
        >;
        applyMapping: (
          rows: Array<Record<string, string>>,
          mapping: Array<{ csvColumn: string; dbColumn: string }>,
        ) => Promise<
          Array<{
            _rowIndex: number;
            type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
            amount: number;
            description: string;
            transaction_date: string;
            reference: string;
          }>
        >;
        classify: (
          transactions: Array<{
            _rowIndex: number;
            type: string;
            amount: number;
            description: string;
            transaction_date: string;
            reference: string;
          }>,
          existingTags: Array<{ id: number; name: string }>,
          customPrompt?: string,
        ) => Promise<
          Array<{
            _rowIndex: number;
            type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
            suggestedTags: string[];
          }>
        >;
        commit: (
          profileId: number,
          transactions: Array<{
            _rowIndex: number;
            type: "deposit" | "withdrawal" | "transfer" | "payment" | "refund" | "fee" | "interest" | "other";
            amount: number;
            description: string;
            transaction_date: string;
            reference: string;
          }>,
        ) => Promise<{ imported: number; errors: string[] }>;
        buildMappingPrompt: (
          headers: string[],
          sampleRows: Array<Record<string, string>>,
        ) => Promise<string>;
        buildClassifyPrompt: (
          transactions: Array<{
            _rowIndex: number;
            type: string;
            amount: number;
            description: string;
          }>,
          existingTags: Array<{ id: number; name: string }>,
        ) => Promise<string>;
        runPrompt: (prompt: string) => Promise<string>;
      };
      profiles: {
        list: () => Promise<
          Array<{
            id: number;
            name: string;
            type: "personal" | "corporate";
            last_used_at: string | null;
            created_at: string;
            updated_at: string;
            note_count: number;
            bill_count: number;
            file_count: number;
            contact_count: number;
          }>
        >;
        get: (id: number) => Promise<{
          id: number;
          name: string;
          type: "personal" | "corporate";
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
          note_count: number;
          bill_count: number;
          file_count: number;
          contact_count: number;
        } | null>;
        create: (data: {
          name: string;
          type: "personal" | "corporate";
        }) => Promise<number>;
        update: (
          id: number,
          data: { name?: string; type?: "personal" | "corporate" },
        ) => Promise<void>;
        delete: (id: number) => Promise<void>;
        touch: (id: number) => Promise<void>;
      };
      reminders: {
        list: (profileId: number) => Promise<
          Array<{
            id: number;
            title: string;
            body: string;
            schedule_type: "once" | "cron";
            scheduled_at: string | null;
            cron_expr: string | null;
            is_active: number;
          }>
        >;
        create: (payload: {
          title: string;
          body: string;
          scheduleType: "once" | "cron";
          scheduledAt?: string | null;
          cronExpr?: string | null;
          profileId: number;
        }) => Promise<{
          id: number;
          title: string;
          body: string;
          schedule_type: "once" | "cron";
          scheduled_at: string | null;
          cron_expr: string | null;
          is_active: number;
        }>;
        delete: (id: number) => Promise<void>;
        testNotification: (title: string, body: string) => Promise<void>;
      };

      tax: {
        createDocument: (data: {
          year: number;
          description: string | null;
          document_path: string;
          file_name: string;
          storage_key?: string;
          md5_hash?: string;
          profileId: number;
        }) => Promise<number>;
        listDocuments: (profileId: number) => Promise<
          Array<{
            id: number;
            year: number;
            description: string | null;
            document_path: string;
            file_name: string;
            storage_key: string | null;
            md5_hash: string | null;
            created_at: string;
            updated_at: string;
          }>
        >;
        listDocumentsByYear: (
          year: number,
          profileId: number,
        ) => Promise<
          Array<{
            id: number;
            year: number;
            description: string | null;
            document_path: string;
            file_name: string;
            storage_key: string | null;
            md5_hash: string | null;
            created_at: string;
            updated_at: string;
          }>
        >;
        getDocument: (id: number) => Promise<{
          id: number;
          year: number;
          description: string | null;
          document_path: string;
          file_name: string;
          storage_key: string | null;
          md5_hash: string | null;
          created_at: string;
          updated_at: string;
        } | null>;
        updateDocument: (
          id: number,
          data: { description?: string | null; year?: number },
        ) => Promise<void>;
        deleteDocument: (id: number) => Promise<void>;
        getYears: (profileId: number) => Promise<number[]>;
      };
      minio: {
        upload: (payload: {
          name: string;
          mime: string;
          data: Uint8Array;
        }) => Promise<{
          objectName: string;
          bucket: string;
          originalName: string;
          md5Hash: string;
        }>;
        getUrl: (objectName: string) => Promise<string>;
        download: (objectName: string) => Promise<{
          data: number[];
          contentType: string;
        }>;
      };
      workspace: {
        listRecent: () => Promise<
          Array<{
            path: string;
            lastOpened: string;
          }>
        >;
        open: (folderPath: string) => Promise<{ success: boolean }>;
        create: (folderPath: string, config?: any) => Promise<{ success: boolean }>;
        showOpenDialog: () => Promise<string | null>;
        showCreateDialog: () => Promise<string | null>;
        getConfig: () => Promise<{
          database: {
            provider: "sqlite" | "mysql";
            mysql?: {
              host: string;
              port: number;
              user: string;
              password: string;
              database: string;
            };
          };
          storage: {
            provider: "local" | "minio";
            minio?: {
              endPoint: string;
              port: number;
              useSSL: boolean;
              accessKey: string;
              secretKey: string;
              bucket: string;
            };
          };
          ollama?: {
            host: string;
            model: string;
          };
        } | null>;
        updateConfig: (updates: any) => Promise<{ success: boolean }>;
        removeRecent: (folderPath: string) => Promise<{ success: boolean }>;
        getCurrent: () => Promise<string | null>;
        testMySQL: (config: {
          host: string;
          port: number;
          user: string;
          password: string;
          database: string;
        }) => Promise<{ success: boolean; message: string }>;
        testMinIO: (config: {
          endPoint: string;
          port: number;
          useSSL: boolean;
          accessKey: string;
          secretKey: string;
          bucket: string;
        }) => Promise<{ success: boolean; message: string }>;
        testSqlite: (config: {
          path: string;
        }) => Promise<{ success: boolean; message: string }>;
      };
      window: {
        openNotes: (noteId?: number) => Promise<void>;
        openWorkspace: () => Promise<void>;
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<void>;
        close: () => Promise<void>;
      };
    };
  }
}

export {};
