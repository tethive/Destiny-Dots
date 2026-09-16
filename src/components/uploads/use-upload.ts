"use client";

import { useState } from "react";

export type UploadedFile = { key: string; name: string; mime: string; size: number };

const extensionMime: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  zip: "application/zip",
};

/** Browsers report ZIPs inconsistently ("application/x-zip-compressed" on Windows), so trust the extension map. */
export const mimeFor = (file: File) => extensionMime[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? file.type;

/** Requests an upload URL, then PUTs the file with progress. */
export function useUpload() {
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File, purpose: "resource" | "project-source" | "project-image", projectId?: string): Promise<UploadedFile> {
    const mime = mimeFor(file);
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, fileName: file.name, mime, size: file.size, projectId }),
    });
    const target = (await res.json()) as { key?: string; url?: string; error?: string };
    if (!res.ok || !target.key || !target.url) throw new Error(target.error ?? "Upload failed");

    setProgress(0);
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", target.url!);
      xhr.setRequestHeader("Content-Type", mime);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
      xhr.onerror = () => reject(new Error("Upload failed — check your connection"));
      xhr.send(file);
    }).finally(() => setProgress(null));

    return { key: target.key, name: file.name, mime, size: file.size };
  }

  return { upload, progress };
}
