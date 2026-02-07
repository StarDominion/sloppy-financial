import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile, unlink, stat } from "fs/promises";
import { randomUUID } from "crypto";
import { IStorageProvider, UploadResult, DownloadResult } from "./IStorageProvider";
import { FileStorage } from "./FileStorage";

export interface LocalStorageConfig {
  basePath: string;
}

export class LocalStorageProvider implements IStorageProvider {
  private filesDir: string;

  constructor(config: LocalStorageConfig) {
    this.filesDir = join(config.basePath, "files");
  }

  public async initialize(): Promise<void> {
    if (!existsSync(this.filesDir)) {
      mkdirSync(this.filesDir, { recursive: true });
    }
  }

  public async upload(name: string, mimeType: string, data: Buffer): Promise<UploadResult> {
    const ext = name.includes(".") ? "." + name.split(".").pop() : "";
    const storageKey = `${randomUUID()}${ext}`;
    const filePath = join(this.filesDir, storageKey);
    const md5Hash = FileStorage.computeMd5(data);

    await writeFile(filePath, data);

    const metaPath = filePath + ".meta.json";
    await writeFile(
      metaPath,
      JSON.stringify({
        originalName: name,
        mimeType,
        md5Hash,
        uploadedAt: new Date().toISOString(),
      }),
    );

    return {
      storageKey,
      originalName: name,
      md5Hash,
    };
  }

  public async getUrl(storageKey: string): Promise<string> {
    const filePath = join(this.filesDir, storageKey);
    return `file://${filePath.replace(/\\/g, "/")}`;
  }

  public async download(storageKey: string): Promise<DownloadResult> {
    const filePath = join(this.filesDir, storageKey);
    const data = await readFile(filePath);

    let contentType = "application/octet-stream";
    const metaPath = filePath + ".meta.json";
    try {
      const metaRaw = await readFile(metaPath, "utf-8");
      const meta = JSON.parse(metaRaw);
      contentType = meta.mimeType || contentType;
    } catch {
      const ext = storageKey.split(".").pop()?.toLowerCase();
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    }

    return { data, contentType };
  }

  public async delete(storageKey: string): Promise<void> {
    const filePath = join(this.filesDir, storageKey);
    try {
      await unlink(filePath);
    } catch {
      /* ignore if missing */
    }
    try {
      await unlink(filePath + ".meta.json");
    } catch {
      /* ignore */
    }
  }

  public async exists(storageKey: string): Promise<boolean> {
    const filePath = join(this.filesDir, storageKey);
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
