"use client";

import { useCallback, useEffect, useState } from "react";

const CHECK_EVERY_MS = 5 * 60 * 1000;

export function UpdateBanner({ currentVersion }: { currentVersion: string }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  const check = useCallback(async () => {
    if (currentVersion === "dev") return;
    try {
      // Paramètre unique : évite tout cache (navigateur ou service worker).
      const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const { version } = await res.json();
      if (version && version !== "dev" && version !== currentVersion) {
        setUpdateAvailable(true);
      }
    } catch {
      /* hors ligne : on réessaiera plus tard */
    }
  }, [currentVersion]);

  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_EVERY_MS);
    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  async function handleUpdate() {
    setUpdating(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* on recharge quand même */
    }
    window.location.reload();
  }

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[2000] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-accent bg-bg px-4 py-3 text-sm shadow-lg"
    >
      <span>Une nouvelle version est disponible.</span>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={updating}
        className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-bg disabled:opacity-60"
      >
        {updating ? "…" : "Mettre à jour"}
      </button>
    </div>
  );
}
