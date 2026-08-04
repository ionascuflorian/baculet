import { prisma } from "../src/lib/db";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Folosire: npm run admin:promote -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    console.error(`Nu am găsit utilizatorul cu email-ul ${email}.`);
    process.exit(1);
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`✅ ${user.name} (${user.email}) este acum ADMIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
