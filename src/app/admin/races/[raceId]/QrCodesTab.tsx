"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function QrCodesTab({ raceId }: { raceId: string }) {
  const { data, isLoading, mutate } = useSWR(`/api/admin/races/${raceId}/qrcodes`, fetcher);

  async function regenerate(target: "start" | "finish") {
    if (!confirm("Les QR codes déjà imprimés pour ce point de contrôle ne fonctionneront plus. Continuer ?")) {
      return;
    }
    await fetch(`/api/admin/races/${raceId}/qrcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    mutate();
  }

  if (isLoading) return <p className="text-muted">Génération des QR codes…</p>;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <QrCard
        title="DÉPART"
        png={data?.start?.png}
        url={data?.start?.url}
        onRegenerate={() => regenerate("start")}
      />
      <QrCard
        title="ARRIVÉE"
        png={data?.finish?.png}
        url={data?.finish?.url}
        onRegenerate={() => regenerate("finish")}
      />
    </div>
  );
}

function QrCard({
  title,
  png,
  url,
  onRegenerate,
}: {
  title: string;
  png?: string;
  url?: string;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-center">
      <p className="mb-4 font-display text-2xl font-semibold tracking-wide">{title}</p>
      {png && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={png} alt={`QR code ${title}`} className="mx-auto w-56 rounded-lg bg-white p-3" />
      )}
      <p className="mt-3 break-all text-xs text-muted">{url}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <a
          href={png}
          download={`qr-${title.toLowerCase()}.png`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
        >
          Télécharger
        </a>
        <button
          onClick={onRegenerate}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink"
        >
          Régénérer
        </button>
      </div>
    </div>
  );
}
