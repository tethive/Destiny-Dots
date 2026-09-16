export type ResumeData = {
  personal: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    links: { label: string; url: string }[];
    summary: string;
  };
  experience: { role: string; company: string; location: string; start: string; end: string; bullets: string }[];
  education: { degree: string; school: string; start: string; end: string; score: string }[];
  skills: string[];
  projects: { name: string; link: string; description: string }[];
  certifications: { name: string; issuer: string; year: string }[];
};

export function emptyResume(name = "", email = ""): ResumeData {
  return {
    personal: { fullName: name, title: "", email, phone: "", location: "", links: [], summary: "" },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };
}

/** Accept whatever was stored and fill any missing sections. */
export function normaliseResume(raw: unknown, name: string, email: string): ResumeData {
  const base = emptyResume(name, email);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ResumeData>;
  return {
    personal: { ...base.personal, ...(r.personal ?? {}), links: r.personal?.links ?? [] },
    experience: r.experience ?? [],
    education: r.education ?? [],
    skills: r.skills ?? [],
    projects: r.projects ?? [],
    certifications: r.certifications ?? [],
  };
}

export const bullets = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
