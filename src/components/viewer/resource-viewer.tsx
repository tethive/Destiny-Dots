"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, MonitorX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { presentResource, type Presentation } from "@/lib/embed";
import { cn } from "@/lib/utils";

const PdfViewer = dynamic(() => import("@/components/viewer/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <LoaderCircle className="animate-spin" />
    </div>
  ),
});

export type ViewerResource = {
  id: string;
  title: string;
  type: string;
  duration?: string | null;
  url: string;
  fileKey?: string | null;
  fileMime?: string | null;
  embeddable?: boolean | null;
};

function Frame({ src, title, sandboxed }: { src: string; title: string; sandboxed?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-full w-full bg-black/5 dark:bg-white/5">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <LoaderCircle className="animate-spin" />
        </div>
      )}
      <iframe
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        // Third-party pages can't navigate the app or open downloads.
        sandbox={sandboxed ? "allow-scripts allow-same-origin allow-popups allow-presentation" : undefined}
      />
    </div>
  );
}

export function ResourceBody({ resource, presentation }: { resource: ViewerResource; presentation: Presentation }) {
  switch (presentation.kind) {
    case "video-embed":
      return (
        <div className="flex h-full items-center justify-center bg-black">
          <div className="aspect-video max-h-full w-full">
            <Frame src={presentation.src} title={resource.title} />
          </div>
        </div>
      );
    case "doc-embed":
      return <Frame src={presentation.src} title={resource.title} sandboxed />;
    case "page":
      return <Frame src={presentation.src} title={resource.title} sandboxed />;
    case "pdf":
      return <PdfViewer src={presentation.src} />;
    case "image":
      return (
        <div className="flex h-full items-center justify-center overflow-auto bg-muted/30 p-4" onContextMenu={(e) => e.preventDefault()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={presentation.src} alt={resource.title} className="max-h-full max-w-full rounded-lg object-contain select-none" draggable={false} />
        </div>
      );
    case "video-file":
      return (
        <div className="flex h-full items-center justify-center bg-black">
          <video
            src={presentation.src}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            className="max-h-full w-full"
          />
        </div>
      );
    case "external":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <MonitorX className="size-6" />
          </span>
          <p className="text-lg font-semibold">{presentation.host || "This site"} doesn&apos;t allow in-app viewing</p>
          <p className="max-w-md text-sm text-muted-foreground">
            The publisher blocks their page from being shown inside other apps. It will open in a new tab — this lesson stays open here.
          </p>
          <Button asChild size="lg" className="mt-2 rounded-full">
            <a href={presentation.src} target="_blank" rel="noopener noreferrer">
              Open in new tab <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </div>
      );
  }
}

/**
 * Full-screen reader for a list of resources with previous/next navigation.
 * `index` null = closed.
 */
export function ResourceViewer({
  resources,
  index,
  onIndexChange,
  actions,
}: {
  resources: ViewerResource[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  actions?: (resource: ViewerResource) => React.ReactNode;
}) {
  const resource = index === null ? null : resources[index];
  const presentation = resource ? presentResource(resource) : null;

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "IFRAME") return;
      if (e.key === "ArrowRight" && index < resources.length - 1) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, resources.length, onIndexChange]);

  return (
    <Dialog open={resource !== null} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[92vh] sm:w-[94vw] sm:max-w-[1400px] sm:rounded-2xl"
      >
        {resource && presentation && (
          <>
            <div className="flex items-center gap-2 border-b px-3 py-2 sm:px-4">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-sm font-semibold sm:text-base">{resource.title}</DialogTitle>
                <DialogDescription className="truncate text-xs">
                  <span className="font-mono uppercase">{resource.type.toLowerCase()}</span>
                  {resource.duration && ` · ${resource.duration}`}
                  {"provider" in presentation && ` · ${presentation.provider}`}
                  {resources.length > 1 && ` · ${index! + 1} of ${resources.length}`}
                </DialogDescription>
              </div>
              {actions?.(resource)}
              <Button variant="ghost" size="icon" aria-label="Previous resource" disabled={index === 0} onClick={() => onIndexChange(index! - 1)}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Next resource" disabled={index === resources.length - 1} onClick={() => onIndexChange(index! + 1)}>
                <ChevronRight />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => onIndexChange(null)}>
                <X />
              </Button>
            </div>
            <div className={cn("min-h-0 flex-1")}>
              <ResourceBody key={resource.id} resource={resource} presentation={presentation} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
