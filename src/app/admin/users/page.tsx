import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { initials } from "@/lib/utils";
import { FilterSelect } from "@/components/app/filter-select";
import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/session";
import { listUsers, userFilterFromParams } from "@/server/admin-users";

export const metadata: Metadata = { title: "Users" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const filter = userFilterFromParams(sp);
  const { users, total, pages } = await listUsers(filter);
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => typeof v === "string" && k !== "page") as [string, string][]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users"
        description={`${total} ${total === 1 ? "account" : "accounts"} match.`}
        actions={
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <a href={`/api/admin/users/export?${exportQs}`}>
              <Download /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative" action="/admin/users">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={filter.q} placeholder="Name or email" className="h-9 w-60 rounded-full pl-9" />
        </form>
        <FilterSelect
          param="plan"
          placeholder="Any plan"
          value={filter.plan}
          options={[
            { value: "pro", label: "Pro (active)" },
            { value: "free", label: "Free" },
          ]}
        />
        <FilterSelect
          param="role"
          placeholder="Any role"
          value={filter.role}
          options={[
            { value: "student", label: "Students" },
            { value: "admin", label: "Admins" },
          ]}
        />
        <FilterSelect param="status" placeholder="Any status" value={filter.status} options={[{ value: "banned", label: "Suspended" }]} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Paths</TableHead>
                <TableHead className="text-right">Dots done</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="pr-5">Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-5">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:underline">{u.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      {u.role === "admin" && <Badge variant="secondary">Admin</Badge>}
                      {u.banned && <Badge variant="destructive">Suspended</Badge>}
                    </Link>
                  </TableCell>
                  <TableCell>{u.isPro ? <Badge>Pro</Badge> : <span className="text-muted-foreground">Free</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{u._count.enrollments}</TableCell>
                  <TableCell className="text-right tabular-nums">{u._count.progress}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(u.createdAt)}</TableCell>
                  <TableCell className="pr-5 whitespace-nowrap text-muted-foreground">{fmt(u.lastActiveAt)}</TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No users match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {filter.page} of {pages}
          </span>
          <div className="flex gap-2">
            {filter.page > 1 && (
              <Link className="rounded-full border px-3 py-1 hover:bg-muted" href={`/admin/users?${new URLSearchParams({ ...Object.fromEntries(exportQs), page: String(filter.page - 1) })}`}>
                Previous
              </Link>
            )}
            {filter.page < pages && (
              <Link className="rounded-full border px-3 py-1 hover:bg-muted" href={`/admin/users?${new URLSearchParams({ ...Object.fromEntries(exportQs), page: String(filter.page + 1) })}`}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
