"use client";

/**
 * Fenêtres de confirmation et notifications aux couleurs de l'app, en
 * remplacement de window.confirm() / window.alert() du navigateur.
 *
 *   if (!(await confirmDialog("Supprimer ce parcours ?"))) return;
 *   notify("Erreur lors de la suppression.");
 *
 * Aucun « provider » à installer : le composant se monte tout seul dans la
 * page au premier appel. À utiliser uniquement côté navigateur (gestionnaires
 * d'événements, effets), dans une fonction `async` pour confirmDialog.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Force le style « danger » (rouge). Par défaut : déduit du texte. */
  danger?: boolean;
};

export type NotifyKind = "info" | "success" | "error";

type ConfirmItem = { id: number; message: string; opts: ConfirmOptions; resolve: (v: boolean) => void };
type ToastItem = { id: number; message: string; kind: NotifyKind };

// ---------- Petit magasin partagé ----------
let confirms: ConfirmItem[] = [];
let toasts: ToastItem[] = [];
let version = 0;
let nextId = 1;
const listeners = new Set<() => void>();
let mounted = false;

function emit() {
  version++;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function ensureHost() {
  if (mounted || typeof document === "undefined") return;
  mounted = true;
  const el = document.createElement("div");
  el.setAttribute("data-app-dialogs", "");
  document.body.appendChild(el);
  createRoot(el).render(<DialogHost />);
}

const DANGER_RE = /supprim|retir|effac|archiv|irréversible|écras|remplac|quitter sans/i;

/** Demande une confirmation. Résout `true` (confirmé) ou `false` (annulé). */
export function confirmDialog(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  ensureHost();
  return new Promise<boolean>((resolve) => {
    confirms = [...confirms, { id: nextId++, message, opts, resolve }];
    emit();
  });
}

/** Affiche un message court (remplace alert). */
export function notify(message: string, kind?: NotifyKind, durationMs = 5000) {
  if (typeof document === "undefined") return;
  ensureHost();
  const k: NotifyKind = kind ?? (/erreur|impossible|échec|invalide|injoignable|refus/i.test(message) ? "error" : "info");
  const id = nextId++;
  toasts = [...toasts, { id, message: String(message), kind: k }];
  emit();
  setTimeout(() => dismissToast(id), durationMs);
}

function dismissToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function answer(item: ConfirmItem, value: boolean) {
  confirms = confirms.filter((c) => c.id !== item.id);
  emit();
  item.resolve(value);
}

// ---------- Interface ----------
function DialogHost() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  const current = confirms[0];
  return (
    <>
      {current && <ConfirmModal key={current.id} item={current} />}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[10001] flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              onClick={() => dismissToast(t.id)}
              className={`pointer-events-auto flex max-w-md cursor-pointer items-start gap-2 rounded-xl border border-l-4 bg-surface px-4 py-3 text-sm text-ink shadow-2xl ${
                t.kind === "error"
                  ? "border-danger"
                  : t.kind === "success"
                  ? "border-accent"
                  : "border-border border-l-accent"
              }`}
              style={{ animation: "appToastIn .18s ease-out" }}
            >
              <span aria-hidden>{t.kind === "error" ? "⚠️" : t.kind === "success" ? "✅" : "ℹ️"}</span>
              <span className="whitespace-pre-line">{t.message}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes appToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes appDialogIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}`}</style>
    </>
  );
}

function ConfirmModal({ item }: { item: ConfirmItem }) {
  const danger = item.opts.danger ?? DANGER_RE.test(item.message);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Action destructive : le focus démarre sur « Annuler » (évite un Entrée malheureux).
    (danger ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        answer(item, false);
      } else if (e.key === "Tab") {
        // Garde le focus dans la fenêtre.
        const a = cancelRef.current;
        const b = confirmRef.current;
        if (!a || !b) return;
        e.preventDefault();
        (document.activeElement === a ? b : a).focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [item, danger]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) answer(item, false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-msg"
        className={`w-full max-w-sm rounded-2xl border border-border border-t-4 bg-surface p-5 shadow-2xl ${
          danger ? "border-t-danger" : "border-t-accent"
        }`}
        style={{ animation: "appDialogIn .15s ease-out" }}
      >
        <h2 id="app-dialog-title" className="font-display text-lg font-semibold text-ink">
          {item.opts.title ?? (danger ? "Confirmer l’action" : "Confirmation")}
        </h2>
        <p id="app-dialog-msg" className="mt-2 whitespace-pre-line text-sm text-muted">
          {item.message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => answer(item, false)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-accent"
          >
            {item.opts.cancelLabel ?? "Annuler"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => answer(item, true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              danger ? "bg-danger text-white" : "bg-accent text-bg"
            }`}
          >
            {item.opts.confirmLabel ?? (danger ? "Confirmer" : "Continuer")}
          </button>
        </div>
      </div>
    </div>
  );
}
