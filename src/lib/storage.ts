import "server-only";
import crypto from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, features, isProduction } from "@/lib/env";
import { trackUsage } from "@/server/usage";

/**
 * Private object storage. Production uses any S3-compatible bucket
 * (Cloudflare R2 recommended). Development falls back to ./.storage on disk.
 *
 * Files are never public: the app streams them through /api/files after an
 * access check, or hands out short-lived signed URLs.
 */

export type UploadPurpose = "resource" | "project-source" | "project-image";

type Rule = { maxBytes: number; mimes: Record<string, string[]> };

export const uploadRules: Record<UploadPurpose, Rule> = {
  resource: {
    maxBytes: 50 * 1024 * 1024,
    mimes: {
      "application/pdf": ["pdf"],
      "image/png": ["png"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/webp": ["webp"],
      "video/mp4": ["mp4"],
    },
  },
  "project-source": { maxBytes: 100 * 1024 * 1024, mimes: { "application/zip": ["zip"] } },
  "project-image": {
    maxBytes: 5 * 1024 * 1024,
    mimes: { "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"] },
  },
};

const localRoot = path.join(process.cwd(), ".storage");
let s3: S3Client | null = null;

function client() {
  s3 ??= new S3Client({
    region: env.S3_REGION ?? "auto",
    endpoint: env.S3_ENDPOINT,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });
  return s3;
}

function assertStorage() {
  if (!features.objectStorage && isProduction) throw new Error("Object storage (S3_*) is not configured");
}

/** Server-generated keys only — user file names never become paths. */
export function newObjectKey(purpose: UploadPurpose, ownerId: string, extension: string) {
  const ext = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${purpose}/${ownerId}/${crypto.randomUUID()}.${ext}`;
}

const localPath = (key: string) => {
  if (!/^[a-z-]+\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/.test(key)) throw new Error("Invalid object key");
  return path.join(localRoot, ...key.split("/"));
};

/** Validates declared type/size against the purpose's allow-list. Returns the extension to use. */
export function validateUpload(purpose: UploadPurpose, fileName: string, mime: string, size: number) {
  const rule = uploadRules[purpose];
  const allowedExts = rule.mimes[mime];
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExts) return { error: "This file type isn't allowed." as const };
  if (!allowedExts.includes(ext)) return { error: "The file extension doesn't match its type." as const };
  if (size <= 0 || size > rule.maxBytes) return { error: `Files must be under ${Math.round(rule.maxBytes / 1024 / 1024)} MB.` as const };
  return { ext };
}

/** Magic-byte check after upload so a renamed executable can't pose as a PDF. */
export function sniffMatches(mime: string, head: Uint8Array) {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (mime) {
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46);
    case "application/zip":
      return starts(0x50, 0x4b, 0x03, 0x04) || starts(0x50, 0x4b, 0x05, 0x06);
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45;
    case "video/mp4":
      return head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
    default:
      return false;
  }
}

/**
 * Where the browser should send the file. Object storage: a presigned PUT
 * (direct to the bucket, so large ZIPs don't pass through serverless limits).
 * Development: our own upload route.
 */
export async function createUploadTarget(key: string, mime: string) {
  assertStorage();
  if (!features.objectStorage) return { url: `/api/uploads/local?key=${encodeURIComponent(key)}`, method: "PUT" as const };
  await trackUsage("r2", "writes");
  const url = await getSignedUrl(client(), new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: mime }), {
    expiresIn: 600,
  });
  return { url, method: "PUT" as const };
}

export async function writeLocalObject(key: string, body: Uint8Array) {
  if (features.objectStorage || isProduction) throw new Error("Local storage is disabled");
  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function objectInfo(key: string) {
  assertStorage();
  if (!features.objectStorage) {
    try {
      const s = await stat(localPath(key));
      return { size: s.size };
    } catch {
      return null;
    }
  }
  try {
    const head = await client().send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return { size: Number(head.ContentLength ?? 0) };
  } catch {
    return null;
  }
}

/** Reads an object (optionally just a byte range). */
export async function readObject(key: string, range?: { start: number; end: number }) {
  assertStorage();
  if (!features.objectStorage) {
    const buf = await readFile(localPath(key));
    return range ? buf.subarray(range.start, range.end + 1) : buf;
  }
  await trackUsage("r2", "reads");
  const res = await client().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Range: range ? `bytes=${range.start}-${range.end}` : undefined }),
  );
  return Buffer.from(await res.Body!.transformToByteArray());
}

/** Streams an object for the file route. */
export async function streamObject(key: string, range?: { start: number; end: number }) {
  assertStorage();
  if (!features.objectStorage) {
    const buf = await readObject(key, range);
    return new Response(new Uint8Array(buf)).body!;
  }
  await trackUsage("r2", "reads");
  const res = await client().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Range: range ? `bytes=${range.start}-${range.end}` : undefined }),
  );
  return res.Body!.transformToWebStream();
}

export async function deleteObject(key: string) {
  assertStorage();
  if (!features.objectStorage) {
    await rm(localPath(key), { force: true });
    return;
  }
  await trackUsage("r2", "writes");
  await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
