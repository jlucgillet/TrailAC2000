"use client";

import Link from "next/link";
import useSWR from "swr";
import { TrackDrawer } from "@/components/TrackDrawer";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function EditTrackView({ trackId }: { trackId: string }) {
  const { data, isLoading } = useSWR(`/api/admin/tracks/${trackId}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/admin/tracks/${trackId}`} className="text-sm text-muted underline">
          ← Retour au parcours
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold">Modifier le tracé</h1>
        <p className="mt-1 text-sm text-muted">
          Déplace des points, supprime-en ou prolonge le tracé. La distance et le dénivelé sont recalculés au fur et
          à mesure ; rien n&rsquo;est modifié tant que tu n&rsquo;as pas enregistré.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted">Chargement…</p>
      ) : !data?.gpxData ? (
        <p className="text-muted">Parcours introuvable.</p>
      ) : (
        <TrackDrawer
          key={trackId}
          initial={{ trackId, name: data.name, gpxData: data.gpxData }}
        />
      )}
    </div>
  );
}
