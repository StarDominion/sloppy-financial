import { Client } from "minio";
import { randomUUID } from "crypto";
import { IStorageProvider, UploadResult, DownloadResult } from "./IStorageProvider";
import { FileStorage } from "./FileStorage";

export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

/**
 * MinIO Storage Provider
 * Implements file storage using MinIO object storage
 */
export class MinioStorageProvider implements IStorageProvider {
  private client: Client;
  private bucket: string;

  constructor(config: MinioConfig) {
    this.client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
  }

  /**
   * Initialize MinIO - ensure bucket exists
   */
  public async initialize(): Promise<void> {
    await this.ensureBucket();
  }

  /**
   * Ensure the configured bucket exists, create if it doesn't
   */
  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, "us-east-1");
    }
  }

  /**
   * Upload file to MinIO
   * @param name Original filename
   * @param mimeType MIME type of the file
   * @param data File data as Buffer
   * @returns Upload result with storage key and metadata
   */
  public async upload(name: string, mimeType: string, data: Buffer): Promise<UploadResult> {
    await this.ensureBucket();

    // Use UUID as storage key instead of sanitized filename
    const ext = name.includes(".") ? "." + name.split(".").pop() : "";
    const storageKey = `${randomUUID()}${ext}`;
    const md5Hash = FileStorage.computeMd5(data);

    await this.client.putObject(this.bucket, storageKey, data, data.length, {
      "Content-Type": mimeType,
      "X-Original-Name": encodeURIComponent(name),
    });

    return {
      storageKey,
      originalName: name,
      md5Hash,
      metadata: {
        bucket: this.bucket,
      },
    };
  }

  /**
   * Get presigned URL for direct access
   * @param storageKey Unique storage identifier
   * @param expirySeconds Expiry time in seconds (default 1 hour)
   * @returns Presigned URL
   */
  public async getUrl(storageKey: string, expirySeconds: number = 60 * 60): Promise<string> {
    await this.ensureBucket();
    return this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
  }

  /**
   * Download file from MinIO
   * @param storageKey Unique storage identifier
   * @returns Download result with data and content type
   */
  public async download(storageKey: string): Promise<DownloadResult> {
    await this.ensureBucket();

    const stat = await this.client.statObject(this.bucket, storageKey);
    const contentType = stat.metaData?.["content-type"] || "application/octet-stream";

    const stream = await this.client.getObject(this.bucket, storageKey);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () =>
        resolve({
          data: Buffer.concat(chunks),
          contentType,
          metadata: stat.metaData,
        })
      );
      stream.on("error", reject);
    });
  }

  /**
   * Delete file from MinIO
   * @param storageKey Unique storage identifier
   */
  public async delete(storageKey: string): Promise<void> {
    await this.ensureBucket();
    await this.client.removeObject(this.bucket, storageKey);
  }

  /**
   * Check if file exists in MinIO
   * @param storageKey Unique storage identifier
   * @returns True if file exists, false otherwise
   */
  public async exists(storageKey: string): Promise<boolean> {
    try {
      await this.ensureBucket();
      await this.client.statObject(this.bucket, storageKey);
      return true;
    } catch (error) {
      return false;
    }
  }
}
