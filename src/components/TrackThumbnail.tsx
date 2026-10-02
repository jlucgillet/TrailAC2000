import { buildTrackThumbnailPath } from "@/lib/trackThumbnail";

export function TrackThumbnail({
  gpxData,
  width = 96,
  height = 64,
  className,
}: {
  gpxData: string | null | undefined;
  width?: number;
  height?: number;
  className?: string;
}) {
  const path = gpxData ? buildTrackThumbnailPath(gpxData, width, height) : null;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surfaceRaised ${
        className ?? ""
      }`}
      style={{ width, height }}
    >
      {path ? (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
          <path
            d={path}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className="text-lg" aria-hidden>
          🗺️
        </span>
      )}
    </div>
  );
}
