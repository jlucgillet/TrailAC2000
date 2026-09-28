"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Petit délai avant d'afficher la roue : évite un clignotement sur les
// actions quasi instantanées. Petit maintien après la fin : évite de la
// faire disparaître juste avant qu'une redirection ne démarre.
const SHOW_DELAY_MS = 150;
const HOLD_MS = 200;
// Filet de sécurité : si une navigation ne se termine jamais (lien
// bloqué, erreur réseau), la roue ne reste pas affichée indéfiniment.
const NAVIGATION_TIMEOUT_MS = 15000;

/**
 * Affiche une roue de chargement au centre de l'écran quand :
 *  - on clique sur un lien interne (jusqu'à l'arrivée sur la nouvelle page) ;
 *  - une action lancée par l'utilisateur est en cours (requêtes POST,
 *    PATCH, PUT, DELETE — pas les GET, qui servent aux rafraîchissements
 *    automatiques en arrière-plan comme le chrono ou les classements).
 *
 * Utilise une animation SVG (SMIL) plutôt que du CSS : elle reste visible
 * même quand l'appareil demande de réduire les animations.
 */
export function BusyIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [navigating, setNavigating] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  // La route a changé : la navigation est terminée.
  useEffect(() => {
    setNavigating(false);
  }, [routeKey]);

  // Détecte les clics sur les liens internes.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Téléchargements et exports (CSV, GPX…) : pas de changement de page.
      if (url.pathname.startsWith("/api/")) return;
      // Même page (simple ancre #section) : rien à attendre.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      setNavigating(true);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), NAVIGATION_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [navigating]);

  // Suit les requêtes déclenchées par une action de l'utilisateur.
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      const tracked = method !== "GET" && method !== "HEAD";

      if (tracked) setPendingCount((c) => c + 1);
      try {
        return await originalFetch(input, init);
      } finally {
        if (tracked) setPendingCount((c) => Math.max(0, c - 1));
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const busy = navigating || pendingCount > 0;

  useEffect(() => {
    const t = setTimeout(() => setVisible(busy), busy ? SHOW_DELAY_MS : HOLD_MS);
    return () => clearTimeout(t);
  }, [busy]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
    >
      <span className="sr-only">Chargement…</span>
      <div className="rounded-2xl bg-bg/85 p-4 shadow-lg ring-1 ring-border backdrop-blur-sm">
        <svg width="44" height="44" viewBox="0 0 50 50" aria-hidden="true" className="text-ink">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="5"
          />
          <path
            d="M25 5 a20 20 0 0 1 20 20"
            fill="none"
            stroke="#8FD14F"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 25 25"
              to="360 25 25"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </div>
  );
}
