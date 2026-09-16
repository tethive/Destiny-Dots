import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { MessageActions } from "@/components/admin/message-actions";
import { FilterSelect } from "@/components/app/filter-select";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import type { MessageStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Messages" };

const fmt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const statuses = ["NEW", "REPLIED", "CLOSED", "SPAM"] as const;

export default async function AdminMessagesPage(props: PageProps<"/admin/messages">) {
  await requireAdmin();
  const { status } = await props.searchParams;
  const filter = statuses.includes(status as MessageStatus) ? (status as MessageStatus) : undefined;
  const [messages, counts] = await Promise.all([
    db.contactMessage.findMany({ where: filter ? { status: filter } : { status: { not: "SPAM" } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.contactMessage.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: MessageStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Messages"
        description={`${count("NEW")} new · ${count("REPLIED")} replied. Every message is also emailed to the team inbox — reply there or with the button below.`}
        actions={<FilterSelect param="status" placeholder="Open messages" value={filter} options={statuses.map((s) => ({ value: s, label: `${s.toLowerCase()} (${count(s)})` }))} />}
      />
      {messages.length === 0 ? (
        <EmptyState icon={Inbox} title="Inbox zero" description="Messages from the contact form appear here." />
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-2xl border bg-card p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {m.name} <span className="font-normal text-muted-foreground">· {m.email}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.topic} · {fmt(m.createdAt)}
                    {m.userId && " · signed-in user"}
                  </p>
                </div>
                <Badge variant={m.status === "NEW" ? "default" : m.status === "SPAM" ? "destructive" : "outline"}>{m.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{m.message}</p>
              <MessageActions id={m.id} email={m.email} topic={m.topic} status={m.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
