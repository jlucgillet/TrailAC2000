export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-4 font-display text-4xl font-semibold">Trail AC2000</h1>
      <p className="max-w-sm text-muted">
        Chronométrage de course par QR code. Ouvrez le lien de votre course pour participer, ou
        retrouvez <a href="/mon-espace/login" className="text-accent underline">l&rsquo;historique de vos courses</a>.
      </p>
      <p className="mt-2 text-sm text-muted">
        <a href="/admin/login" className="underline">Espace organisateur</a>
      </p>
    </div>
  );
}
