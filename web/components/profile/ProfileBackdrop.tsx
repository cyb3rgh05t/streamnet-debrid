"use client";

import { useEffect, useState } from "react";
import { loadProfileBackdrops, type ProfileBackdrop } from "@/lib/tmdb";

const ROTATE_MS = 5_000;

/**
 * Rotating TMDB trending artwork behind the profile selection, like the apps. Landscape screens
 * get the 16:9 backdrop, portrait screens (phones) the 2:3 poster so the art is not cropped to a
 * narrow centre strip. Decorative only.
 */
export function ProfileBackdropLayer() {
  const [items, setItems] = useState<ProfileBackdrop[]>([]);
  const [index, setIndex] = useState(0);
  // Images up to this index are mounted: the visible one plus the next, preloaded.
  const [mounted, setMounted] = useState(1);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadProfileBackdrops().then((loaded) => {
      if (!cancelled) setItems(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-aspect-ratio: 1/1)");
    const update = () => setPortrait(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (items.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % items.length;
        setMounted((m) => Math.max(m, Math.min(next + 1, items.length - 1)));
        return next;
      });
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="profile-backdrop" aria-hidden="true">
      {items.slice(0, mounted + 1).map((item, position) => (
        <img
          key={item.backdrop}
          src={portrait ? item.poster : item.backdrop}
          alt=""
          decoding="async"
          className={position === index ? "is-active" : undefined}
        />
      ))}
    </div>
  );
}
