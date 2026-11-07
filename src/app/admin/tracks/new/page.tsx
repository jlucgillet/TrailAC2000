import Link from "next/link";
import { TrackDrawer } from "@/components/TrackDrawer";

export default function NewTrackPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/tracks" className="text-sm text-muted underline">
          ← Tous les parcours
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold">Créer un parcours en le traçant</h1>
        <p className="mt-1 text-sm text-muted">
          Place les points sur la carte : le tracé, la distance et le dénivelé se mettent à jour au fur et à mesure.
        </p>
      </div>
      <TrackDrawer />
    </div>
  );
}
