/** Shared frontend types mirroring frozen API contracts (docs/API.md). */

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStatus =
  | "DRAFT"
  | "ACTIVE"
  | "DISRUPTED"
  | "RECOVERING"
  | "ARCHIVED"
  | "COMPLETED";

export type SupplierCategory =
  | "VENUE"
  | "CATERING"
  | "PHOTOGRAPHY"
  | "EQUIPMENT"
  | "TRANSPORT"
  | "ENTERTAINMENT"
  | "OTHER";

export type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type CommitmentStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "AT_RISK"
  | "CANCELLED"
  | "FULFILLED"
  | "RENEGOTIATED";

export type DependencyType =
  | "COMMITMENT"
  | "EVENT_DATE"
  | "LOCATION"
  | "VENUE_ACCESS"
  | "SERVICE_ARRANGEMENT";

export type CustomerPaymentStatus =
  | "CREATED"
  | "APPROVED"
  | "CAPTURED"
  | "VOIDED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "FAILED";

export type DisruptionStatus =
  | "REPORTED"
  | "ANALYZING"
  | "ANALYZED"
  | "PLANNING"
  | "RESOLVED";

export type RecoveryStrategy = "CANCEL" | "RELOCATE" | "RESCHEDULE";

export type RecoveryActionStatus =
  | "DRAFT"
  | "NEEDS_CONFIRMATION"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export type RecoveryActionType =
  | "CANCEL_COMMITMENT"
  | "RENEGOTIATE"
  | "RELOCATE"
  | "RESCHEDULE"
  | "REQUEST_REFUND"
  | "CUSTOMER_REFUND"
  | "ADDITIONAL_BOOKING"
  | "OTHER";

export type ImpactClassification =
  | "DIRECTLY_AFFECTED"
  | "INDIRECTLY_AFFECTED"
  | "UNCERTAIN"
  | "UNAFFECTED";

export type Supplier = {
  id: string;
  projectId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  category: SupplierCategory;
  notes: string | null;
};

export type CommitmentDependency = {
  id: string;
  commitmentId: string;
  dependsOnCommitmentId: string | null;
  dependencyType: DependencyType;
  description: string;
};

export type Commitment = {
  id: string;
  projectId: string;
  supplierId: string;
  title: string;
  description: string | null;
  agreedAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  serviceDate: string | null;
  cancellationConditions: string | null;
  refundConditions: string | null;
  status: CommitmentStatus;
  supplier?: Pick<Supplier, "id" | "name" | "category">;
  dependencies?: CommitmentDependency[];
};

export type Expense = {
  id: string;
  projectId: string;
  commitmentId: string | null;
  description: string;
  amount: number;
  category: string;
  incurredAt: string;
  notes: string | null;
};

export type CustomerPayment = {
  id: string;
  projectId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  status: CustomerPaymentStatus;
  capturedAt: string | null;
  createdAt: string;
};

export type Disruption = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: DisruptionStatus;
  reportedAt: string;
};

export type ProjectSummary = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  eventDate: string;
  location: string;
  budget: number;
  expectedAttendees: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = ProjectSummary & {
  user: Pick<User, "id" | "email" | "name">;
  suppliers: Supplier[];
  commitments: Commitment[];
  expenses: Expense[];
  customerPayments: CustomerPayment[];
  disruptions: Disruption[];
  _count: {
    suppliers: number;
    commitments: number;
    expenses: number;
    disruptions: number;
    recoveryActions: number;
    activityLogs: number;
  };
};

export type EventAnalysis = {
  id: string;
  disruptionId: string;
  incidentType: string;
  incidentSummary: string;
  affectedSupplierIds: string[] | string;
  affectedCommitmentIds: string[] | string;
  potentiallyAffectedCommitmentIds?: string[] | string;
  potentiallyAffectedIds?: string[] | string;
  unaffectedCommitmentIds: string[] | string;
  relevantDates: string[] | string;
  relevantAgreementConditions: string[] | string;
  evidenceReferences: string[] | string;
  missingInformation: string[] | string;
  assumptions: string[] | string;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  legalDisclaimer?: string;
  analysisMethod?: string;
  rawAnalysisJson?: string;
};

export type DependencyImpactItem = {
  commitmentId: string;
  classification: ImpactClassification;
  explanation: string;
  assumedCancelled: boolean;
};

export type ScenarioFinancials = {
  originalProjectBudget: { amountCentavos: number; classification: string; label: string };
  totalRecordedCommitments: { amountCentavos: number; classification: string; label: string };
  paymentsAlreadyMade: { amountCentavos: number; classification: string; label: string };
  customerPaymentsCollected: { amountCentavos: number; classification: string; label: string };
  estimatedAdditionalCosts: { amountCentavos: number; classification: string; label: string };
  estimatedRecoverableExpenses: { amountCentavos: number; classification: string; label: string };
  estimatedNonrecoverableExpenses: { amountCentavos: number; classification: string; label: string };
  potentialCustomerRefunds: { amountCentavos: number; classification: string; label: string };
  remainingBudget: { amountCentavos: number; classification: string; label: string };
  remainingFinancialExposure: { amountCentavos: number; classification: string; label: string };
  netFinancialImpact: { amountCentavos: number; classification: string; label: string };
  breakdownNotes: string[];
};

export type Scenario = {
  id: string;
  projectId: string;
  recoveryPlanId: string;
  strategy: RecoveryStrategy;
  summary: string;
  assumptionsJson: string;
  financialsJson: string | null;
  planDetailJson: string;
  createdAt: string;
  updatedAt: string;
  financials?: ScenarioFinancials | null;
};

export type RecoveryPlan = {
  id: string;
  projectId: string;
  disruptionId: string;
  plansJson: string;
  createdAt: string;
  scenarios?: Scenario[];
};

export type RecoveryAction = {
  id: string;
  projectId: string;
  scenarioId: string | null;
  type: RecoveryActionType;
  title: string;
  description: string | null;
  status: RecoveryActionStatus;
  commitmentId: string | null;
  amount: number | null;
  requiresPaypal: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  scenario?: { id: string; strategy: RecoveryStrategy; summary: string } | null;
};

export type ActivityLog = {
  id: string;
  projectId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  message: string;
  metadataJson: string;
  createdAt: string;
};

export function asStringArray(value: string[] | string | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseJsonField<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
