/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      notes: {
        list: () => Promise<
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
        }) => Promise<{
          id: number;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        }>;
      };
      bills: {
        listAutomatic: () => Promise<
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
        listRecords: () => Promise<
          Array<{
            id: number;
            automatic_bill_id: number | null;
            name: string;
            amount: number;
            due_date: string;
            status: "paid" | "unpaid";
            paid_date: string | null;
            document_path: string | null;
            created_at: string;
          }>
        >;
        createRecord: (data: {
          name: string;
          amount: number;
          due_date: string | Date;
          status?: "paid" | "unpaid";
        }) => Promise<number>;
        payRecord: (id: number) => Promise<void>;
        updateRecordDocument: (id: number, path: string) => Promise<void>;
      };
      contacts: {
        list: () => Promise<
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
      tags: {
        list: () => Promise<
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
        create: (data: { name: string; color?: string }) => Promise<number>;
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
      };
      reminders: {
        list: () => Promise<
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
      settings: {
        get: () => Promise<{
          mysql: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
          };
          minio: {
            endPoint: string;
            port: number;
            useSSL: boolean;
            accessKey: string;
            secretKey: string;
            bucket: string;
          };
        }>;
        update: (settings: any) => Promise<{ success: boolean }>;
        reset: () => Promise<{ success: boolean }>;
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
