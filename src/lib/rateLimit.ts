/**
 * Limiteur de débit simple, en mémoire, par clé (ex. IP + route).
 *
 * Limite connue : sur Vercel, chaque instance de fonction serverless a sa
 * propre mémoire, donc cette limite est "par instance" et non globale.
 * C'est suffisant comme garde-fou de base contre le bourrage de requêtes
 * accidentel (double-tap, boucle de retry buguée). Pour une protection
 * stricte multi-instance, brancher un compteur partagé (ex. Upstash Redis,
 * qui a un plan gratuit et s'intègre facilement à Vercel).
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxRequests;
}

export function hashIp(ip: string): string {
  // Hash simple non-cryptographique suffisant pour l'anonymisation des logs
  // (on ne stocke jamais l'IP en clair dans ScanLog).
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return `ip_${Math.abs(hash)}`;
}
