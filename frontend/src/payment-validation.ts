
/* STEP 112 — TRADING AND PAYMENT VALIDATION */

export interface PaymentRequirement {
  key: string;
  good: string;
}

export interface PaymentIndustry {
  index: number;
  name: string;
  good: string;
  can_produce: boolean;
}

export interface PaymentPlayer {
  name: string;
  industries: readonly PaymentIndustry[];
}

export interface PaymentValidationInput {
  requirements: readonly PaymentRequirement[];
  paymentSources: Readonly<Record<string, string>>;

  players: readonly PaymentPlayer[];
  currentPlayerIndex: number;

  /*
   * Available shipping/trade capacity from
   * the latest game snapshot.
   *
   * null means unknown or unavailable.
   */
  tradeCapacity: number | null;
}

export type PaymentSourceType =
  | "produce"
  | "trade"
  | "missing"
  | "invalid";

export interface PaymentValidationRow {
  key: string;
  good: string;
  source: string;
  sourceType: PaymentSourceType;
  sourceLabel: string;
  valid: boolean;
  explanation: string;
}

export interface PaymentValidationResult {
  rows: PaymentValidationRow[];

  requiredCount: number;
  assignedCount: number;
  validCount: number;

  localProductionCount: number;
  tradeCount: number;
  tradeCapacity: number | null;

  errors: string[];
  warnings: string[];

  canSubmit: boolean;
}

function validIndex(value: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return null;
  }

  const index = Number(value);

  return Number.isSafeInteger(index)
    ? index
    : null;
}

export function validateConstructionPayments(
  input: PaymentValidationInput
): PaymentValidationResult {
  const {
    requirements,
    paymentSources,
    players,
    currentPlayerIndex,
    tradeCapacity,
  } = input;

  const currentPlayer =
    players[currentPlayerIndex] ?? null;

  const usedProducers = new Set<number>();
  const errors: string[] = [];
  const warnings: string[] = [];

  let assignedCount = 0;
  let validCount = 0;
  let localProductionCount = 0;
  let tradeCount = 0;

  const rows: PaymentValidationRow[] =
    requirements.map(requirement => {
      const { key, good } = requirement;
      const source = paymentSources[key] ?? "";

      function invalid(
        sourceType: PaymentSourceType,
        sourceLabel: string,
        explanation: string
      ): PaymentValidationRow {
        errors.push(`${good} (${key}): ${explanation}`);

        return {
          key,
          good,
          source,
          sourceType,
          sourceLabel,
          valid: false,
          explanation,
        };
      }

      if (!source) {
        return invalid(
          "missing",
          "Not assigned",
          "Choose a payment source."
        );
      }

      assignedCount += 1;

      const match =
        /^(produce|trade):(\d+)$/.exec(source);

      if (!match) {
        return invalid(
          "invalid",
          source,
          "Unknown or malformed construction payment source."
        );
      }

      const sourceType = match[1] as
        "produce" | "trade";

      const index = validIndex(match[2]);

      if (index === null) {
        return invalid(
          sourceType,
          source,
          "The selected index is invalid."
        );
      }

      if (sourceType === "produce") {
        localProductionCount += 1;

        const industry =
          currentPlayer?.industries.find(
            item => item.index === index
          );

        if (!industry) {
          return invalid(
            "produce",
            `Producer #${index}`,
            "The local producer does not exist."
          );
        }

        if (industry.good !== good) {
          return invalid(
            "produce",
            industry.name,
            "This industry produces a different good."
          );
        }

        if (!industry.can_produce) {
          return invalid(
            "produce",
            industry.name,
            "The game snapshot reports this producer as unavailable."
          );
        }

        if (usedProducers.has(index)) {
          return invalid(
            "produce",
            industry.name,
            "The same local producer is already assigned to another payment."
          );
        }

        usedProducers.add(index);
        validCount += 1;

        return {
          key,
          good,
          source,
          sourceType: "produce",
          sourceLabel: industry.name,
          valid: true,
          explanation:
            "This local producer matches the required good and reports readiness.",
        };
      }

      /* TRADE PAYMENT */

      tradeCount += 1;

      if (index === currentPlayerIndex) {
        return invalid(
          "trade",
          "Current player",
          "You cannot trade with yourself."
        );
      }

      const partner = players[index];

      if (!partner) {
        return invalid(
          "trade",
          `Player #${index}`,
          "The selected trading partner does not exist."
        );
      }

      const canSupply = partner.industries.some(
        industry => industry.good === good
      );

      if (!canSupply) {
        return invalid(
          "trade",
          partner.name,
          "This trading partner does not own an industry producing the required good."
        );
      }

      validCount += 1;

      return {
        key,
        good,
        source,
        sourceType: "trade",
        sourceLabel: partner.name,
        valid: true,
        explanation:
          "The trading partner owns an industry producing the required good.",
      };
    });

  /*
   * Snapshot-level shipping diagnostics.
   *
   * Do not equate shipping capacity with a
   * guaranteed number of successful trades.
   * The engine evaluates the actual sequence.
   */
  if (
    tradeCount > 0 &&
    tradeCapacity === null
  ) {
    warnings.push(
      "Shipping capacity is unavailable. The engine must validate trade execution."
    );
  }

  if (
    tradeCapacity !== null &&
    tradeCount > tradeCapacity
  ) {
    warnings.push(
      `${tradeCount} trade payment(s) are selected, but the snapshot reports only ${tradeCapacity} available trade capacity. The engine may reject this action.`
    );
  }

  if (
    tradeCapacity !== null &&
    tradeCount > 0 &&
    tradeCapacity === 0
  ) {
    warnings.push(
      "No available trade capacity is reported for the current player."
    );
  }

  return {
    rows,
    requiredCount: requirements.length,
    assignedCount,
    validCount,
    localProductionCount,
    tradeCount,
    tradeCapacity,
    errors,
    warnings,

    canSubmit:
      errors.length === 0 &&
      validCount === requirements.length,
  };
}
