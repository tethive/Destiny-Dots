"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Eye, LoaderCircle, PencilLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { saveResume } from "@/server/actions/student";
import { bullets, type ResumeData } from "./types";

type Status = "idle" | "saving" | "saved";

export function ResumeBuilder({ initial, suggestedCerts }: { initial: ResumeData; suggestedCerts: string[] }) {
  const [data, setData] = useState<ResumeData>(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [exporting, setExporting] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const first = useRef(true);

  // Debounced autosave.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      const res = await saveResume(data, "classic");
      if (!res.ok) {
        toast.error(res.error);
        setStatus("idle");
      } else setStatus("saved");
    }, 1200);
    return () => clearTimeout(t);
  }, [data]);

  const set = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => setData((d) => ({ ...d, [key]: value }));
  const setPersonal = (patch: Partial<ResumeData["personal"]>) => setData((d) => ({ ...d, personal: { ...d.personal, ...patch } }));

  async function exportPdf() {
    setExporting(true);
    try {
      const [{ pdf }, { ResumeDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./resume-pdf")]);
      const blob = await pdf(<ResumeDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.personal.fullName || "resume").replace(/\s+/g, "-").toLowerCase()}-resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't create the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
          {status === "saving" ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Saving…
            </>
          ) : status === "saved" ? (
            <>
              <CheckCircle2 className="size-4 text-success" /> All changes saved
            </>
          ) : (
            "Changes save automatically"
          )}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border p-0.5 lg:hidden">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMobileView(v)}
                className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-sm capitalize", mobileView === v && "bg-muted font-medium")}
              >
                {v === "edit" ? <PencilLine className="size-3.5" /> : <Eye className="size-3.5" />} {v}
              </button>
            ))}
          </div>
          <Button size="lg" className="rounded-full" onClick={exportPdf} disabled={exporting}>
            {exporting ? <LoaderCircle className="animate-spin" /> : <Download />} Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        {/* Form */}
        <div className={cn("space-y-5", mobileView === "preview" && "hidden lg:block")}>
          <Section title="Personal info">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" value={data.personal.fullName} onChange={(v) => setPersonal({ fullName: v })} />
              <Field label="Target role / title" value={data.personal.title} onChange={(v) => setPersonal({ title: v })} placeholder="Data Analyst" />
              <Field label="Email" value={data.personal.email} onChange={(v) => setPersonal({ email: v })} type="email" />
              <Field label="Phone" value={data.personal.phone} onChange={(v) => setPersonal({ phone: v })} />
              <Field label="Location" value={data.personal.location} onChange={(v) => setPersonal({ location: v })} placeholder="Chennai, India" />
            </div>
            <div className="mt-3 space-y-1.5">
              <Label>Summary</Label>
              <Textarea
                rows={3}
                value={data.personal.summary}
                onChange={(e) => setPersonal({ summary: e.target.value })}
                placeholder="Two or three lines about what you do and what you're looking for."
              />
            </div>
            <ListEditor
              label="Links"
              addLabel="Add link"
              items={data.personal.links}
              onChange={(links) => setPersonal({ links })}
              create={() => ({ label: "", url: "" })}
              render={(l, update) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                  <Input value={l.label} onChange={(e) => update({ label: e.target.value })} placeholder="LinkedIn" />
                  <Input value={l.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://" />
                </div>
              )}
            />
          </Section>

          <Section title="Work experience">
            <ListEditor
              addLabel="Add experience"
              items={data.experience}
              onChange={(v) => set("experience", v)}
              create={() => ({ role: "", company: "", location: "", start: "", end: "", bullets: "" })}
              render={(e, update) => (
                <div className="grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={e.role} onChange={(x) => update({ role: x.target.value })} placeholder="Role" />
                    <Input value={e.company} onChange={(x) => update({ company: x.target.value })} placeholder="Company" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input value={e.location} onChange={(x) => update({ location: x.target.value })} placeholder="Location" />
                    <Input value={e.start} onChange={(x) => update({ start: x.target.value })} placeholder="Start (Jun 2024)" />
                    <Input value={e.end} onChange={(x) => update({ end: x.target.value })} placeholder="End (Present)" />
                  </div>
                  <Textarea rows={3} value={e.bullets} onChange={(x) => update({ bullets: x.target.value })} placeholder={"One achievement per line\nBuilt a Power BI dashboard used by 40 managers"} />
                </div>
              )}
            />
          </Section>

          <Section title="Education">
            <ListEditor
              addLabel="Add education"
              items={data.education}
              onChange={(v) => set("education", v)}
              create={() => ({ degree: "", school: "", start: "", end: "", score: "" })}
              render={(e, update) => (
                <div className="grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={e.degree} onChange={(x) => update({ degree: x.target.value })} placeholder="B.E. Computer Science" />
                    <Input value={e.school} onChange={(x) => update({ school: x.target.value })} placeholder="College / University" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input value={e.start} onChange={(x) => update({ start: x.target.value })} placeholder="Start" />
                    <Input value={e.end} onChange={(x) => update({ end: x.target.value })} placeholder="End" />
                    <Input value={e.score} onChange={(x) => update({ score: x.target.value })} placeholder="CGPA / %" />
                  </div>
                </div>
              )}
            />
          </Section>

          <Section title="Skills">
            <TagInput tags={data.skills} onChange={(v) => set("skills", v)} />
          </Section>

          <Section title="Projects">
            <ListEditor
              addLabel="Add project"
              items={data.projects}
              onChange={(v) => set("projects", v)}
              create={() => ({ name: "", link: "", description: "" })}
              render={(p, update) => (
                <div className="grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={p.name} onChange={(x) => update({ name: x.target.value })} placeholder="Project name" />
                    <Input value={p.link} onChange={(x) => update({ link: x.target.value })} placeholder="GitHub or live link" />
                  </div>
                  <Textarea rows={2} value={p.description} onChange={(x) => update({ description: x.target.value })} placeholder="What it does and what you used" />
                </div>
              )}
            />
          </Section>

          <Section title="Certifications">
            {suggestedCerts.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">From your paths:</span>
                {suggestedCerts
                  .filter((c) => !data.certifications.some((x) => x.name === c))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("certifications", [...data.certifications, { name: c, issuer: "", year: "" }])}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted"
                    >
                      <Plus className="size-3" /> {c}
                    </button>
                  ))}
              </div>
            )}
            <ListEditor
              addLabel="Add certification"
              items={data.certifications}
              onChange={(v) => set("certifications", v)}
              create={() => ({ name: "", issuer: "", year: "" })}
              render={(c, update) => (
                <div className="grid gap-2 sm:grid-cols-[2fr_1.5fr_1fr]">
                  <Input value={c.name} onChange={(x) => update({ name: x.target.value })} placeholder="Certification" />
                  <Input value={c.issuer} onChange={(x) => update({ issuer: x.target.value })} placeholder="Issuer" />
                  <Input value={c.year} onChange={(x) => update({ year: x.target.value })} placeholder="Year" />
                </div>
              )}
            />
          </Section>
        </div>

        {/* Live preview */}
        <div className={cn("lg:sticky lg:top-20 lg:self-start", mobileView === "edit" && "hidden lg:block")}>
          <div className="overflow-hidden rounded-2xl border bg-muted/40 p-3 shadow-xs sm:p-5">
            <div className="mx-auto aspect-[1/1.414] w-full max-w-[620px] overflow-y-auto rounded-md bg-white p-[6%] text-[#1c1830] shadow-2xl shadow-black/15 [font-size:clamp(8px,1.1vw,11px)]">
              <ResumePreview data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumePreview({ data }: { data: ResumeData }) {
  const p = data.personal;
  const heading = "mb-[0.6em] border-b border-[#e4e1ee] pb-[0.3em] text-[1.05em] font-bold tracking-[0.1em] text-[#5b3fd6] uppercase";
  return (
    <div className="leading-[1.45]">
      <p className="text-[2.1em] font-bold leading-tight">{p.fullName || "Your Name"}</p>
      {p.title && <p className="text-[1.15em] text-[#5b3fd6]">{p.title}</p>}
      <p className="mt-[0.5em] text-[0.95em] text-[#5f5b72]">
        {[p.email, p.phone, p.location, ...p.links.filter((l) => l.url).map((l) => l.label || l.url)].filter(Boolean).join("  ·  ")}
      </p>
      {p.summary && (
        <div className="mt-[1.3em]">
          <p className={heading}>Summary</p>
          <p>{p.summary}</p>
        </div>
      )}
      {data.experience.length > 0 && (
        <div className="mt-[1.3em]">
          <p className={heading}>Experience</p>
          {data.experience.map((e, i) => (
            <div key={i} className="mb-[0.8em]">
              <div className="flex justify-between gap-2">
                <p className="font-bold">
                  {e.role}
                  {e.company && ` · ${e.company}`}
                </p>
                <p className="shrink-0 text-[#5f5b72]">{[e.start, e.end].filter(Boolean).join(" – ")}</p>
              </div>
              {e.location && <p className="text-[#5f5b72]">{e.location}</p>}
              <ul className="mt-[0.2em] list-disc pl-[1.3em]">
                {bullets(e.bullets).map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.projects.length > 0 && (
        <div className="mt-[1.3em]">
          <p className={heading}>Projects</p>
          {data.projects.map((pr, i) => (
            <div key={i} className="mb-[0.7em]">
              <p className="font-bold">
                {pr.name} {pr.link && <span className="font-normal text-[#5b3fd6]">· {pr.link.replace(/^https?:\/\//, "")}</span>}
              </p>
              {pr.description && <p>{pr.description}</p>}
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div className="mt-[1.3em]">
          <p className={heading}>Education</p>
          {data.education.map((ed, i) => (
            <div key={i} className="mb-[0.6em] flex justify-between gap-2">
              <div>
                <p className="font-bold">{ed.degree}</p>
                <p className="text-[#5f5b72]">{[ed.school, ed.score].filter(Boolean).join(" · ")}</p>
              </div>
              <p className="shrink-0 text-[#5f5b72]">{[ed.start, ed.end].filter(Boolean).join(" – ")}</p>
            </div>
          ))}
        </div>
      )}
      {data.skills.length > 0 && (
        <div className="mt-[1.3em]">
          <p className={heading}>Skills</p>
          <div className="flex flex-wrap gap-[0.4em]">
            {data.skills.map((s) => (
              <span key={s} className="rounded-[0.3em] bg-[#f1eefb] px-[0.5em] py-[0.1em]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {data.certifications.length > 0 && (
        <div className="mt-[1.3em]">
          <p className={heading}>Certifications</p>
          {data.certifications.map((c, i) => (
            <div key={i} className="flex justify-between">
              <p>
                <b>{c.name}</b>
                {c.issuer && ` · ${c.issuer}`}
              </p>
              <p className="text-[#5f5b72]">{c.year}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-[2em] text-center text-[0.75em] text-[#a19db3]">Built with Destiny Dots</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ListEditor<T>({
  label,
  addLabel,
  items,
  onChange,
  create,
  render,
}: {
  label?: string;
  addLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className={cn(label && "mt-4")}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="relative rounded-xl border bg-muted/30 p-3 pr-11">
            {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="absolute top-3 right-2.5 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="lg" className="mt-3 rounded-full" onClick={() => onChange([...items, create()])}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (parts.length) onChange([...tags, ...parts]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pr-1 pl-2.5 text-sm">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-muted">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        className="mt-2"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Type a skill and press Enter (e.g. SQL, Python, Power BI)"
      />
    </div>
  );
}
