"use client";

import { useState } from "react";
import { DashboardTab } from "./DashboardTab";
import { QrCodesTab } from "./QrCodesTab";
import { ParticipantsTab } from "./ParticipantsTab";
import { ResultsTab } from "./ResultsTab";
import { SettingsTab } from "./SettingsTab";

type Race = {
  id: string;
  name: string;
  status: "draft" | "active" | "closed" | "archived";
  date: string;
  location: string | null;
  distanceKm: number | null;
  publicResultsEnabled: boolean;
};

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "qrcodes", label: "QR codes" },
  { id: "participants", label: "Concurrents" },
  { id: "results", label: "Résultats" },
  { id: "settings", label: "Réglages" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_LABEL: Record<Race["status"], string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Clôturée",
  archived: "Archivée",
};

export function RaceWorkspace({ race: initialRace }: { race: Race }) {
  const [race, setRace] = useState(initialRace);
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{race.name}</h1>
          <p className="text-sm text-muted">
            {new Date(race.date).toLocaleDateString("fr-FR")}
            {race.location ? ` · ${race.location}` : ""}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-sm text-muted">
          {STATUS_LABEL[race.status]}
        </span>
      </div>

      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <DashboardTab raceId={race.id} />}
      {tab === "qrcodes" && <QrCodesTab raceId={race.id} raceName={race.name} />}
      {tab === "participants" && <ParticipantsTab raceId={race.id} />}
      {tab === "results" && <ResultsTab raceId={race.id} />}
      {tab === "settings" && (
        <SettingsTab
          race={race}
          onUpdate={(patch) => setRace((prev) => ({ ...prev, ...patch }))}
        />
      )}
    </div>
  );
}
