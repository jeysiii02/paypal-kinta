import { PrismaClient } from "@prisma/client";
import { formatPhp } from "../src/lib/money";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    where: { name: "University Tech Summit" },
    include: {
      suppliers: true,
      commitments: { include: { dependencies: true, supplier: true } },
      customerPayments: true,
      disruptions: { include: { documents: true } },
      activityLogs: true,
    },
  });

  if (!project) {
    throw new Error("University Tech Summit not found");
  }

  console.log("Project:", project.name);
  console.log("Budget:", formatPhp(project.budget));
  console.log("Location:", project.location);
  console.log("Event:", project.eventDate.toISOString());
  console.log("Suppliers:", project.suppliers.map((s) => s.name).join(", "));
  console.log(
    "Commitments:",
    project.commitments
      .map((c) => `${c.supplier.name}=${formatPhp(c.agreedAmount)}`)
      .join(", "),
  );
  console.log("Dependencies:", project.commitments.reduce((n, c) => n + c.dependencies.length, 0));
  console.log(
    "Payments:",
    project.customerPayments
      .map((p) => `${p.customerName}:${formatPhp(p.amount)}:${p.status}:paypal=${p.paypalOrderId}`)
      .join(" | "),
  );
  console.log("Disruption:", project.disruptions[0]?.title);
  console.log("Documents:", project.disruptions[0]?.documents.map((d) => d.filename).join(", "));
  console.log("Activity logs:", project.activityLogs.length);

  const modelCounts = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.supplier.count(),
    prisma.commitment.count(),
    prisma.commitmentDependency.count(),
    prisma.customerPayment.count(),
    prisma.disruption.count(),
    prisma.document.count(),
    prisma.activityLog.count(),
  ]);

  console.log("Counts:", {
    users: modelCounts[0],
    projects: modelCounts[1],
    suppliers: modelCounts[2],
    commitments: modelCounts[3],
    dependencies: modelCounts[4],
    payments: modelCounts[5],
    disruptions: modelCounts[6],
    documents: modelCounts[7],
    activityLogs: modelCounts[8],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
