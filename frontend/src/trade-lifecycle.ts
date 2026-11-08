
/* STEP 117 — TRADE & NEW WORLD LIFECYCLE */

import type { GameSnapshot } from "./types";

export interface TradeRequirement {
  key: string;
  good: string;
}

export type TradePaymentKind =
  | "produce"
  | "trade"
  | "new_world"
  | "unknown";

export interface TradeLifecycleRow {
  key: string;
  good: string;
  source: string;
  kind: TradePaymentKind;
  tokenCost: number;
  valid: boolean;
  explanation: string;
}

export interface TradeLifecycleResult {
  rows: TradeLifecycleRow[];
  tradeCount: number;
  newWorldCount: number;
  requiredTradeTokens: number;
  availableTradeTokens: number | null;
  alreadyTradedGoods: string[];
  errors: string[];
  warnings: string[];
  canSubmit: boolean;
}

export interface TradeLifecycleInput {
  game: GameSnapshot;
  requirements: readonly TradeRequirement[];
  paymentSources: Readonly<Record<string, string>>;
  tradeCapacity: number | null;
  allowNewWorld: boolean;
}

/*
 * Matches TRADE_TOKEN_COST in
 * src/anno1800/models/trade.py.
 *
 * Keep the frontend and engine rules aligned.
 */
export const TRADE_TOKEN_COST: Readonly<
  Record<string, number>
> = {
  farmer: 1,
  worker: 1,
  artisan: 2,
  engineer: 3,
  investor: 5,
};

function parsePlayerIndex(
  value: string
): number | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    return null;
  }

  const index = Number(value);

  return Number.isSafeInteger(index)
    ? index
    : null;
}

export function analyzeTradeLifecycle(
  input: TradeLifecycleInput
): TradeLifecycleResult {
  const {
    game,
    requirements,
    paymentSources,
    tradeCapacity,
    allowNewWorld,
  } = input;

  const playerIndex = game.current_player_index;
  const player = game.players[playerIndex];

  const history = new Set(
    player?.traded_goods_this_turn ?? []
  );

  const plannedTrades = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: TradeLifecycleRow[] = [];

  let tradeCount = 0;
  let newWorldCount = 0;
  let requiredTradeTokens = 0;

  for (const requirement of requirements) {
    const { key, good } = requirement;
    const source = paymentSources[key] ?? "";

    let kind: TradePaymentKind = "unknown";
    let tokenCost = 0;
    let valid = true;
    let explanation = "";

    if (!source) {
      valid = false;
      explanation = "Choose a payment source.";
    } else if (/^produce:(0|[1-9]\d*)$/.test(source)) {
      kind = "produce";
      explanation =
        "Local production is checked by the existing payment validator.";
    } else if (source.startsWith("trade:")) {
      kind = "trade";
      tradeCount += 1;

      const partnerIndex = parsePlayerIndex(
        source.slice("trade:".length)
      );

      if (
        partnerIndex === null ||
        partnerIndex === playerIndex ||
        !game.players[partnerIndex]
      ) {
        valid = false;
        explanation = "Invalid trading partner.";
      } else if (history.has(good)) {
        valid = false;
        explanation =
          "This good has already been traded during the current turn.";
      } else if (plannedTrades.has(good)) {
        valid = false;
        explanation =
          "The same good cannot be traded twice in one payment plan.";
      } else {
        const partner = game.players[partnerIndex];

        // Match the backend's first matching industry.
        const supplier = partner.industries.find(
          industry => industry.good === good
        );

        if (!supplier) {
          valid = false;
          explanation =
            "This partner does not own an industry producing the required good.";
        } else {
          const cost =
            TRADE_TOKEN_COST[supplier.worker_type];

          if (cost === undefined) {
            valid = false;
            explanation =
              "Unknown worker tier. Trade-token cost cannot be determined.";
          } else {
            tokenCost = cost;
            requiredTradeTokens += cost;
            plannedTrades.add(good);

            explanation =
              `${partner.name} supplies ${good} ` +
              `for ${cost} Trade token(s).`;
          }
        }
      }
    } else if (source.startsWith("new_world:")) {
      kind = "new_world";
      newWorldCount += 1;

      const islandId = source.slice(
        "new_world:".length
      );

      const island = player?.new_world_islands.find(
        item => item.id === islandId
      );

      if (!allowNewWorld) {
        valid = false;
        explanation =
          "New World payments are not supported by this action.";
      } else if (!island) {
        valid = false;
        explanation =
          "This New World island is not owned by the active player.";
      } else if (!island.resources.includes(good)) {
        valid = false;
        explanation =
          "This island does not supply the required good.";
      } else {
        tokenCost = 1;
        requiredTradeTokens += 1;

        explanation =
          `${island.name} supplies ${good} ` +
          "using one Trade token.";
      }
    } else {
      valid = false;
      explanation =
        "Unknown or malformed payment source.";
    }

    if (!valid) {
      errors.push(`${good}: ${explanation}`);
    }

    rows.push({
      key,
      good,
      source,
      kind,
      tokenCost,
      valid,
      explanation,
    });
  }

  if (
    tradeCapacity !== null &&
    requiredTradeTokens > tradeCapacity
  ) {
    errors.push(
      `The selected trade and New World payments ` +
      `require ${requiredTradeTokens} Trade tokens, ` +
      `but only ${tradeCapacity} are available.`
    );
  }

  if (
    tradeCapacity === null &&
    (tradeCount > 0 || newWorldCount > 0)
  ) {
    warnings.push(
      "Current Trade-token capacity is unknown. The engine must validate shipping."
    );
  }

  return {
    rows,
    tradeCount,
    newWorldCount,
    requiredTradeTokens,
    availableTradeTokens: tradeCapacity,
    alreadyTradedGoods: [...history],
    errors,
    warnings,
    canSubmit: errors.length === 0,
  };
}
