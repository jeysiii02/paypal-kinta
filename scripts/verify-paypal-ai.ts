/**
 * Smoke-test PayPal + AI technological wiring (mock-friendly).
 * Run: npx tsx scripts/verify-paypal-ai.ts
 */
import { PrismaClient } from "@prisma/client";
import { getAiTechStatus } from "../src/services/ai/status";
import { getPayPalTechStatus } from "../src/services/paypal/client";
import {
  captureCustomerPaymentOrder,
  createCustomerPaymentOrder,
  getPayPalOrder,
} from "../src/services/paypal/orders";
import { refundCustomerPayment } from "../src/services/paypal/refunds";
import { explainRecoveryBrief } from "../src/services/ai/explainRecoveryBrief";

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("🔎 Verifying PayPal + AI technological implementation…");

  const ai = getAiTechStatus();
  const paypal = getPayPalTechStatus();
  console.log(`   AI: ${ai.provider} / ${ai.model} ready=${ai.ready}`);
  console.log(
    `   PayPal: mode=${paypal.mode} currency=${paypal.currency} sdkReady=${paypal.sdkReady}`,
  );
  assert(ai.ready, "AI provider is not ready");
  assert(paypal.apis.length >= 5, "PayPal capability list too thin");

  const project = await prisma.project.findFirst({
    where: { name: "University Tech Summit" },
    include: { customerPayments: true, disruptions: true },
  });
  assert(project, "Seed project missing — run prisma db seed");
  assert(project.customerPayments.length > 0, "Seed payments missing");

  const payment = project.customerPayments[0];

  // Reset payment to CREATED for idempotent re-runs
  await prisma.refund.deleteMany({ where: { customerPaymentId: payment.id } });
  await prisma.customerPayment.update({
    where: { id: payment.id },
    data: {
      status: "CREATED",
      paypalOrderId: null,
      paypalCaptureId: null,
      capturedAt: null,
    },
  });

  const created = await createCustomerPaymentOrder({
    projectId: project.id,
    customerPaymentId: payment.id,
  });
  assert(created.orderId, "Order create failed");
  console.log(`   ✓ Order create: ${created.orderId} (${created.mode})`);

  const shown = await getPayPalOrder(created.orderId);
  assert(shown.id === created.orderId, "Order show mismatch");
  console.log(`   ✓ Order show: status=${shown.status}`);

  const captured = await captureCustomerPaymentOrder({
    projectId: project.id,
    customerPaymentId: payment.id,
    orderId: created.orderId,
  });
  assert(captured.captureId, "Capture failed");
  console.log(`   ✓ Capture: ${captured.captureId}`);

  const refunded = await refundCustomerPayment({
    customerPaymentId: payment.id,
    amountCentavos: Math.min(payment.amount, 10000),
    reason: "verify-paypal-ai script",
  });
  assert(refunded.refund.paypalRefundId, "Refund missing paypalRefundId");
  console.log(`   ✓ Refund: ${refunded.refund.paypalRefundId}`);

  const brief = await explainRecoveryBrief({
    projectName: project.name,
    disruptionTitle: project.disruptions[0]?.title ?? "Demo disruption",
    scenarios: [
      {
        strategy: "CANCEL",
        summary: "Cancel affected commitments",
        netFinancialImpactCentavos: 250000,
        remainingBudgetCentavos: 2000000,
        exposureCentavos: 300000,
      },
      {
        strategy: "RELOCATE",
        summary: "Move venue",
        netFinancialImpactCentavos: 180000,
        remainingBudgetCentavos: 2200000,
        exposureCentavos: 220000,
      },
      {
        strategy: "RESCHEDULE",
        summary: "Move date",
        netFinancialImpactCentavos: 120000,
        remainingBudgetCentavos: 2400000,
        exposureCentavos: 150000,
      },
    ],
  });
  assert(brief.generationMethod, "Brief missing generationMethod");
  assert(brief.paypalNextStep.length > 0, "Brief missing PayPal next step");
  console.log(
    `   ✓ AI recovery brief: ${brief.recommendation} via ${brief.generationMethod}`,
  );

  console.log("✅ PayPal + AI verification passed");
}

main()
  .catch((error) => {
    console.error("❌ verify-paypal-ai failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
