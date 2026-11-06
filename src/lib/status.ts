import type {
  CommitmentStatus,
  CustomerPaymentStatus,
  DisruptionStatus,
  ImpactClassification,
  ProjectStatus,
  RecoveryActionStatus,
  RecoveryStrategy,
} from "@/lib/types";

const toneClasses = {
  neutral: "bg-[var(--surface-2)] text-[var(--ink-muted)] border-[var(--line)]",
  info: "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info-line)]",
  good: "bg-[var(--good-soft)] text-[var(--good)] border-[var(--good-line)]",
  warn: "bg-[var(--warn-soft)] text-[var(--warn)] border-[var(--warn-line)]",
  bad: "bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad-line)]",
  accent: "bg-[var(--teal-soft)] text-[var(--teal)] border-[var(--teal-line)]",
} as const;

export type Tone = keyof typeof toneClasses;

export function toneClass(tone: Tone) {
  return toneClasses[tone];
}

export function projectStatusTone(status: ProjectStatus): Tone {
  switch (status) {
    case "ACTIVE":
      return "good";
    case "DISRUPTED":
      return "bad";
    case "RECOVERING":
      return "warn";
    case "COMPLETED":
      return "accent";
    case "ARCHIVED":
      return "neutral";
    default:
      return "info";
  }
}

export function disruptionStatusTone(status: DisruptionStatus): Tone {
  switch (status) {
    case "REPORTED":
      return "warn";
    case "ANALYZING":
    case "ANALYZED":
    case "PLANNING":
      return "info";
    case "RESOLVED":
      return "good";
    default:
      return "neutral";
  }
}

export function commitmentStatusTone(status: CommitmentStatus): Tone {
  switch (status) {
    case "CONFIRMED":
    case "FULFILLED":
      return "good";
    case "AT_RISK":
      return "warn";
    case "CANCELLED":
      return "bad";
    case "RENEGOTIATED":
      return "accent";
    default:
      return "neutral";
  }
}

export function paymentStatusTone(status: CustomerPaymentStatus): Tone {
  switch (status) {
    case "CAPTURED":
      return "good";
    case "APPROVED":
    case "CREATED":
      return "info";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "accent";
    case "FAILED":
    case "VOIDED":
      return "bad";
    default:
      return "neutral";
  }
}

export function actionStatusTone(status: RecoveryActionStatus): Tone {
  switch (status) {
    case "APPROVED":
    case "COMPLETED":
      return "good";
    case "AWAITING_APPROVAL":
    case "NEEDS_CONFIRMATION":
    case "PROCESSING":
      return "warn";
    case "FAILED":
    case "REJECTED":
      return "bad";
    default:
      return "neutral";
  }
}

export function impactTone(classification: ImpactClassification): Tone {
  switch (classification) {
    case "DIRECTLY_AFFECTED":
      return "bad";
    case "INDIRECTLY_AFFECTED":
      return "warn";
    case "UNCERTAIN":
      return "info";
    case "UNAFFECTED":
      return "good";
    default:
      return "neutral";
  }
}

export function strategyLabel(strategy: RecoveryStrategy) {
  switch (strategy) {
    case "CANCEL":
      return "Cancel";
    case "RELOCATE":
      return "Relocate";
    case "RESCHEDULE":
      return "Reschedule";
  }
}

export function labelize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
