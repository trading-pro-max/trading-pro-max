import "dotenv/config";
import { prisma } from "./index";
import { hashPassword } from "./password";

async function main() {
  const email = process.env.DEMO_USER_EMAIL ?? "admin@tradingpromax.local";
  const password = process.env.DEMO_USER_PASSWORD ?? "admin123";
  const name = process.env.DEMO_USER_NAME ?? "Trading Pro Max Admin";

  await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      passwordHash: hashPassword(password),
      role: "owner"
    }
  });

  const existingWorkspace = await prisma.workspace.findFirst();
  if (!existingWorkspace) {
    await prisma.workspace.create({
      data: {
        name: "Trading Pro Max",
        environment: "local",
        engineStatus: "running",
        activePreset: "balanced",
        aiAssist: true,
        maxOpenPositions: 3,
        signalConfidenceGate: 86,
        paperStake: 25,
        portfolioBase: 10000,
        runningStrategies: 2
      }
    });
  }

  const journalCount = await prisma.journalEntry.count();
  if (journalCount === 0) {
    await prisma.journalEntry.createMany({
      data: [
        { id: `JR-${Date.now()}-1`, text: "Platform baseline initialized." },
        { id: `JR-${Date.now()}-2`, text: "Backend Core upgraded to Prisma SQLite." }
      ]
    });
  }

  const incidentCount = await prisma.incident.count();
  if (incidentCount === 0) {
    await prisma.incident.create({
      data: {
        id: `INC-${Date.now()}-1`,
        severity: "medium",
        title: "Initial monitoring baseline",
        detail: "Ops monitoring initialized for local environment."
      }
    });
  }

  console.log("Trading Pro Max database seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

