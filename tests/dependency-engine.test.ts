/**
 * Unit tests for identifyAffectedCommitments() — University Tech Summit shape.
 * Run: npx tsx tests/dependency-engine.test.ts
 */

import { identifyAffectedCommitments } from "../src/services/dependency";
import type { Commitment, CommitmentDependency, Supplier } from "@prisma/client";

type Node = Commitment & {
  supplier: Pick<Supplier, "id" | "name" | "category">;
  dependencies: CommitmentDependency[];
};

function commitment(partial: {
  id: string;
  title: string;
  supplierId: string;
  supplierName: string;
  category: Supplier["category"];
  dependencies: Array<Partial<CommitmentDependency> & {
    id: string;
    dependencyType: CommitmentDependency["dependencyType"];
    description: string;
  }>;
}): Node {
  const now = new Date();
  return {
    id: partial.id,
    projectId: "proj_1",
    supplierId: partial.supplierId,
    title: partial.title,
    description: null,
    agreedAmount: 100,
    amountPaid: 0,
    paymentStatus: "UNPAID",
    serviceDate: null,
    cancellationConditions: null,
    refundConditions: null,
    status: "CONFIRMED",
    createdAt: now,
    updatedAt: now,
    supplier: {
      id: partial.supplierId,
      name: partial.supplierName,
      category: partial.category,
    },
    dependencies: partial.dependencies.map((d) => ({
      id: d.id,
      commitmentId: partial.id,
      dependsOnCommitmentId: d.dependsOnCommitmentId ?? null,
      dependencyType: d.dependencyType,
      description: d.description,
      createdAt: now,
      updatedAt: now,
    })),
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const venue = commitment({
  id: "c_venue",
  title: "Main auditorium booking",
  supplierId: "s_venue",
  supplierName: "Venue Alpha",
  category: "VENUE",
  dependencies: [
    {
      id: "d_venue_foundation",
      dependencyType: "SERVICE_ARRANGEMENT",
      description: "Event requires a confirmed venue",
    },
  ],
});

const catering = commitment({
  id: "c_catering",
  title: "Lunch catering",
  supplierId: "s_catering",
  supplierName: "Catering Beta",
  category: "CATERING",
  dependencies: [
    {
      id: "d_cat_loc",
      dependsOnCommitmentId: "c_venue",
      dependencyType: "LOCATION",
      description: "Catering depends on confirmed event location",
    },
    {
      id: "d_cat_date",
      dependencyType: "EVENT_DATE",
      description: "Catering tied to event date",
    },
  ],
});

const photography = commitment({
  id: "c_photo",
  title: "Event photography",
  supplierId: "s_photo",
  supplierName: "Photography Gamma",
  category: "PHOTOGRAPHY",
  dependencies: [
    {
      id: "d_photo_date",
      dependencyType: "EVENT_DATE",
      description:
        "Photography depends on event date; may proceed at alternate venue",
    },
  ],
});

const equipment = commitment({
  id: "c_equip",
  title: "AV equipment rental",
  supplierId: "s_equip",
  supplierName: "Equipment Delta",
  category: "EQUIPMENT",
  dependencies: [
    {
      id: "d_equip_access",
      dependsOnCommitmentId: "c_venue",
      dependencyType: "VENUE_ACCESS",
      description: "Equipment requires venue access",
    },
  ],
});

const result = identifyAffectedCommitments(
  [venue, catering, photography, equipment],
  {
    projectId: "proj_1",
    seedCommitmentIds: ["c_venue"],
    disruptionId: "dis_1",
  },
);

assert(result.directlyAffected.length === 1, "venue should be direct");
assert(
  result.directlyAffected[0]?.commitmentId === "c_venue",
  "direct seed is venue",
);
assert(
  result.indirectlyAffected.map((c) => c.commitmentId).sort().join(",") ===
    "c_catering,c_equip",
  `expected catering+equipment indirect, got ${result.indirectlyAffected.map((c) => c.commitmentId)}`,
);
assert(
  result.uncertain.map((c) => c.commitmentId).join(",") === "c_photo",
  "photography should be UNCERTAIN (date-only, may relocate)",
);
assert(result.unaffected.length === 0, "no unaffected in this fixture");

for (const bucket of [
  ...result.directlyAffected,
  ...result.indirectlyAffected,
  ...result.uncertain,
  ...result.unaffected,
]) {
  assert(bucket.assumedCancelled === false, "must never assume cancelled");
  assert(bucket.explanation.length > 0, "explanation required");
}

console.log("dependency-engine tests passed");
console.log(
  JSON.stringify(
    {
      direct: result.directlyAffected.map((c) => c.title),
      indirect: result.indirectlyAffected.map((c) => c.title),
      uncertain: result.uncertain.map((c) => c.title),
    },
    null,
    2,
  ),
);
