/**
 * Works out how a resource can be shown inside the app instead of sending the
 * student to another site.
 */
export type Presentation =
  | { kind: "video-embed"; src: string; provider: string }
  | { kind: "doc-embed"; src: string; provider: string }
  | { kind: "pdf"; src: string }
  | { kind: "image"; src: string }
  | { kind: "video-file"; src: string }
  | { kind: "page"; src: string }
  | { kind: "external"; src: string; host: string };

type ResourceLike = {
  url: string;
  fileKey?: string | null;
  fileMime?: string | null;
  embeddable?: boolean | null;
};

export const fileUrl = (key: string) => `/api/files/${key}`;

function youtubeId(u: URL) {
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return u.pathname.slice(1).split("/")[0];
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/);
    if (m) return m[1];
  }
  return null;
}

export function presentResource(r: ResourceLike): Presentation {
  if (r.fileKey && r.fileMime) {
    const src = fileUrl(r.fileKey);
    if (r.fileMime === "application/pdf") return { kind: "pdf", src };
    if (r.fileMime.startsWith("image/")) return { kind: "image", src };
    if (r.fileMime.startsWith("video/")) return { kind: "video-file", src };
  }

  let u: URL;
  try {
    u = new URL(r.url);
  } catch {
    return { kind: "external", src: r.url, host: "" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { kind: "external", src: "#", host: "" };
  const host = u.hostname.replace(/^www\./, "");

  // YouTube (videos and playlists) — privacy-enhanced player.
  const list = u.searchParams.get("list");
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) {
    const id = youtubeId(u);
    if (id) return { kind: "video-embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1${list ? `&list=${encodeURIComponent(list)}` : ""}` };
    if (list) return { kind: "video-embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&rel=0` };
  }
  const vimeo = host === "vimeo.com" && u.pathname.match(/^\/(\d+)/);
  if (vimeo) return { kind: "video-embed", provider: "Vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}?dnt=1` };
  const loom = host === "loom.com" && u.pathname.match(/^\/(?:share|embed)\/([\w-]+)/);
  if (loom) return { kind: "video-embed", provider: "Loom", src: `https://www.loom.com/embed/${loom[1]}` };

  // Google Docs, Slides, Sheets and Drive files.
  const gdoc = host === "docs.google.com" && u.pathname.match(/^\/(document|presentation|spreadsheets|forms)\/d\/([\w-]+)/);
  if (gdoc) {
    const [, type, id] = gdoc;
    const mode = type === "presentation" ? "embed" : type === "forms" ? "viewform?embedded=true" : "preview";
    return { kind: "doc-embed", provider: "Google Docs", src: `https://docs.google.com/${type}/d/${id}/${mode}` };
  }
  const drive = host === "drive.google.com" && u.pathname.match(/^\/file\/d\/([\w-]+)/);
  if (drive) return { kind: "doc-embed", provider: "Google Drive", src: `https://drive.google.com/file/d/${drive[1]}/preview` };

  if (/\.pdf$/i.test(u.pathname) && r.embeddable) return { kind: "doc-embed", provider: host, src: u.toString() };
  if (r.embeddable) return { kind: "page", src: u.toString() };
  return { kind: "external", src: u.toString(), host };
}

/** Whether a response's headers allow it to be framed by another origin. */
export function frameableFromHeaders(headers: Headers) {
  const xfo = headers.get("x-frame-options")?.toLowerCase();
  if (xfo && (xfo.includes("deny") || xfo.includes("sameorigin"))) return false;
  const csp = headers.get("content-security-policy")?.toLowerCase() ?? "";
  const ancestors = csp.match(/frame-ancestors([^;]*)/)?.[1]?.trim();
  if (ancestors !== undefined && !/(^|\s)(\*|https:)(\s|$)/.test(ancestors)) return false;
  return true;
}
