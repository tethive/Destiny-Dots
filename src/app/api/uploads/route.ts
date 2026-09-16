import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { getSession, isAdmin } from "@/lib/session";
import { createUploadTarget, newObjectKey, validateUpload } from "@/lib/storage";

const bodySchema = z.object({
  purpose: z.enum(["resource", "project-source", "project-image"]),
  fileName: z.string().trim().min(1).max(200),
  mime: z.string().trim().max(100),
  size: z.number().int().positive(),
  projectId: z.string().max(40).optional(),
});

/**
 * Step 1 of an upload: checks permission and file rules, then returns a
 * short-lived URL the browser PUTs the file to. Step 2 (attaching the file to a
 * resource or project) re-verifies the stored object server-side.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });
  const user = session.user;

  if (!(await rateLimit("upload", user.id, 40, 60 * 60))) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  const input = parsed.data;

  if (input.purpose === "resource") {
    if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const project = input.projectId ? await db.project.findUnique({ where: { id: input.projectId }, select: { sellerId: true } }) : null;
    if (!project || (project.sellerId !== user.id && !isAdmin(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const check = validateUpload(input.purpose, input.fileName, input.mime, input.size);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: 400 });

  const owner = input.purpose === "resource" ? "admin" : input.projectId!;
  const key = newObjectKey(input.purpose, owner, check.ext);
  const target = await createUploadTarget(key, input.mime);
  return NextResponse.json({ key, ...target });
}
