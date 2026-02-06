import { Client } from "minio";
import { randomUUID, createHash } from "crypto";
import { config } from "./config";

const minioClient = new Client({
  endPoint: config.minio.endPoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(config.minio.bucket);
  if (!exists) {
    await minioClient.makeBucket(config.minio.bucket, "us-east-1");
  }
}

export function computeMd5(data: Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

export async function uploadBuffer(
  name: string,
  mimeType: string,
  data: Buffer,
): Promise<{ objectName: string; bucket: string; originalName: string; md5Hash: string }> {
  await ensureBucket();

  // Use UUID as storage key instead of sanitized filename
  const ext = name.includes(".") ? "." + name.split(".").pop() : "";
  const objectName = `${randomUUID()}${ext}`;
  const md5Hash = computeMd5(data);

  await minioClient.putObject(
    config.minio.bucket,
    objectName,
    data,
    data.length,
    {
      "Content-Type": mimeType,
      "X-Original-Name": encodeURIComponent(name),
    },
  );

  return { objectName, bucket: config.minio.bucket, originalName: name, md5Hash };
}

export async function getPresignedUrl(objectName: string): Promise<string> {
  await ensureBucket();
  // Generate a presigned URL valid for 1 hour
  return minioClient.presignedGetObject(
    config.minio.bucket,
    objectName,
    60 * 60,
  );
}

export async function downloadObject(
  objectName: string,
): Promise<{ data: Buffer; contentType: string }> {
  await ensureBucket();

  const stat = await minioClient.statObject(config.minio.bucket, objectName);
  const contentType =
    stat.metaData?.["content-type"] || "application/octet-stream";

  const stream = await minioClient.getObject(config.minio.bucket, objectName);
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () =>
      resolve({ data: Buffer.concat(chunks), contentType }),
    );
    stream.on("error", reject);
  });
}
