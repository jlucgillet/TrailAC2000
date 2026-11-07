"use client";

import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Row = {
  key: string;
  type: "track" | "race";
  refId: string;
  exists: boolean;
  name: string;
  total: number;
  visitors: number;
  last7: number;
  last30: number;
  last: string;
  bySource: Record<string, number>;
};

export function StatsView() {
  const { data, isLoading } = useSWR("/api/admin/stats/follows", fetcher, {
    refreshInterval: 60000,
  });

  if (isLoading || !data?.totals) return <p className="text-muted">Chargement…</p>;

  const rows: Row[] = data.rows ?? [];
  const daily: { date: string; count: number }[] = data.daily ?? [];
  const max = Math.max(1, ...daily.map((d) => d.count));

  const cards = [
    { label: "Suivis démarrés (total)", value: data.totals.total },
    { label: "Personnes distinctes", value: data.totals.visitors },
    { label: "7 derniers jours", value: data.totals.last7 },
    { label: "30 derniers jours", value: data.totals.last30 },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Statistiques</h1>
        <p className="mt-1 text-sm text-muted">
          Nombre de fois où un concurrent ou un visiteur a appuyé sur « Démarrer » pour suivre un
          parcours. Une même personne qui redémarre dans les 10 minutes n&rsquo;est comptée qu&rsquo;une
          fois.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Suivis par jour (30 jours)</h2>
        <div className="flex h-32 items-end gap-1 rounded-xl border border-border bg-surface p-3">
          {daily.map((d) => (
            <div
              key={d.date}
              title={`${new Date(d.date).toLocaleDateString("fr-FR")} : ${d.count}`}
              className="flex-1 rounded-sm bg-accent"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.2 }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Par parcours</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Parcours</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Personnes</th>
                <th className="px-4 py-3 font-medium">7 j</th>
                <th className="px-4 py-3 font-medium">30 j</th>
                <th className="px-4 py-3 font-medium">Espace concurrent</th>
                <th className="px-4 py-3 font-medium">Lien partagé</th>
                <th className="px-4 py-3 font-medium">Dernier suivi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-4 py-3">
                    {r.exists ? (
                      <Link
                        href={r.type === "race" ? `/admin/races/${r.refId}` : `/admin/tracks/${r.refId}`}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {r.name} <span aria-hidden>↗</span>
                      </Link>
                    ) : (
                      r.name
                    )}
                    {r.type === "race" && <span className="ml-2 text-xs text-muted">(course)</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">{r.total}</td>
                  <td className="px-4 py-3 tabular-nums">{r.visitors}</td>
                  <td className="px-4 py-3 tabular-nums">{r.last7}</td>
                  <td className="px-4 py-3 tabular-nums">{r.last30}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{r.bySource.athlete ?? 0}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {(r.bySource.shared ?? 0) + (r.bySource.race ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(r.last).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Aucun suivi enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
