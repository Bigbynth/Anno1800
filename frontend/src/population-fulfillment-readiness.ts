
import type { GameSnapshot } from "./types";

export interface PopulationPaymentRequirement {
  key: string;
  good: string;
}

export type PopulationPaymentStatus =
  | "valid"
  | "missing"
  | "invalid";

export interface PopulationPaymentCheck {
  key: string;
  good: string;
  source: string;
  status: PopulationPaymentStatus;
  message: string;
}

export interface PopulationFulfillmentReadiness {
  canSubmit: boolean;
  assignedCount: number;
  validCount: number;
  requiredCount: number;
  localProductionCount: number;
  tradeCount: number;
  newWorldCount: number;
  errors: string[];
  warnings: string[];
  checks: PopulationPaymentCheck[];
}

export interface PopulationFulfillmentInput {
  game: GameSnapshot;
  requirements: readonly PopulationPaymentRequirement[];
  paymentSources: Readonly<Record<string, string>>;
  tradeCapacity: number | null;
}

function parseIndex(value: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed)
    ? parsed
    : null;
}

export function analyzePopulationFulfillment(
  input: PopulationFulfillmentInput
): PopulationFulfillmentReadiness {
  const {
    game,
    requirements,
    paymentSources,
    tradeCapacity,
  } = input;

  const player =
    game.players[game.current_player_index];

  const usedProducers = new Set<number>();
  const tradedGoods = new Set<string>();

  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: PopulationPaymentCheck[] = [];

  let assignedCount = 0;
  let validCount = 0;
  let localProductionCount = 0;
  let tradeCount = 0;
  let newWorldCount = 0;

  function addCheck(
    key: string,
    good: string,
    source: string,
    status: PopulationPaymentStatus,
    message: string
  ) {
    checks.push({
      key,
      good,
      source,
      status,
      message,
    });

    if (status === "valid") {
      validCount += 1;
    } else {
      errors.push(`${good}: ${message}`);
    }
  }

  for (const requirement of requirements) {
    const { key, good } = requirement;

    const source = paymentSources[key] ?? "";

    if (!source) {
      addCheck(
        key, good, source, "missing",
        "No payment source selected."
      );
      continue;
    }

    assignedCount += 1;

    if (source.startsWith("produce:")) {
      localProductionCount += 1;

      const index = parseIndex(
        source.slice("produce:".length)
      );

      const industry = index === null
        ? undefined
        : player?.industries.find(
            item => item.index === index
          );

      if (!industry || index === null) {
        addCheck(
          key, good, source, "invalid",
          "The selected local producer does not exist."
        );
        continue;
      }

      if (industry.good !== good) {
        addCheck(
          key, good, source, "invalid",
          "This industry produces a different good."
        );
        continue;
      }

      if (!industry.can_produce) {
        addCheck(
          key, good, source, "invalid",
          "This producer is unavailable in the current game snapshot."
        );
        continue;
      }

      if (usedProducers.has(index)) {
        addCheck(
          key, good, source, "invalid",
          "The same local producer is assigned more than once."
        );
        continue;
      }

      usedProducers.add(index);

      addCheck(
        key, good, source, "valid",
        `Ready local producer: ${industry.name}.`
      );
      continue;
    }

    if (source.startsWith("trade:")) {
      tradeCount += 1;

      const index = parseIndex(
        source.slice("trade:".length)
      );

      const partner = index === null
        ? undefined
        : game.players[index];

      if (
        index === null ||
        index === game.current_player_index ||
        !partner
      ) {
        addCheck(
          key, good, source, "invalid",
          "The selected trading partner is invalid."
        );
        continue;
      }

      if (
        !partner.industries.some(
          industry => industry.good === good
        )
      ) {
        addCheck(
          key, good, source, "invalid",
          "The partner cannot supply the required good."
        );
        continue;
      }

      // The engine permits a particular good to
      // be traded only once per turn.
      if (tradedGoods.has(good)) {
        addCheck(
          key, good, source, "invalid",
          "This good is assigned to multiple trades."
        );
        continue;
      }

      tradedGoods.add(good);

      addCheck(
        key, good, source, "valid",
        `Potential trading partner: ${partner.name}.`
      );
      continue;
    }

    if (source.startsWith("new_world:")) {
      newWorldCount += 1;

      const islandId = source.slice(
        "new_world:".length
      );

      const island = player?.new_world_islands.find(
        item => item.id === islandId
      );

      if (!islandId || !island) {
        addCheck(
          key, good, source, "invalid",
          "The selected New World island is not owned by this player."
        );
        continue;
      }

      if (!island.resources.includes(good)) {
        addCheck(
          key, good, source, "invalid",
          "This New World island cannot supply the good."
        );
        continue;
      }

      addCheck(
        key, good, source, "valid",
        `New World resource: ${island.name}.`
      );
      continue;
    }

    addCheck(
      key, good, source, "invalid",
      "Unknown payment-source format."
    );
  }

  if (
    tradeCapacity !== null &&
    newWorldCount > tradeCapacity
  ) {
    errors.push(
      `New World payments require at least ` +
      `${newWorldCount} Trade token(s); ` +
      `only ${tradeCapacity} are reported available.`
    );
  }

  if (
    (tradeCount > 0 || newWorldCount > 0) &&
    tradeCapacity === null
  ) {
    warnings.push(
      "Trade capacity is unavailable. Shipping requirements must be checked by the engine."
    );
  }

  if (
    tradeCount > 0 &&
    tradeCapacity !== null
  ) {
    warnings.push(
      "Trading costs depend on the partner's producing industry. The engine will validate the total token cost."
    );
  }

  return {
    canSubmit:
      Boolean(player) &&
      errors.length === 0 &&
      validCount === requirements.length,

    assignedCount,
    validCount,
    requiredCount: requirements.length,
    localProductionCount,
    tradeCount,
    newWorldCount,
    errors,
    warnings,
    checks,
  };
}
