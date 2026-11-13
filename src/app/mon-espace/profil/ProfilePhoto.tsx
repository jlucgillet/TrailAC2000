"use client";

import { useRef, useState } from "react";

type Photo = { id: string; shared: boolean } | null;

const SIZE = 256;

async function cropToJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Échec de conversion."))), "image/jpeg", 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function ProfilePhoto({ name, initialPhoto }: { name: string; initialPhoto: Photo }) {
  const [photo, setPhoto] = useState<Photo>(initialPhoto);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToJpeg(file);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/athlete/photo", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Échec de l'envoi.");
      setPhoto(json.photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleShared(shared: boolean) {
    if (!photo) return;
    setPhoto({ ...photo, shared });
    const res = await fetch("/api/athlete/photo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shared }),
    });
    if (!res.ok) {
      setPhoto({ ...photo, shared: !shared });
      setError("Impossible de modifier le réglage.");
    }
  }

  async function remove() {
    if (!confirm("Supprimer ta photo de profil ?")) return;
    setBusy(true);
    await fetch("/api/athlete/photo", { method: "DELETE" });
    setPhoto(null);
    setBusy(false);
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/photos/${photo.id}`}
            alt="Ma photo de profil"
            className="h-24 w-24 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-bg text-2xl font-semibold text-muted">
            {initialsOf(name)}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <p className="font-medium">{name || "Concurrent"}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {busy ? "Envoi…" : photo ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {photo && (
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="rounded-lg border border-danger px-3 py-1.5 text-sm text-danger disabled:opacity-50"
              >
                Supprimer
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
      </div>

      {photo && (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={photo.shared}
            onChange={(e) => toggleShared(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            Visible par les autres concurrents dans la liste des résultats des courses.
            <span className="block text-xs text-muted">
              Décoche pour que seule toi (et l&rsquo;organisation) puisse la voir.
            </span>
          </span>
        </label>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <p className="text-xs text-muted">
        La photo est recadrée en carré et réduite automatiquement. Elle n&rsquo;est visible que
        par les concurrents connectés (jamais sur les pages publiques) et tu peux la supprimer à
        tout moment.
      </p>
    </section>
  );
}
