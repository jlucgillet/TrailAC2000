const MESSAGES: Record<string, string> = {
  invalid: "Ce QR code n'est pas reconnu.",
  unknown_race: "Ce QR code correspond à une autre course, ou n'existe plus.",
  race_not_active: "Cette course n'est pas (ou plus) ouverte au chronométrage.",
  rate_limited: "Trop de scans détectés depuis cet appareil. Patientez un instant et réessayez.",
  not_registered:
    "Cette course est réservée aux concurrents déjà inscrits. Contactez l'organisateur pour vous inscrire.",
};

export default function ScanErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string; race?: string };
}) {
  const message = MESSAGES[searchParams.reason ?? ""] ?? "Une erreur est survenue lors du scan.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 rounded-full bg-danger/15 px-4 py-1 text-sm font-medium text-danger">
        SCAN NON VALIDÉ
      </p>
      <h1 className="mb-4 font-display text-3xl font-semibold">Oups</h1>
      <p className="max-w-sm text-muted">{message}</p>
      {searchParams.race && (
        <a
          href={`/course/${searchParams.race}`}
          className="mt-8 rounded-xl bg-accent px-6 py-3 font-semibold text-bg"
        >
          Retour à la course
        </a>
      )}
    </div>
  );
}
