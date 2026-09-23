import { formatDurationMs } from "@/lib/time";

export type ResultRow = {
  position: number | null;
  displayName: string;
  bibNumber: string | null;
  category: string | null;
  status: string;
  durationMs: number | null;
  startTimestamp?: string | null;
  finishTimestamp?: string | null;
  phone?: string | null;
  participantId?: string;
};

const STATUS_LABEL: Record<string, string> = {
  registered: "Inscrit",
  running: "En course",
  finished: "Terminé",
  abandoned: "Abandonné",
  disqualified: "Disqualifié",
};

export type ResultSortKey =
  | "position"
  | "displayName"
  | "bibNumber"
  | "category"
  | "phone"
  | "durationMs"
  | "status";

export function ResultsTable({
  rows,
  showTimestamps = false,
  showPhone = false,
  renderActions,
  sortKey,
  sortDir,
  onSortChange,
}: {
  rows: ResultRow[];
  showTimestamps?: boolean;
  showPhone?: boolean;
  renderActions?: (row: ResultRow) => React.ReactNode;
  /** Fournir sortKey/sortDir/onSortChange rend les en-têtes cliquables (usage admin). */
  sortKey?: ResultSortKey;
  sortDir?: "asc" | "desc";
  onSortChange?: (key: ResultSortKey) => void;
}) {
  const columnCount = 6 + (showTimestamps ? 2 : 0) + (showPhone ? 1 : 0) + (renderActions ? 1 : 0);

  const Th = ({
    label,
    sortKeyFor,
  }: {
    label: string;
    sortKeyFor?: ResultSortKey;
  }) => {
    if (!onSortChange || !sortKeyFor) {
      return <th className="px-4 py-3 font-medium">{label}</th>;
    }
    const active = sortKey === sortKeyFor;
    return (
      <th className="px-4 py-3 font-medium">
        <button
          onClick={() => onSortChange(sortKeyFor)}
          className={`flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {label}
          <span className="text-[10px]">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <Th label="Pos." sortKeyFor="position" />
            <Th label="Dossard" sortKeyFor="bibNumber" />
            <Th label="Concurrent" sortKeyFor="displayName" />
            {showPhone && <Th label="Téléphone" sortKeyFor="phone" />}
            <Th label="Catégorie" sortKeyFor="category" />
            {showTimestamps && <th className="px-4 py-3 font-medium">Départ</th>}
            {showTimestamps && <th className="px-4 py-3 font-medium">Arrivée</th>}
            <Th label="Temps" sortKeyFor="durationMs" />
            <Th label="Statut" sortKeyFor="status" />
            {renderActions && <th className="px-4 py-3 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface/60">
              <td className="px-4 py-3 tabular-nums">{row.position ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums">{row.bibNumber ?? "—"}</td>
              <td className="px-4 py-3">{row.displayName}</td>
              {showPhone && (
                <td className="px-4 py-3 tabular-nums text-muted">{row.phone ?? "—"}</td>
              )}
              <td className="px-4 py-3 text-muted">{row.category ?? "—"}</td>
              {showTimestamps && (
                <td className="px-4 py-3 text-muted">{row.startTimestamp ?? "—"}</td>
              )}
              {showTimestamps && (
                <td className="px-4 py-3 text-muted">{row.finishTimestamp ?? "—"}</td>
              )}
              <td className="px-4 py-3 tabular-nums font-medium">
                {row.durationMs !== null ? formatDurationMs(row.durationMs) : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={row.status} />
              </td>
              {renderActions && <td className="px-4 py-3">{renderActions(row)}</td>}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-4 py-8 text-center text-muted">
                Aucun résultat pour le moment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    registered: "bg-muted/15 text-muted",
    running: "bg-amber/15 text-amber",
    finished: "bg-accent/15 text-accent",
    abandoned: "bg-muted/15 text-muted",
    disqualified: "bg-danger/15 text-danger",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
