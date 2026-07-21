"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { NovelNote } from "@/lib/types";

// Renders a note's screenshot, lazy-loading it when the bulk tracker read only
// signalled its presence (hasScreenshot) without shipping the base64 blob.
// Falls back to an inline screenshotDataUrl when one is already present (e.g.
// anonymous/local notes that never round-tripped through the cloud read).
export function NoteScreenshot({
  note,
  className = "mt-5 w-full rounded-2xl object-contain"
}: {
  note: Pick<NovelNote, "id" | "screenshotDataUrl" | "hasScreenshot">;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | undefined>(note.screenshotDataUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDataUrl(note.screenshotDataUrl);
  }, [note.id, note.screenshotDataUrl]);

  useEffect(() => {
    if (dataUrl || !note.hasScreenshot) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tracker/notes/${encodeURIComponent(note.id)}/screenshot`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { screenshotDataUrl?: string | null } | null) => {
        if (cancelled) return;
        if (data && typeof data.screenshotDataUrl === "string") setDataUrl(data.screenshotDataUrl);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [note.id, note.hasScreenshot, dataUrl]);

  if (!dataUrl) {
    if (loading) {
      return <div className="mt-5 h-40 w-full animate-pulse rounded-2xl bg-border/40" aria-hidden />;
    }
    return null;
  }

  return (
    <Image
      alt="Attached screenshot"
      className={className}
      height={720}
      src={dataUrl}
      unoptimized
      width={1080}
    />
  );
}
