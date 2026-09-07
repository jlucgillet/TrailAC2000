/**
 * Tous les timestamps sont stockés en UTC (par défaut PostgreSQL "timestamp").
 * Ces helpers formatent l'affichage dans le fuseau horaire de la course,
 * en s'appuyant sur l'API Intl native (gère automatiquement les changements
 * d'heure été/hiver, contrairement à un simple offset fixe).
 */

export function formatInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Formate une durée en millisecondes au format HH:MM:SS (ou MM:SS si < 1h). */
export function formatDurationMs(ms: number | bigint): string {
  const totalMs = typeof ms === "bigint" ? Number(ms) : ms;
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
