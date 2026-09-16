import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { streamObject } from "@/lib/storage";
import { authorizeFile } from "@/server/files";

/**
 * Serves private files after an access check. Files render inline in the app's
 * viewers; only purchased marketplace source archives may be downloaded.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: segments } = await ctx.params;
  const key = segments.join("/");
  if (!/^[a-z-]+\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/.test(key)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  const grant = await authorizeFile(key, session?.user ?? null);
  if (!grant) return NextResponse.json({ error: "Not found" }, { status: session ? 404 : 401 });

  const download = request.nextUrl.searchParams.get("download") === "1" && grant.downloadable;
  const headers = new Headers({
    "Content-Type": grant.mime,
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${grant.name.replace(/[^\w.\- ]/g, "_")}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    // Opened directly, a file can't run scripts or be framed by other sites.
    "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Accept-Ranges": "bytes",
  });

  // Range requests let the PDF and video viewers stream large files.
  const range = request.headers.get("range")?.match(/^bytes=(\d+)-(\d*)$/);
  if (range && grant.size > 0) {
    const start = Number(range[1]);
    const end = Math.min(range[2] ? Number(range[2]) : start + 2 * 1024 * 1024 - 1, grant.size - 1);
    if (start >= grant.size || start > end) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${grant.size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${grant.size}`);
    headers.set("Content-Length", String(end - start + 1));
    return new NextResponse(await streamObject(key, { start, end }), { status: 206, headers });
  }

  if (grant.size) headers.set("Content-Length", String(grant.size));
  return new NextResponse(await streamObject(key), { status: 200, headers });
}
