"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border bg-muted text-muted-foreground">
        <Store className="size-10" />
      </div>
    );
  }
  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border bg-muted" onContextMenu={(e) => e.preventDefault()}>
        <AnimatePresence mode="wait">
          <motion.img
            key={images[active]}
            src={`/api/files/${images[active]}`}
            alt={`${title} — image ${active + 1}`}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="size-full object-cover"
            draggable={false}
          />
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((key, i) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={cn("aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors", i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${key}`} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
