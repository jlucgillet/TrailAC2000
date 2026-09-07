/**
 * Crée (ou met à jour le mot de passe d') un compte administrateur.
 * Usage : npm run seed:admin
 * Lit ADMIN_EMAIL et ADMIN_PASSWORD depuis les variables d'environnement (.env).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis (voir .env).");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD doit contenir au moins 8 caractères.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Compte administrateur prêt : ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
