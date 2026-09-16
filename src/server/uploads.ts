import "server-only";
import { objectInfo, readObject, sniffMatches, uploadRules, deleteObject, type UploadPurpose } from "@/lib/storage";

/**
 * Step 2 of an upload: confirm the object really exists, is within limits and
 * its bytes match the declared type. Deletes the object if it doesn't.
 */
export async function verifyUploadedObject(key: string, purpose: UploadPurpose, mime: string) {
  if (!key.startsWith(`${purpose}/`)) return { error: "Invalid file reference." };
  const rule = uploadRules[purpose];
  if (!rule.mimes[mime]) return { error: "This file type isn't allowed." };
  const info = await objectInfo(key);
  if (!info) return { error: "Upload not found. Please try again." };
  if (info.size <= 0 || info.size > rule.maxBytes) {
    await deleteObject(key).catch(() => null);
    return { error: "File is too large." };
  }
  const head = await readObject(key, { start: 0, end: 15 });
  if (!sniffMatches(mime, new Uint8Array(head))) {
    await deleteObject(key).catch(() => null);
    return { error: "The file contents don't match its type." };
  }
  return { size: info.size };
}
