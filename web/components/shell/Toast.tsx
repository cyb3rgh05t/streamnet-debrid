"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

export function Toast() {
  const { toast, setToast } = useApp();
  const preparing = Boolean(
    toast &&
    /Server-Konvertierung|server conversion|Browser-Wiedergabe wird vorbereitet|Preparing browser playback/i.test(
      toast,
    ),
  );
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(
      () => setToast(null),
      preparing ? 30000 : 3200,
    );
    return () => window.clearTimeout(timer);
  }, [preparing, setToast, toast]);

  if (!toast) return null;
  return (
    <button
      type="button"
      className={`toast ${preparing ? "toast-preparing" : ""}`}
      onClick={() => setToast(null)}
      aria-live="polite"
    >
      {toast}
    </button>
  );
}
