import { createHash } from "crypto";
import { IStorageProvider, UploadResult, DownloadResult } from "./IStorageProvider";

/**
 * FileStorage - Central abstraction layer for file storage operations
 * Provides a unified interface for different storage providers (MinIO, S3, local filesystem, etc.)
 */
export class FileStorage {
  private static instance: FileStorage | null = null;
  private provider: IStorageProvider | null = null;

  private constructor() {}

  /**
   * Get the FileStorage singleton instance
   */
  public static getInstance(): FileStorage {
    if (!FileStorage.instance) {
      FileStorage.instance = new FileStorage();
    }
    return FileStorage.instance;
  }

  /**
   * Set the storage provider to use
   * @param provider Storage provider implementation
   */
  public static setProvider(provider: IStorageProvider): void {
    const instance = FileStorage.getInstance();
    instance.provider = provider;
  }

  /**
   * Get the current storage provider
   * @throws Error if no provider is configured
   */
  private getProvider(): IStorageProvider {
    if (!this.provider) {
      throw new Error("FileStorage: No storage provider configured. Call FileStorage.setProvider() first.");
    }
    return this.provider;
  }

  /**
   * Upload file from buffer
   * @param name Original filename
   * @param mimeType MIME type of the file
   * @param data File data as Buffer
   * @returns Upload result with storage key and metadata
   */
  public async upload(name: string, mimeType: string, data: Buffer): Promise<UploadResult> {
    return this.getProvider().upload(name, mimeType, data);
  }

  /**
   * Get a presigned/public URL for direct access
   * @param storageKey Unique storage identifier
   * @param expirySeconds Optional expiry time in seconds
   * @returns URL for accessing the file
   */
  public async getUrl(storageKey: string, expirySeconds?: number): Promise<string> {
    return this.getProvider().getUrl(storageKey, expirySeconds);
  }

  /**
   * Download file as buffer
   * @param storageKey Unique storage identifier
   * @returns Download result with data and content type
   */
  public async download(storageKey: string): Promise<DownloadResult> {
    return this.getProvider().download(storageKey);
  }

  /**
   * Delete file from storage
   * @param storageKey Unique storage identifier
   */
  public async delete(storageKey: string): Promise<void> {
    return this.getProvider().delete(storageKey);
  }

  /**
   * Check if file exists in storage
   * @param storageKey Unique storage identifier
   * @returns True if file exists, false otherwise
   */
  public async exists(storageKey: string): Promise<boolean> {
    return this.getProvider().exists(storageKey);
  }

  /**
   * Initialize storage provider
   */
  public async initialize(): Promise<void> {
    return this.getProvider().initialize();
  }

  /**
   * Compute MD5 hash of buffer data
   * @param data Buffer to hash
   * @returns MD5 hash as hex string
   */
  public static computeMd5(data: Buffer): string {
    return createHash("md5").update(data).digest("hex");
  }
}
