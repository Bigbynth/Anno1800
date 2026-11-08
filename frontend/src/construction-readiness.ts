
/* STEP 108 — CONSTRUCTION RESOURCE READINESS */

export type ConstructionReadinessStatus =
  | "blocked"
  | "incomplete"
  | "ready_for_backend";

export interface ConstructionRequirement {
  key: string;
  good: string;
}

export interface ConstructionProducer {
  good: string;
  can_produce: boolean;
}

export interface ConstructionIndustry {
  id: string;
  name: string;
  remaining: number;
  already_owned: boolean;
}

export interface ConstructionSpace {
  id: string;
  type: string;
  occupied: boolean;
}

export interface ResourceReadiness {
  good: string;
  required: number;
  assigned: number;
  missing: number;
  readyLocalProducers: number;
}

export interface ConstructionReadinessResult {
  status: ConstructionReadinessStatus;
  industryName: string | null;
  requiredCount: number;
  assignedCount: number;
  missingCount: number;
  resources: ResourceReadiness[];
  blockers: string[];
  warnings: string[];
  canSubmit: boolean;
}

export interface ConstructionReadinessInput {
  industry: ConstructionIndustry | null;
  target: ConstructionSpace | null;
  candidateSpaceIds: readonly string[];
  requirements: readonly ConstructionRequirement[];
  paymentSources: Readonly<Record<string, string>>;
  producers: readonly ConstructionProducer[];
  duplicateProduction: boolean;
  actionLoading: boolean;
  gameOver: boolean;
  mainActionUsed: boolean;
}

export function getConstructionReadiness(
  input: ConstructionReadinessInput
): ConstructionReadinessResult {
  const {
    industry,
    target,
    candidateSpaceIds,
    requirements,
    paymentSources,
    producers,
    duplicateProduction,
    actionLoading,
    gameOver,
    mainActionUsed,
  } = input;

  const blockers: string[] = [];
  const warnings: string[] = [];

  /* 1. Known global blockers */

  if (gameOver) {
    blockers.push("The match has ended.");
  } else if (actionLoading) {
    blockers.push(
      "Another game action is currently processing."
    );
  } else if (mainActionUsed) {
    blockers.push(
      "The current player's main action has already been used."
    );
  }

  /* 2. Industry selection and supply */

  if (!industry) {
    warnings.push(
      "Select an industry from the Construction Palette."
    );
  } else {
    if (industry.remaining <= 0) {
      blockers.push(
        "No remaining copies of this industry are reported."
      );
    }

    if (industry.already_owned) {
      blockers.push(
        "The active player already owns this industry."
      );
    }
  }

  /* 3. Placement selection */

  if (!target) {
    warnings.push(
      "Choose a candidate location on the island."
    );
  } else {
    if (target.occupied) {
      blockers.push(
        "The selected location is already occupied."
      );
    }

    if (!candidateSpaceIds.includes(target.id)) {
      blockers.push(
        "The selected location is not in the current candidate list."
      );
    }
  }

  /* 4. Count required and assigned goods */

  const counts = new Map<
    string,
    { required: number; assigned: number }
  >();

  let assignedCount = 0;
  let missingCount = 0;

  for (const requirement of requirements) {
    const existing = counts.get(requirement.good) ?? {
      required: 0,
      assigned: 0,
    };

    existing.required += 1;

    if (paymentSources[requirement.key]) {
      existing.assigned += 1;
      assignedCount += 1;
    } else {
      missingCount += 1;
    }

    counts.set(requirement.good, existing);
  }

  const resources: ResourceReadiness[] =
    Array.from(counts.entries()).map(
      ([good, count]) => ({
        good,
        required: count.required,
        assigned: count.assigned,
        missing: count.required - count.assigned,

        readyLocalProducers:
          producers.filter(
            producer =>
              producer.good === good &&
              producer.can_produce
          ).length,
      })
    );

  if (industry && missingCount > 0) {
    warnings.push(
      `${missingCount} required resource assignment(s) are missing.`
    );
  }

  if (duplicateProduction) {
    blockers.push(
      "The same local producer has been assigned more than once."
    );
  }

  /*
   * Assigned payment sources still need backend
   * validation. The frontend does not declare
   * them legal simply because they are selected.
   */

  const hasUnknownPaymentSource = requirements.some(
    requirement => {
      const source = paymentSources[requirement.key];

      if (!source) return false;

      return !(
        source.startsWith("produce:") ||
        source.startsWith("trade:") ||
        source.startsWith("new_world:")
      );
    }
  );

  if (hasUnknownPaymentSource) {
    blockers.push(
      "An unrecognized payment-source type is selected."
    );
  }

  /* 5. Readiness decision */

  const needsSelection =
    !industry ||
    !target ||
    missingCount > 0;

  const status: ConstructionReadinessStatus =
    blockers.length > 0
      ? "blocked"
      : needsSelection
        ? "incomplete"
        : "ready_for_backend";

  if (status === "ready_for_backend") {
    warnings.push(
      "Frontend checks passed. The Python engine must still validate construction."
    );
  }

  return {
    status,
    industryName: industry?.name ?? null,
    requiredCount: requirements.length,
    assignedCount,
    missingCount,
    resources,
    blockers,
    warnings,
    canSubmit: status === "ready_for_backend",
  };
}
