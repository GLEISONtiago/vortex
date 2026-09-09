import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadExpiresIn = 60 * 5;
const downloadExpiresIn = 60 * 5;

function required(name: "S3_ENDPOINT" | "S3_REGION" | "S3_BUCKET" | "S3_ACCESS_KEY" | "S3_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error("A configuração de armazenamento não está disponível.");
  return value;
}

function forcePathStyle() { return ["1", "true"].includes((process.env.S3_FORCE_PATH_STYLE || "").toLowerCase()); }

function endpoint() {
  try {
    const value = new URL(required("S3_ENDPOINT"));
    if (value.protocol !== "https:") throw new Error();
    return value.toString();
  } catch { throw new Error("A configuração de armazenamento não está disponível."); }
}

export const s3Bucket = () => required("S3_BUCKET");

export function createS3Client() {
  return new S3Client({
    endpoint: endpoint(),
    region: required("S3_REGION"),
    forcePathStyle: forcePathStyle(),
    credentials: { accessKeyId: required("S3_ACCESS_KEY"), secretAccessKey: required("S3_SECRET_KEY") },
  });
}

export async function createUploadUrl(storagePath: string, mimeType: string, size: number) {
  return getSignedUrl(createS3Client(), new PutObjectCommand({ Bucket: s3Bucket(), Key: storagePath, ContentType: mimeType, ContentLength: size }), { expiresIn: uploadExpiresIn });
}

export async function createDownloadUrl(storagePath: string) {
  return getSignedUrl(createS3Client(), new GetObjectCommand({ Bucket: s3Bucket(), Key: storagePath }), { expiresIn: downloadExpiresIn });
}

export async function headStoredObject(storagePath: string) {
  return createS3Client().send(new HeadObjectCommand({ Bucket: s3Bucket(), Key: storagePath }));
}

export const storageUrlExpiry = { upload: uploadExpiresIn, download: downloadExpiresIn };
