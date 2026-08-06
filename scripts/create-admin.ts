import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

async function main() {
  const email = "admin@baculet.ro";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Contul admin@baculet.ro există deja.");
    return;
  }
  const passwordHash = await bcrypt.hash("admin1234", 10);
  const u = await prisma.user.create({
    data: {
      email,
      name: "Admin Baculet",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`Creat: ${u.email} (${u.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
