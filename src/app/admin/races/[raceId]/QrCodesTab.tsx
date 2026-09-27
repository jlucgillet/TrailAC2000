"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function QrCodesTab({
  raceId,
  raceName,
  distanceKm,
  elevationGainM,
}: {
  raceId: string;
  raceName: string;
  distanceKm?: number | null;
  elevationGainM?: number | null;
}) {
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
    <div className="flex flex-col gap-6">
      {data?.start?.png && data?.finish?.png && (
        <div>
          <button
            onClick={() =>
              generateCombinedPoster({
                startPng: data.start.png,
                finishPng: data.finish.png,
                raceName,
                distanceKm,
                elevationGainM,
              })
            }
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg"
          >
            🖨️ Imprimer les 2 QR codes sur une page
          </button>
        </div>
      )}

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger le QR code."));
    img.src = src;
  });
}

function slugify(raceName: string): string {
  return raceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
  const img = await loadImage(png);

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

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.textAlign = "center";

  ctx.fillStyle = ink;
  ctx.font = "bold 60px system-ui, sans-serif";
  wrapCenteredText(ctx, raceName, width / 2, 160, width - 200, 68);

  ctx.fillStyle = labelColor;
  ctx.font = "bold 150px system-ui, sans-serif";
  ctx.fillText(label, width / 2, 400);

  const qrSize = 760;
  const qrX = (width - qrSize) / 2;
  const qrY = 470;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = ink;
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText("TRAIL AC 2000", width / 2, qrY + qrSize + 110);
  ctx.fillStyle = muted;
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText("Merci de laisser en place", width / 2, qrY + qrSize + 165);

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `affiche-${kind === "start" ? "depart" : "arrivee"}-${slugify(raceName)}.png`;
  a.click();
}

/**
 * Compose une seule affiche A4 avec les DEUX QR codes (départ + arrivée).
 * Les deux sections sont symétriques (titre de la course, mention
 * "TRAIL AC 2000 — Merci de laisser en place", puis le QR code) ; seule la
 * section DÉPART ajoute la distance, le dénivelé et la phrase d'explication.
 * Pas de cadre englobant : chaque section peut être découpée séparément
 * si besoin (une affiche par point de contrôle).
 */
async function generateCombinedPoster({
  startPng,
  finishPng,
  raceName,
  distanceKm,
  elevationGainM,
}: {
  startPng: string;
  finishPng: string;
  raceName: string;
  distanceKm?: number | null;
  elevationGainM?: number | null;
}) {
  const [startImg, finishImg] = await Promise.all([loadImage(startPng), loadImage(finishPng)]);

  const width = 1240;
  const height = 1754;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";

  const qrSize = 360;
  const centerX = width / 2;

  let y = 80;
  y = drawCheckpointSection(ctx, {
    centerX,
    y,
    contentWidth: width - 200,
    raceName,
    checkpointLabel: "DÉPART",
    checkpointColor: "#5A9A2E",
    qrImg: startImg,
    qrSize,
    distanceKm,
    elevationGainM,
    phrase: "Parcours chronométré : tu scans au départ et tu scans à l'arrivée.",
  });

  // Séparateur entre les deux sections
  y += 30;
  ctx.strokeStyle = "#DDE3DA";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(width - 140, y);
  ctx.stroke();
  y += 50;

  drawCheckpointSection(ctx, {
    centerX,
    y,
    contentWidth: width - 200,
    raceName,
    checkpointLabel: "ARRIVÉE",
    checkpointColor: "#C23B3B",
    qrImg: finishImg,
    qrSize,
  });

  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `affiche-depart-arrivee-${slugify(raceName)}.png`;
  a.click();
}

/** Dessine une section complète (titre + marque + QR, +extras optionnels pour le départ). Retourne le y final. */
function drawCheckpointSection(
  ctx: CanvasRenderingContext2D,
  opts: {
    centerX: number;
    y: number;
    contentWidth: number;
    raceName: string;
    checkpointLabel: string;
    checkpointColor: string;
    qrImg: HTMLImageElement;
    qrSize: number;
    distanceKm?: number | null;
    elevationGainM?: number | null;
    phrase?: string;
  }
): number {
  const { centerX, contentWidth, raceName, checkpointLabel, checkpointColor, qrImg, qrSize, distanceKm, elevationGainM, phrase } = opts;
  const ink = "#0B1410";
  const muted = "#4B5A52";
  let y = opts.y;

  // Titre de la course
  ctx.fillStyle = ink;
  ctx.font = "bold 48px system-ui, sans-serif";
  y = wrapCenteredText(ctx, raceName, centerX, y + 48, contentWidth, 54);

  // Marque + rappel
  y += 18;
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText("TRAIL AC 2000", centerX, y);
  y += 38;
  ctx.fillStyle = muted;
  ctx.font = "26px system-ui, sans-serif";
  ctx.fillText("Merci de laisser en place", centerX, y);
  y += 34;

  // Distance / dénivelé (départ uniquement)
  const details: string[] = [];
  if (distanceKm != null) details.push(`${distanceKm.toFixed(1)} km`);
  if (elevationGainM != null) details.push(`D+ ${Math.round(elevationGainM)} m`);
  if (details.length > 0) {
    y += 16;
    ctx.font = "32px system-ui, sans-serif";
    ctx.fillText(details.join("   ·   "), centerX, y);
    y += 30;
  }

  // Point de contrôle
  y += 30;
  ctx.fillStyle = checkpointColor;
  ctx.font = "bold 60px system-ui, sans-serif";
  ctx.fillText(checkpointLabel, centerX, y);
  y += 30;

  // QR code
  ctx.drawImage(qrImg, centerX - qrSize / 2, y, qrSize, qrSize);
  y += qrSize + 36;

  // Phrase d'explication (départ uniquement)
  if (phrase) {
    ctx.fillStyle = ink;
    ctx.font = "italic 27px system-ui, sans-serif";
    y = wrapCenteredText(ctx, phrase, centerX, y, contentWidth - 60, 34);
  }

  return y;
}

/** Retourne la position Y juste après le texte (pour enchaîner d'autres éléments). */
function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
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

  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}
