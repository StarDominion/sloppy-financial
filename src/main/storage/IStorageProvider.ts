export interface UploadResult {
  storageKey: string; // Unique identifier for the stored file (objectName in MinIO)
  originalName: string; // Original filename
  md5Hash: string; // MD5 checksum
  metadata?: Record<string, string>; // Provider-specific metadata
}

export interface DownloadResult {
  data: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface IStorageProvider {
  /**
   * Upload file from buffer
   * @param name Original filename
   * @param mimeType MIME type of the file
   * @param data File data as Buffer
   * @returns Upload result with storage key and metadata
   */
  upload(name: string, mimeType: string, data: Buffer): Promise<UploadResult>;

  /**
   * Get a presigned/public URL for direct access
   * @param storageKey Unique storage identifier
   * @param expirySeconds Optional expiry time in seconds (default provider-specific)
   * @returns URL for accessing the file
   */
  getUrl(storageKey: string, expirySeconds?: number): Promise<string>;

  /**
   * Download file as buffer
   * @param storageKey Unique storage identifier
   * @returns Download result with data and content type
   */
  download(storageKey: string): Promise<DownloadResult>;

  /**
   * Delete file from storage
   * @param storageKey Unique storage identifier
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Check if file exists in storage
   * @param storageKey Unique storage identifier
   * @returns True if file exists, false otherwise
   */
  exists(storageKey: string): Promise<boolean>;

  /**
   * Initialize storage provider (create buckets, check connections, etc.)
   */
  initialize(): Promise<void>;
}
