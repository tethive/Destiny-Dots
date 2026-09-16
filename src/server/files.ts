import "server-only";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { isAdmin, type AppUser } from "@/lib/session";
import { readObject } from "@/lib/storage";
import { canOpenDot, getAccess } from "@/server/access";

export type FileGrant = { mime: string; name: string; size: number; downloadable: boolean };

/**
 * Decides whether `user` may read the object at `key`. Every stored file is
 * private; this is the single gate for serving them.
 */
export async function authorizeFile(key: string, user: AppUser | null): Promise<FileGrant | null> {
  const purpose = key.split("/")[0];

  if (purpose === "resource") {
    if (!user) return null;
    const r = await db.resource.findFirst({
      where: { fileKey: key },
      include: {
        dots: { include: { dot: { select: { id: true, pathId: true, isFree: true, path: { select: { isPublished: true } } } } } },
        certifications: { include: { certification: { select: { isPublished: true } } } },
      },
    });
    if (!r?.fileMime || !r.fileName) return null;
    const grant = { mime: r.fileMime, name: r.fileName, size: r.fileSize ?? 0, downloadable: false };
    if (isAdmin(user)) return grant;
    const access = await getAccess(user.id);
    const viaDot = r.dots.some(
      ({ dot }) => dot.path.isPublished && canOpenDot(access, dot) && (!r.isPremium || access.plan || access.paths.has(dot.pathId) || access.dots.has(dot.id)),
    );
    const viaCert = r.certifications.some(({ certification }) => certification.isPublished && (!r.isPremium || access.plan));
    return viaDot || viaCert ? grant : null;
  }

  const file = await db.projectFile.findUnique({
    where: { key },
    include: { project: { select: { id: true, sellerId: true, status: true } } },
  });
  if (!file) return null;
  const grant = { mime: file.mime, name: file.name, size: file.size, downloadable: file.kind === "SOURCE" };
  const owner = user && (user.id === file.project.sellerId || isAdmin(user));

  if (purpose === "project-image") {
    return file.project.status === "APPROVED" || owner ? { ...grant, downloadable: false } : null;
  }
  if (purpose === "project-source") {
    if (!user) return null;
    if (owner) return grant;
    return (await hasPurchased(user.id, file.project.id)) ? grant : null;
  }
  return null;
}

export async function hasPurchased(userId: string, projectId: string) {
  const p = await db.projectPurchase.findUnique({ where: { projectId_buyerId: { projectId, buyerId: userId } }, select: { status: true } });
  return p?.status === "PAID" || p?.status === "DISPUTED";
}

/* -------------------------------------------------------------------------- */
/* ZIP browsing for marketplace source files                                   */
/* -------------------------------------------------------------------------- */

const MAX_ENTRY_BYTES = 512 * 1024;
const MAX_TOTAL_UNCOMPRESSED = 500 * 1024 * 1024;
const textExtensions = new Set(
  "txt md markdown json js jsx ts tsx mjs cjs css scss sass less html htm xml svg yml yaml toml ini env example py rb go rs java kt kts swift c h cpp hpp cs php sql sh bash ps1 bat dockerfile gitignore gradle properties vue svelte astro r ipynb csv lock prisma graphql gql sol".split(" "),
);

export type ZipEntry = { path: string; size: number; isText: boolean };

type ZipObject = JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };

async function openZip(key: string) {
  const zip = await JSZip.loadAsync(await readObject(key), { checkCRC32: false });
  return zip;
}

export function isTextPath(path: string) {
  const name = path.split("/").pop()!.toLowerCase();
  if (["dockerfile", "makefile", "license", "readme", "procfile"].includes(name)) return true;
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  return textExtensions.has(ext);
}

export async function listZipEntries(key: string): Promise<ZipEntry[]> {
  const zip = await openZip(key);
  let total = 0;
  const entries: ZipEntry[] = [];
  zip.forEach((path, entry) => {
    if (entry.dir || path.startsWith("__MACOSX/") || path.split("/").some((seg) => seg === "..")) return;
    const size = (entry as ZipObject)._data?.uncompressedSize ?? 0;
    total += size;
    entries.push({ path, size, isText: isTextPath(path) });
  });
  if (total > MAX_TOTAL_UNCOMPRESSED) throw new Error("Archive expands beyond the allowed size");
  return entries.sort((a, b) => a.path.localeCompare(b.path)).slice(0, 5000);
}

export async function readZipText(key: string, path: string) {
  if (!isTextPath(path)) return { error: "Preview isn't available for this file type." };
  const zip = await openZip(key);
  const entry = zip.file(path) as ZipObject | null;
  if (!entry || entry.dir) return { error: "File not found in the archive." };
  if ((entry._data?.uncompressedSize ?? 0) > MAX_ENTRY_BYTES) return { error: "This file is too large to preview. Download the project to open it." };
  const text = await entry.async("string");
  return { text: text.slice(0, MAX_ENTRY_BYTES) };
}
