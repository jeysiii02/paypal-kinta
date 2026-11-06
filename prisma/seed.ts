/**
 * KINTA Phase 1 seed — University Tech Summit (fictional demo data)
 *
 * All supplier amounts, cancellation details, and customer payments are
 * fictional demonstration data. CustomerPayment records do NOT claim real
 * PayPal captures (paypalOrderId / paypalCaptureId remain null).
 *
 * Monetary values are in PHP centavos (₱1.00 = 100).
 */

import { PrismaClient, SupplierCategory, PaymentStatus, CommitmentStatus, DependencyType, CustomerPaymentStatus, ProjectStatus } from "@prisma/client";

const prisma = new PrismaClient();

/** Convert pesos to centavos */
const php = (pesos: number) => Math.round(pesos * 100);

async function main() {
  console.log("🌱 Seeding KINTA demo data…");

  // Clean slate (order matters for FKs)
  await prisma.webhookEvent.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.recoveryAction.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.recoveryPlan.deleteMany();
  await prisma.eventAnalysis.deleteMany();
  await prisma.document.deleteMany();
  await prisma.disruption.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.commitmentDependency.deleteMany();
  await prisma.commitment.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // ── Demo user ──────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: "organizer@kinta-demo.local",
      name: "Alex Rivera",
    },
  });

  // ── University Tech Summit ─────────────────────────────────
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "University Tech Summit",
      description:
        "A one-day campus technology summit for students and local startups, featuring talks, demos, and networking.",
      eventDate: new Date("2026-12-15T09:00:00+08:00"),
      location: "Quezon City",
      budget: php(60_000),
      expectedAttendees: 100,
      status: ProjectStatus.ACTIVE,
    },
  });

  // ── Suppliers ──────────────────────────────────────────────
  const venue = await prisma.supplier.create({
    data: {
      projectId: project.id,
      name: "Venue Alpha",
      contactPerson: "Maria Santos",
      email: "bookings@venuealpha.demo",
      phone: "+63-917-100-0001",
      category: SupplierCategory.VENUE,
      notes: "Main auditorium + lobby. Fictional demo supplier.",
    },
  });

  const catering = await prisma.supplier.create({
    data: {
      projectId: project.id,
      name: "Catering Beta",
      contactPerson: "Jose Cruz",
      email: "events@cateringbeta.demo",
      phone: "+63-917-100-0002",
      category: SupplierCategory.CATERING,
      notes: "Buffet lunch + coffee station. Fictional demo supplier.",
    },
  });

  const photography = await prisma.supplier.create({
    data: {
      projectId: project.id,
      name: "Photography Gamma",
      contactPerson: "Liza Tan",
      email: "hello@photographygamma.demo",
      phone: "+63-917-100-0003",
      category: SupplierCategory.PHOTOGRAPHY,
      notes: "Event coverage + edited gallery. Fictional demo supplier.",
    },
  });

  const equipment = await prisma.supplier.create({
    data: {
      projectId: project.id,
      name: "Equipment Delta",
      contactPerson: "Ben Reyes",
      email: "rentals@equipmentdelta.demo",
      phone: "+63-917-100-0004",
      category: SupplierCategory.EQUIPMENT,
      notes: "AV kit: mics, projector, speakers. Fictional demo supplier.",
    },
  });

  // ── Commitments ────────────────────────────────────────────
  const venueCommitment = await prisma.commitment.create({
    data: {
      projectId: project.id,
      supplierId: venue.id,
      title: "Venue Alpha — Auditorium Rental",
      description: "Full-day rental of main auditorium and lobby for University Tech Summit.",
      agreedAmount: php(15_000),
      amountPaid: php(7_500),
      paymentStatus: PaymentStatus.PARTIAL,
      serviceDate: new Date("2026-12-15T09:00:00+08:00"),
      cancellationConditions:
        "Cancellation more than 30 days before the event: 50% deposit retained. Cancellation within 30 days: full agreed amount due. Force majeure subject to written notice review — not automatic entitlement.",
      refundConditions:
        "Deposit refundable only if Venue Alpha cancels or relocates without offering a comparable substitute. Partial refunds require written mutual agreement.",
      status: CommitmentStatus.CONFIRMED,
    },
  });

  const cateringCommitment = await prisma.commitment.create({
    data: {
      projectId: project.id,
      supplierId: catering.id,
      title: "Catering Beta — Buffet Package",
      description: "Buffet lunch and coffee station for 100 attendees.",
      agreedAmount: php(8_000),
      amountPaid: php(0),
      paymentStatus: PaymentStatus.UNPAID,
      serviceDate: new Date("2026-12-15T12:00:00+08:00"),
      cancellationConditions:
        "Free cancellation up to 14 days before service date. Within 14 days: 40% of agreed amount as cancellation fee. Menu finalization required 7 days prior.",
      refundConditions:
        "No refund on deposits once menu is finalized unless Catering Beta cannot fulfill at the confirmed location/date.",
      status: CommitmentStatus.CONFIRMED,
    },
  });

  const photographyCommitment = await prisma.commitment.create({
    data: {
      projectId: project.id,
      supplierId: photography.id,
      title: "Photography Gamma — Event Coverage",
      description: "Full-day photography coverage and edited digital gallery.",
      agreedAmount: php(5_000),
      amountPaid: php(2_500),
      paymentStatus: PaymentStatus.PARTIAL,
      serviceDate: new Date("2026-12-15T09:00:00+08:00"),
      cancellationConditions:
        "Reschedule allowed once at no charge with 7+ days notice. Cancellation within 7 days: 50% of agreed amount retained.",
      refundConditions:
        "Deposit refundable if photographer cannot attend the confirmed service date. Alternate date subject to availability.",
      status: CommitmentStatus.CONFIRMED,
    },
  });

  const equipmentCommitment = await prisma.commitment.create({
    data: {
      projectId: project.id,
      supplierId: equipment.id,
      title: "Equipment Delta — AV Kit Rental",
      description: "Projector, wireless mics, and PA speakers for auditorium use.",
      agreedAmount: php(4_000),
      amountPaid: php(0),
      paymentStatus: PaymentStatus.UNPAID,
      serviceDate: new Date("2026-12-15T08:00:00+08:00"),
      cancellationConditions:
        "Cancellation 48+ hours before delivery: no fee. Within 48 hours: 25% of agreed amount. Delivery requires confirmed venue access.",
      refundConditions:
        "Full refund if Equipment Delta fails to deliver. Partial credit if venue access is denied by the venue operator.",
      status: CommitmentStatus.CONFIRMED,
    },
  });

  // ── Dependencies ───────────────────────────────────────────
  // The event requires Venue Alpha (venue is foundational — modeled as EVENT_DATE/LOCATION anchors for others)

  // Catering depends on event date and location
  await prisma.commitmentDependency.create({
    data: {
      commitmentId: cateringCommitment.id,
      dependsOnCommitmentId: venueCommitment.id,
      dependencyType: DependencyType.LOCATION,
      description:
        "Catering depends on the confirmed event location. A venue change may require re-scoping delivery logistics and kitchen access.",
    },
  });

  await prisma.commitmentDependency.create({
    data: {
      commitmentId: cateringCommitment.id,
      dependencyType: DependencyType.EVENT_DATE,
      description:
        "Catering service date is tied to the project event date (December 15, 2026).",
    },
  });

  // Photography depends on the event date (not necessarily the specific venue)
  await prisma.commitmentDependency.create({
    data: {
      commitmentId: photographyCommitment.id,
      dependencyType: DependencyType.EVENT_DATE,
      description:
        "Photography depends on the event date. Coverage may still proceed at an alternate venue on the same or a rescheduled date, subject to photographer availability.",
    },
  });

  // Equipment depends on venue access
  await prisma.commitmentDependency.create({
    data: {
      commitmentId: equipmentCommitment.id,
      dependsOnCommitmentId: venueCommitment.id,
      dependencyType: DependencyType.VENUE_ACCESS,
      description:
        "Equipment delivery and setup require confirmed venue access (load-in time, power, stage position).",
    },
  });

  // Foundational: event requires venue
  await prisma.commitmentDependency.create({
    data: {
      commitmentId: venueCommitment.id,
      dependencyType: DependencyType.SERVICE_ARRANGEMENT,
      description:
        "The University Tech Summit requires a confirmed venue. Venue Alpha is the primary location commitment for this project.",
    },
  });

  // ── Customer payments (demo placeholders — NOT real PayPal captures) ──
  await prisma.customerPayment.createMany({
    data: [
      {
        projectId: project.id,
        customerName: "Nina Gomez",
        customerEmail: "nina.gomez@demo.local",
        amount: php(500),
        currency: "PHP",
        paypalOrderId: null,
        paypalCaptureId: null,
        status: CustomerPaymentStatus.CREATED,
        capturedAt: null,
      },
      {
        projectId: project.id,
        customerName: "Carlos Lim",
        customerEmail: "carlos.lim@demo.local",
        amount: php(500),
        currency: "PHP",
        paypalOrderId: null,
        paypalCaptureId: null,
        status: CustomerPaymentStatus.CREATED,
        capturedAt: null,
      },
      {
        projectId: project.id,
        customerName: "Aya Mendoza",
        customerEmail: "aya.mendoza@demo.local",
        amount: php(500),
        currency: "PHP",
        paypalOrderId: null,
        paypalCaptureId: null,
        status: CustomerPaymentStatus.CREATED,
        capturedAt: null,
      },
    ],
  });

  // ── Fictional venue cancellation notice (as Document + Disruption) ──
  const cancellationNoticeText = `
VENUE ALPHA — OFFICIAL CANCELLATION NOTICE
Reference: VA-CN-2026-1215-UTS
Date Issued: November 1, 2026

To: Alex Rivera / University Tech Summit Organizing Committee
Re: Cancellation of Venue Booking — December 15, 2026

Dear Organizer,

We regret to inform you that Venue Alpha must cancel your confirmed booking for the University Tech Summit scheduled on December 15, 2026 at our Quezon City auditorium.

Reason: Urgent facility maintenance and safety inspection mandated by building management. The auditorium will be unavailable from December 10–20, 2026.

Booking details affected:
- Event: University Tech Summit
- Date: December 15, 2026
- Space: Main auditorium + lobby
- Agreed amount: PHP 15,000.00
- Amount received to date: PHP 7,500.00 (50% deposit)

Next steps (as stated in our standard terms — for demonstration only):
1. Venue Alpha will retain or refund the deposit according to written mutual agreement after review.
2. We can discuss comparable substitute dates in January 2027, subject to availability.
3. This notice does not constitute a determination of legal refund entitlement for other suppliers.

Please acknowledge receipt of this notice within five (5) business days.

Sincerely,
Maria Santos
Bookings Manager, Venue Alpha
bookings@venuealpha.demo

NOTE: This is fictional demonstration data for the KINTA hackathon demo. It is not a real legal notice.
`.trim();

  const disruption = await prisma.disruption.create({
    data: {
      projectId: project.id,
      title: "Venue Alpha cancellation — Dec 15 booking",
      description:
        "Venue Alpha issued a written cancellation notice for the December 15, 2026 University Tech Summit booking due to mandated facility maintenance. Deposit of ₱7,500 already paid. Impact on catering, photography, and equipment needs evaluation.",
      status: "REPORTED",
      reportedAt: new Date("2026-11-01T10:00:00+08:00"),
    },
  });

  await prisma.document.create({
    data: {
      projectId: project.id,
      disruptionId: disruption.id,
      type: "NOTICE",
      filename: "venue-alpha-cancellation-notice.txt",
      mimeType: "text/plain",
      storagePath: "seed/venue-alpha-cancellation-notice.txt",
      extractedText: cancellationNoticeText,
      uploadedAt: new Date("2026-11-01T10:05:00+08:00"),
    },
  });

  // Also seed a placeholder agreement excerpt for the venue
  await prisma.document.create({
    data: {
      projectId: project.id,
      disruptionId: disruption.id,
      type: "AGREEMENT",
      filename: "venue-alpha-service-agreement-excerpt.txt",
      mimeType: "text/plain",
      storagePath: "seed/venue-alpha-service-agreement-excerpt.txt",
      extractedText: `
VENUE ALPHA — SERVICE AGREEMENT (EXCERPT) — FICTIONAL DEMO
Client: University Tech Summit
Event Date: December 15, 2026
Agreed Fee: PHP 15,000.00

Section 4 — Cancellation by Venue
If Venue Alpha cancels due to facility unavailability, the parties shall discuss in good faith:
(a) an alternate date, or
(b) a deposit disposition by written mutual agreement.
This excerpt does not determine legal refund entitlement.

Section 5 — Client Obligations
Client remains responsible for coordinating dependent suppliers (catering, AV, photography).
`.trim(),
      uploadedAt: new Date("2026-11-01T10:06:00+08:00"),
    },
  });

  // Activity log for seed provenance
  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      userId: user.id,
      action: "PROJECT_CREATED",
      entityType: "Project",
      entityId: project.id,
      message: "Seeded University Tech Summit demo project",
      metadataJson: JSON.stringify({ source: "prisma/seed.ts", fictional: true }),
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      userId: user.id,
      action: "DISRUPTION_REPORTED",
      entityType: "Disruption",
      entityId: disruption.id,
      message: "Seeded fictional Venue Alpha cancellation notice",
      metadataJson: JSON.stringify({ source: "prisma/seed.ts", fictional: true }),
    },
  });

  console.log("✅ Seed complete");
  console.log(`   User:    ${user.email} (${user.id})`);
  console.log(`   Project: ${project.name} (${project.id})`);
  console.log(`   Budget:  ₱${(project.budget / 100).toLocaleString()} (${project.budget} centavos)`);
  console.log(`   Suppliers: Venue Alpha, Catering Beta, Photography Gamma, Equipment Delta`);
  console.log(`   Disruption: ${disruption.title}`);
  console.log(`   Customer payments: 3 × ₱500 (CREATED, no PayPal IDs)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
