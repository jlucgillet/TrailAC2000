export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-4 font-display text-4xl font-semibold">Trail AC2000</h1>
      <p className="max-w-sm text-muted">
        Chronométrage de course par QR code. Ouvrez le lien de votre course, ou
        rendez-vous sur <a href="/admin/login" className="text-accent underline">l&rsquo;espace organisateur</a>.
      </p>
    </div>
  );
}
