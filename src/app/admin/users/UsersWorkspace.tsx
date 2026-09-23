"use client";

import { useState } from "react";
import { AdminsTab } from "./AdminsTab";
import { GlobalParticipantsTab } from "./GlobalParticipantsTab";

const TABS = [
  { id: "admins", label: "Administrateurs" },
  { id: "participants", label: "Concurrents" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function UsersWorkspace() {
  const [tab, setTab] = useState<TabId>("admins");

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-semibold">Utilisateurs</h1>

      <nav className="mb-8 flex gap-1 border-b border-border">
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

      {tab === "admins" && <AdminsTab />}
      {tab === "participants" && <GlobalParticipantsTab />}
    </div>
  );
}
