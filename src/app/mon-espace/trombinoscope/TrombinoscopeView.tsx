"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

type Member = { id: string; firstName: string; lastName: string; photoId: string | null; isMe: boolean };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function norm(v: string) {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function initials(m: Member) {
  return ((m.firstName[0] ?? "") + (m.lastName[0] ?? "")).toUpperCase() || "?";
}

export function TrombinoscopeView() {
  const { data, isLoading } = useSWR<{ members: Member[] }>("/api/athlete/members", fetcher, {
    revalidateOnFocus: false,
  });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);

  const members = useMemo(() => data?.members ?? [], [data]);
  const shown = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return members;
    return members.filter((m) => {
      const hay = norm(`${m.firstName} ${m.lastName}`);
      return words.every((w) => hay.includes(w));
    });
  }, [members, query]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Trombinoscope</h1>
        <p className="mt-1 text-sm text-muted">
          {isLoading ? "Chargement…" : `${members.length} membre${members.length > 1 ? "s" : ""} du club`}
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Rechercher un membre…"
        aria-label="Rechercher un membre"
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-accent"
      />

      {!isLoading && shown.length === 0 && (
        <p className="text-sm text-muted">{query ? "Aucun membre ne correspond." : "Aucun membre pour l’instant."}</p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {shown.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => m.photoId && setSelected(m)}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl border bg-surface p-3 text-center ${
                m.isMe ? "border-accent" : "border-border"
              } ${m.photoId ? "cursor-pointer hover:border-accent" : "cursor-default"}`}
            >
              {m.photoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/photos/${m.photoId}`}
                  alt={`${m.firstName} ${m.lastName}`}
                  loading="lazy"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex aspect-square w-full items-center justify-center rounded-xl bg-bg font-display text-4xl font-semibold text-muted"
                >
                  {initials(m)}
                </span>
              )}
              <span className="w-full truncate text-sm font-semibold text-ink">{m.firstName}</span>
              <span className="-mt-2 w-full truncate text-sm text-muted">{m.lastName}</span>
            </button>
          </li>
        ))}
      </ul>

      {selected && selected.photoId && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.firstName} ${selected.lastName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/${selected.photoId}`}
            alt=""
            className="max-h-[75vh] max-w-full rounded-2xl object-contain"
          />
          <p className="font-display text-lg font-semibold text-white">
            {selected.firstName} {selected.lastName}
          </p>
        </div>
      )}
    </div>
  );
}
