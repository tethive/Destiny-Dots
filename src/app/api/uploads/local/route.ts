import { NextResponse, type NextRequest } from "next/server";
import { features, isProduction } from "@/lib/env";
import { getSession, isAdmin } from "@/lib/session";
import { uploadRules, writeLocalObject, type UploadPurpose } from "@/lib/storage";
import { db } from "@/lib/db";

/** Development-only stand-in for a presigned bucket upload. Disabled once S3/R2 is configured. */
export async function PUT(request: NextRequest) {
  if (isProduction || features.objectStorage) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = request.nextUrl.searchParams.get("key") ?? "";
  const [purpose, owner] = key.split("/") as [UploadPurpose, string];
  const rule = uploadRules[purpose];
  if (!rule) return NextResponse.json({ error: "Invalid key" }, { status: 400 });

  if (purpose === "resource" && !isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (purpose !== "resource") {
    const project = await db.project.findUnique({ where: { id: owner }, select: { sellerId: true } });
    if (!project || (project.sellerId !== session.user.id && !isAdmin(session.user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > rule.maxBytes) return NextResponse.json({ error: "File too large" }, { status: 413 });
  await writeLocalObject(key, body);
  return new NextResponse(null, { status: 200 });
}
