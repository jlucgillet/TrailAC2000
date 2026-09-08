"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function QrCodesTab({ raceId, raceName }: { raceId: string; raceName: string }) {
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
        kind="start"
        raceName={raceName}
        png={data?.start?.png}
        url={data?.start?.url}
        onRegenerate={() => regenerate("start")}
      />
      <QrCard
        title="ARRIVÉE"
        kind="finish"
        raceName={raceName}
        png={data?.finish?.png}
        url={data?.finish?.url}
        onRegenerate={() => regenerate("finish")}
      />
    </div>
  );
}

function QrCard({
  title,
  kind,
  raceName,
  png,
  url,
  onRegenerate,
}: {
  title: string;
  kind: "start" | "finish";
  raceName: string;
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
        {png && (
          <button
            onClick={() => generatePrintPoster({ png, raceName, kind })}
            className="rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
          >
            Affiche à imprimer
          </button>
        )}
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

/**
 * Compose une affiche A4 (fond blanc, QR code en grand, nom de la course,
 * DÉPART/ARRIVÉE, message de rappel) via <canvas>, puis déclenche le
 * téléchargement en PNG. Tout se fait côté navigateur, sans service externe.
 */
async function generatePrintPoster({
  png,
  raceName,
  kind,
}: {
  png: string;
  raceName: string;
  kind: "start" | "finish";
}) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Impossible de charger le QR code."));
    img.src = png;
  });

  const width = 1240;
  const height = 1754; // proportions A4 portrait, résolution correcte pour l'impression
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ink = "#0B1410";
  const muted = "#4B5A52";
  const labelColor = kind === "start" ? "#6FAE3A" : "#E5484D";
  const label = kind === "start" ? "DÉPART" : "ARRIVÉE";

  // Fond et bordure
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.textAlign = "center";

  // Nom de la course (avec retour à la ligne automatique)
  ctx.fillStyle = ink;
  ctx.font = "bold 60px system-ui, sans-serif";
  wrapCenteredText(ctx, raceName, width / 2, 160, width - 200, 68);

  // Label DÉPART / ARRIVÉE
  ctx.fillStyle = labelColor;
  ctx.font = "bold 150px system-ui, sans-serif";
  ctx.fillText(label, width / 2, 400);

  // QR code
  const qrSize = 760;
  const qrX = (width - qrSize) / 2;
  const qrY = 470;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  // Pied de page
  ctx.fillStyle = ink;
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText("TRAIL AC 2000", width / 2, qrY + qrSize + 110);
  ctx.fillStyle = muted;
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText("Merci de laisser en place", width / 2, qrY + qrSize + 165);

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `affiche-${kind === "start" ? "depart" : "arrivee"}-${raceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.png`;
  a.click();
}

function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}
