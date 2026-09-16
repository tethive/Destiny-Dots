import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PathForm } from "@/components/admin/path-form";
import { PageHeader } from "@/components/app/page-header";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New path" };

export default async function NewPathPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/paths" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All paths
      </Link>
      <PageHeader title="New path" description="Paths start as drafts. Add dots, then publish when it's ready." />
      <div className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
        <PathForm
          id={null}
          initial={{ title: "", slug: "", domainTag: "", summary: "", level: "BEGINNER", duration: "", roles: "", outcomes: "" }}
        />
      </div>
    </div>
  );
}
