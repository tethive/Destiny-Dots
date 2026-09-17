"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, FileArchive, ImagePlus, LoaderCircle, Lock, Send, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect, Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpload } from "@/components/uploads/use-upload";
import { cn } from "@/lib/utils";
import { archiveProject, attachProjectFile, removeProjectFile, saveProject, saveSellerProfile, submitProject } from "@/server/actions/marketplace";

/* -------------------------------------------------------------------------- */
/* Seller profile                                                              */
/* -------------------------------------------------------------------------- */

export function SellerProfileForm({ initial, commissionPct, holdDays }: { initial?: { displayName: string; bio: string; payoutMethod: "UPI" | "BANK"; payoutName: string; payoutHint: string }; commissionPct: number; holdDays: number }) {
  const [method, setMethod] = useState<"UPI" | "BANK">(initial?.payoutMethod ?? "UPI");
  const [terms, setTerms] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        const common = {
          displayName: String(d.get("displayName") ?? ""),
          bio: String(d.get("bio") ?? ""),
          payoutName: String(d.get("payoutName") ?? ""),
          acceptTerms: terms as true,
        };
        start(async () => {
          const res = await saveSellerProfile(
            method === "UPI"
              ? { ...common, payoutMethod: "UPI", upiId: String(d.get("upiId") ?? "") }
              : { ...common, payoutMethod: "BANK", accountNumber: String(d.get("accountNumber") ?? ""), ifsc: String(d.get("ifsc") ?? "") },
          );
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seller name" hint="Shown on your listings">
          <Input name="displayName" defaultValue={initial?.displayName} maxLength={60} required />
        </Field>
        <Field label="Account holder name" hint="As on your bank / UPI account">
          <Input name="payoutName" defaultValue={initial?.payoutName} maxLength={80} required />
        </Field>
      </div>
      <Field label="Short bio (optional)">
        <Textarea name="bio" rows={2} defaultValue={initial?.bio} maxLength={300} placeholder="Final-year CSE student who loves building cloud apps." />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">Payout method</p>
        <div className="grid grid-cols-2 gap-2">
          {(["UPI", "BANK"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={cn("rounded-xl border p-3 text-left text-sm transition-colors", method === m ? "border-primary bg-primary/5" : "hover:bg-muted")}
            >
              <span className="font-medium">{m === "UPI" ? "UPI" : "Bank transfer"}</span>
              <span className="block text-xs text-muted-foreground">{m === "UPI" ? "Fastest — any UPI app" : "NEFT / IMPS"}</span>
            </button>
          ))}
        </div>
      </div>
      {initial && (
        <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Current payout account: {initial.payoutHint}. Re-enter details to change it.
        </p>
      )}
      {method === "UPI" ? (
        <Field label="UPI ID">
          <Input name="upiId" placeholder="yourname@okaxis" autoComplete="off" required />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account number">
            <Input name="accountNumber" inputMode="numeric" autoComplete="off" required />
          </Field>
          <Field label="IFSC">
            <Input name="ifsc" className="uppercase" autoComplete="off" required />
          </Field>
        </div>
      )}

      <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
        <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
        <span className="text-muted-foreground">
          I confirm every project I list is my own original work (or I have the right to sell it), contains no secrets or malware, and may be used by buyers for learning and
          portfolio reference. Destiny Dots keeps a {commissionPct}% commission and pays out after a {holdDays}-day buyer-protection period. Payout details are encrypted.
        </span>
      </label>

      <Button type="submit" size="lg" className="rounded-full" disabled={pending || !terms}>
        {pending && <LoaderCircle className="animate-spin" />} Save seller profile
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Listing editor                                                              */
/* -------------------------------------------------------------------------- */

export type EditorProject = {
  id: string;
  status: string;
  rejectionReason: string | null;
  title: string;
  summary: string;
  description: string;
  domainTags: string[];
  techStack: string[];
  level: string;
  priceInr: number;
  demoUrl: string | null;
  files: { id: string; kind: "COVER" | "SCREENSHOT" | "SOURCE"; key: string; name: string; size: number }[];
  hasBuyers: boolean;
};

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export function ListingEditor({ project, limits }: { project: EditorProject | null; limits: { min: number; max: number; commissionPct: number } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [domainTags, setDomainTags] = useState<string[]>(project?.domainTags ?? []);
  const [level, setLevel] = useState(project?.level ?? "BEGINNER");
  const [price, setPrice] = useState(project?.priceInr ?? 299);
  const { upload, progress } = useUpload();
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);

  const files = project?.files ?? [];
  const cover = files.find((f) => f.kind === "COVER");
  const screenshots = files.filter((f) => f.kind === "SCREENSHOT");
  const source = files.find((f) => f.kind === "SOURCE");
  const locked = project?.status === "PENDING";

  async function onFile(kind: "COVER" | "SCREENSHOT" | "SOURCE", file: File | undefined) {
    if (!project || !file) return;
    setUploadingKind(kind);
    try {
      const up = await upload(file, kind === "SOURCE" ? "project-source" : "project-image", project.id);
      const res = await attachProjectFile(project.id, { key: up.key, name: up.name, mime: up.mime, kind });
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingKind(null);
    }
  }

  const uploadLabel = (kind: string, idle: string) => (uploadingKind === kind ? `Uploading… ${progress ?? 0}%` : idle);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form
        className="space-y-4 rounded-2xl border bg-card p-5 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          start(async () => {
            const res = await saveProject(project?.id ?? null, {
              title: String(d.get("title") ?? ""),
              summary: String(d.get("summary") ?? ""),
              description: String(d.get("description") ?? ""),
              techStack: String(d.get("techStack") ?? ""),
              demoUrl: String(d.get("demoUrl") ?? ""),
              domainTags,
              level,
              priceInr: price,
            });
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            if (!project && res.id) router.push(`/marketplace/sell/${res.id}`);
            else router.refresh();
          });
        }}
      >
        <h2 className="font-semibold">Listing details</h2>
        <Field label="Title">
          <Input name="title" defaultValue={project?.title} maxLength={90} placeholder="Expense tracker with React, Node & MongoDB" />
        </Field>
        <Field label="One-line summary">
          <Input name="summary" defaultValue={project?.summary} maxLength={200} placeholder="A full-stack app with auth, charts and CSV export." />
        </Field>
        <Field label="Description" hint="Markdown supported. Explain features, setup steps, and what a buyer will learn.">
          <Textarea name="description" rows={10} defaultValue={project?.description} maxLength={12000} className="font-mono text-xs" />
        </Field>
        <Field label="Domains (up to 3)">
          <DomainMultiSelect value={domainTags} onChange={(v) => setDomainTags(v.slice(0, 3))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tech stack" hint="Comma-separated">
            <Input name="techStack" defaultValue={project?.techStack.join(", ")} placeholder="React, Node.js, MongoDB" />
          </Field>
          <Field label="Level">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </Field>
          <Field label={`Price (₹${limits.min}–₹${limits.max})`} hint={`You earn ₹${Math.max(0, price - Math.round((price * limits.commissionPct) / 100))} per sale after ${limits.commissionPct}% commission`}>
            <Input type="number" min={limits.min} max={limits.max} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </Field>
          <Field label="Live demo (optional)">
            <Input name="demoUrl" type="url" defaultValue={project?.demoUrl ?? ""} placeholder="https://" />
          </Field>
        </div>
        <Button type="submit" size="lg" className="rounded-full" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />} {project ? "Save changes" : "Create draft"}
        </Button>
        {project?.status === "APPROVED" && <p className="text-xs text-muted-foreground">Saving changes to a live listing sends it back for a quick review.</p>}
      </form>

      <div className="space-y-4">
        {project ? (
          <>
            {project.status === "REJECTED" && project.rejectionReason && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-semibold text-destructive">Changes requested</p>
                <p className="mt-1 whitespace-pre-wrap">{project.rejectionReason}</p>
              </div>
            )}
            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="font-semibold">Cover image</h2>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${cover.key}`} alt="Cover" className="aspect-[16/10] w-full rounded-xl border object-cover" />
              ) : (
                <p className="text-sm text-muted-foreground">A 16:10 screenshot of the app works best (PNG, JPG or WebP, under 5 MB).</p>
              )}
              <UploadButton accept="image/png,image/jpeg,image/webp" label={uploadLabel("COVER", cover ? "Replace cover" : "Upload cover")} icon={ImagePlus} disabled={Boolean(uploadingKind)} onFile={(f) => onFile("COVER", f)} />
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="font-semibold">Screenshots ({screenshots.length}/6)</h2>
              <div className="grid grid-cols-3 gap-2">
                {screenshots.map((s) => (
                  <div key={s.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${s.key}`} alt="" className="aspect-[16/10] w-full rounded-lg border object-cover" />
                    <RemoveFileButton id={s.id} />
                  </div>
                ))}
              </div>
              {screenshots.length < 6 && (
                <UploadButton accept="image/png,image/jpeg,image/webp" label={uploadLabel("SCREENSHOT", "Add screenshot")} icon={ImagePlus} disabled={Boolean(uploadingKind)} onFile={(f) => onFile("SCREENSHOT", f)} />
              )}
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="font-semibold">Source code</h2>
              {source ? (
                <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                  <FileArchive className="size-4 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{source.name}</span>
                  <span className="text-xs text-muted-foreground">{mb(source.size)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">One ZIP, up to 100 MB. Include a README with setup steps. Remove .env files, API keys and node_modules.</p>
              )}
              <UploadButton accept=".zip,application/zip" label={uploadLabel("SOURCE", source ? "Replace ZIP" : "Upload ZIP")} icon={UploadCloud} disabled={Boolean(uploadingKind)} onFile={(f) => onFile("SOURCE", f)} />
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-5 shadow-xs">
              {["DRAFT", "REJECTED"].includes(project.status) && (
                <ActionButton label="Submit for review" icon={Send} run={() => submitProject(project.id)} successHref={`/listing-submitted?id=${project.id}`} />
              )}
              {locked && <p className="text-sm text-muted-foreground">Waiting for review — usually within 2 working days.</p>}
              {project.status === "ARCHIVED" ? (
                <ActionButton variant="outline" label="Restore listing" icon={ArchiveRestore} run={() => archiveProject(project.id, false)} />
              ) : (
                project.status !== "DRAFT" && <ActionButton variant="outline" label="Hide listing" icon={Archive} run={() => archiveProject(project.id, true)} />
              )}
              <Button asChild variant="ghost" size="lg" className="rounded-full">
                <Link href="/marketplace/sell">Back to dashboard</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Create the draft first — then you can upload a cover image, screenshots and your source ZIP.</div>
        )}
      </div>
    </div>
  );
}

function UploadButton({ accept, label, icon: Icon, disabled, onFile }: { accept: string; label: string; icon: typeof UploadCloud; disabled: boolean; onFile: (f: File | undefined) => void }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-muted/40", disabled && "pointer-events-none opacity-60")}>
      {disabled && label.startsWith("Uploading") ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />} {label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          onFile(f);
        }}
      />
    </label>
  );
}

function RemoveFileButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Remove screenshot"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await removeProjectFile(id);
          if (!res.ok) toast.error(res.error);
          router.refresh();
        })
      }
      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-destructive opacity-0 shadow group-hover:opacity-100 focus:opacity-100"
    >
      {pending ? <LoaderCircle className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
    </button>
  );
}

function ActionButton({
  label,
  icon: Icon,
  run,
  variant,
  successHref,
}: {
  label: string;
  icon: typeof Send;
  run: () => Promise<{ ok: boolean; message?: string; error?: string }>;
  variant?: "outline";
  successHref?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="lg"
      variant={variant}
      className="rounded-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await run();
          if (!res.ok) toast.error(res.error);
          else if (successHref) return router.push(successHref);
          else toast.success(res.message);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Icon data-icon="inline-start" />} {label}
    </Button>
  );
}
