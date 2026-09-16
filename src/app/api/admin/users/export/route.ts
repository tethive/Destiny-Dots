import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { listUsers, userFilterFromParams } from "@/server/admin-users";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection and escape quotes.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filter = userFilterFromParams(Object.fromEntries(request.nextUrl.searchParams));
  const { users } = await listUsers(filter, true);
  const header = ["name", "email", "role", "plan", "enrolled_paths", "dots_completed", "suspended", "joined_at", "last_active_at"];
  const rows = users.map((u) =>
    [u.name, u.email, u.role, u.isPro ? "pro" : "free", u._count.enrollments, u._count.progress, u.banned ? "yes" : "no", u.createdAt, u.lastActiveAt]
      .map(cell)
      .join(","),
  );

  await db.auditLog.create({
    data: { actorId: session.user.id, action: "users.export", targetType: "User", meta: { count: users.length } },
  });

  return new NextResponse([header.join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="destiny-dots-users-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
