import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.complianceItem.createMany({
    data: [
      { name: "PF payment", dayOfMonth: 15, owner: "payroll@emotorad.com", leadTimeDays: 5 },
      { name: "ESI payment", dayOfMonth: 21, owner: "payroll@emotorad.com", leadTimeDays: 5 },
    ],
  });
  console.log("Seeded example compliance items (PF, ESI).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
