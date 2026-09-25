export function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[210px] rounded-[26px] border-4 border-black/60 bg-surface p-3 shadow-lg">
      <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-black/40" />
      <div className="flex min-h-[300px] flex-col rounded-xl bg-bg p-3">{children}</div>
    </div>
  );
}

export function GuideStep({
  number,
  caption,
  children,
}: {
  number: number;
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-bg">
        {number}
      </span>
      <PhoneMockup>{children}</PhoneMockup>
      <p className="mt-4 max-w-[220px] text-sm text-ink">{caption}</p>
    </div>
  );
}
