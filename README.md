# Trail AC2000 — Chronométrage de course par QR code

Application web (Next.js + PostgreSQL) de chronométrage de course : les
concurrents s'identifient par téléphone, scannent un QR code DÉPART puis un
QR code ARRIVÉE, et leur temps est calculé et enregistré **côté serveur**.

---

## 1. Prérequis

- Node.js ≥ 18.18
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)
- npm (fourni avec Node.js)

---

## 2. Installation locale

```bash
cd trail-ac2000
npm install
```

Copiez le fichier d'exemple des variables d'environnement :

```bash
cp .env.example .env
```

Vous allez maintenant renseigner `DATABASE_URL`, `DIRECT_URL` et
`SESSION_SECRET` (étape 3), puis pourrez lancer l'application (étape 5).

---

## 3. Configuration de la base de données (Supabase)

1. Créez un projet sur [supabase.com](https://supabase.com) (plan gratuit).
2. Allez dans **Project Settings → Database → Connection string**.
3. Récupérez deux URLs :
   - **Connection pooling** (port `6543`, mode `Transaction`) → à mettre dans `DATABASE_URL`
   - **Direct connection** (port `5432`) → à mettre dans `DIRECT_URL`
4. Remplacez `[YOUR-PASSWORD]` par le mot de passe de la base (défini à la
   création du projet, ou réinitialisable dans **Database → Reset password**).

Exemple dans `.env` :

```
DATABASE_URL="postgresql://postgres.xxxxx:VOTRE_MDP@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:VOTRE_MDP@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
```

Générez ensuite un secret de session robuste :

```bash
openssl rand -base64 32
```

Collez le résultat dans `SESSION_SECRET` (dans `.env`).

### 3.1 Appliquer le schéma

```bash
npx prisma migrate dev --name init
```

Cette commande crée les tables dans Supabase à partir de `prisma/schema.prisma`.

### 3.2 Appliquer les contraintes critiques anti-double-scan

**Étape obligatoire**, non automatisable par Prisma (index partiels + trigger) :

1. Ouvrez Supabase → **SQL Editor**.
2. Collez le contenu de `prisma/manual_constraints.sql`.
3. Exécutez.

Sans cette étape, les protections contre les doubles départs/arrivées
simultanés ne seront pas actives en base — l'application fonctionnera, mais
sans le filet de sécurité au niveau base de données décrit dans le cahier
des charges (§17-18).

### 3.3 Créer le compte administrateur

Renseignez `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `.env`, puis :

```bash
npm run seed:admin
```

Vous pourrez ensuite vous connecter sur `/admin/login` avec ces identifiants.
Le script peut être relancé à tout moment pour changer le mot de passe.

---

## 4. Icônes PWA (optionnel mais recommandé)

Déposez deux fichiers dans `public/icons/` :
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Sans eux, l'application reste fonctionnelle mais l'icône d'installation PWA
sera générique.

---

## 5. Lancer en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

- Espace organisateur : `/admin/login`
- Après création d'une course en `draft`, passez-la en `active` (onglet
  Réglages) pour pouvoir tester les scans.
- Les QR codes générés en local pointent vers `http://localhost:3000` : pour
  les scanner avec un vrai téléphone, utilisez un tunnel (ex. `ngrok http 3000`)
  et mettez à jour `NEXT_PUBLIC_APP_URL` en conséquence, ou testez simplement
  en ouvrant l'URL affichée sous le QR code directement dans le navigateur
  mobile.

---

## 6. Déploiement sur Vercel

### 6.1 Pousser le code sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <URL_DE_VOTRE_REPO>
git push -u origin main
```

### 6.2 Importer le projet sur Vercel

1. [vercel.com/new](https://vercel.com/new) → importez le repository.
2. Framework détecté automatiquement : **Next.js**.
3. Dans **Environment Variables**, ajoutez les mêmes variables que votre
   `.env` local : `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
   `NEXT_PUBLIC_APP_URL` (mettez ici l'URL Vercel définitive, ex.
   `https://trail-ac2000.vercel.app`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. Déployez.

### 6.3 Créer le compte admin en production

Le script `seed:admin` doit être exécuté avec les variables de production.
Le plus simple : exécutez-le une fois en local en pointant temporairement
`DATABASE_URL`/`DIRECT_URL` de votre `.env` vers la base Supabase de
production (c'est la même base qu'en local si vous n'avez qu'un seul
environnement Supabase) :

```bash
npm run seed:admin
```

### 6.4 Domaine personnalisé (optionnel)

Dans Vercel → **Settings → Domains**, ajoutez votre nom de domaine, puis
mettez à jour `NEXT_PUBLIC_APP_URL` avec cette adresse finale et
**régénérez les QR codes** de vos courses existantes (les QR codes déjà
générés encodent l'URL au moment de leur création).

---

## 7. Bon à savoir avant le jour de la course

- **Réveil de la base** : le plan gratuit Supabase peut mettre la base en
  veille après une période d'inactivité prolongée. Faites un aller-retour
  sur l'espace organisateur quelques minutes avant le départ pour vous
  assurer que tout répond instantanément.
- **QR codes imprimés** : imprimez-les en avance depuis l'onglet *QR codes*
  de chaque course (bouton *Télécharger*), en haute résolution. Ne
  régénérez jamais un QR code après l'avoir imprimé et affiché, sous peine
  de l'invalider.
- **Statut de la course** : une course doit être en statut **Active** pour
  que les scans soient acceptés (onglet *Réglages*).
- **Résultats publics** : partageable à l'adresse `/results/<id-de-la-course>`,
  sans aucune donnée personnelle (pas de téléphone).

---

## 8. Structure du projet

```
trail-ac2000/
├── prisma/
│   ├── schema.prisma          # modèle de données
│   └── manual_constraints.sql # contraintes anti-double-scan (à exécuter une fois)
├── scripts/
│   └── create-admin.ts        # création du compte organisateur
├── src/
│   ├── app/
│   │   ├── course/[raceId]/           # identification + écran chrono concurrent
│   │   ├── scan/[token]/[checkpoint]/ # point d'entrée des QR codes
│   │   ├── results/[raceId]/          # résultats publics
│   │   ├── admin/                     # espace organisateur
│   │   └── api/                       # routes API
│   ├── components/
│   ├── lib/
│   │   ├── scan.ts     # cœur du chronométrage (transaction atomique)
│   │   ├── session.ts  # sessions admin & concurrent
│   │   └── ...
│   └── middleware.ts   # protection des routes /admin
└── .env.example
```

---

## 9. Limites connues de cette version

- Le rate limiting est en mémoire (par instance serverless) : suffisant
  contre un bourrage accidentel, pas contre une attaque distribuée
  volontaire. Pour un usage à plus grande échelle, brancher un compteur
  partagé (ex. Upstash Redis).
- Pas d'envoi de SMS de confirmation ni de lien magique multi-appareil :
  la session concurrent est liée au navigateur utilisé pour scanner.
- Le scanner caméra en direct (composant `html5-qrcode`) est installé en
  dépendance mais l'écran participant s'appuie par défaut sur l'ouverture
  directe du QR code via l'appareil photo natif (§15 du cahier des
  charges), plus fiable sur iOS/Safari. Un composant de scan caméra en
  page peut être ajouté comme repli si nécessaire.
