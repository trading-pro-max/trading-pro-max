import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "demo@tpm.com" },
    update: {},
    create: {
      email: "demo@tpm.com",
      name: "Demo User",
      plan: "free",
    },
  });
}

main();
