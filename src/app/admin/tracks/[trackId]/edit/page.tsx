import { EditTrackView } from "./EditTrackView";

export default function EditTrackPage({ params }: { params: { trackId: string } }) {
  return <EditTrackView trackId={params.trackId} />;
}
