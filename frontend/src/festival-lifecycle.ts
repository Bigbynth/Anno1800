
/* STEP 118 — FESTIVAL & NAVAL LIFECYCLE */

import type {
  GameSnapshot,
  NavalCatalogueSnapshot,
} from "./types";

export interface TokenLifecycle {
  available: number;
  total: number | null;
  exhausted: number | null;
  afterFestival: number | null;
}

export interface FestivalLifecycleResult {
  playerName: string;

  totalIndustries: number;
  occupiedIndustries: number;

  trade: TokenLifecycle;
  exploration: TokenLifecycle;

  totalExhaustedTokens: number | null;

  ownedShipyards: number;
  ownedShips: number;

  canHoldFestival: boolean;
  unavailableReasons: string[];
}

function analyzeTokens(
  available: number,
  total: number | undefined
): TokenLifecycle {
  if (total === undefined) {
    return {
      available,
      total: null,
      exhausted: null,
      afterFestival: null,
    };
  }

  return {
    available,
    total,
    exhausted: Math.max(0, total - available),
    afterFestival: total,
  };
}

export function analyzeFestivalLifecycle(
  game: GameSnapshot,
  navalData: NavalCatalogueSnapshot | null,
  actionLoading: boolean
): FestivalLifecycleResult {
  const player =
    game.players[game.current_player_index];

  const reasons: string[] = [];

  if (game.game_over) {
    reasons.push("The game has ended.");
  }

  if (game.main_action_used) {
    reasons.push(
      "The main action has already been used."
    );
  }

  if (actionLoading) {
    reasons.push(
      "Another game operation is processing."
    );
  }

  const trade = analyzeTokens(
    navalData?.naval_capacity.trade ?? 0,
    navalData?.naval_token_totals?.trade
  );

  const exploration = analyzeTokens(
    navalData?.naval_capacity.exploration ?? 0,
    navalData?.naval_token_totals?.exploration
  );

  const totalExhaustedTokens =
    trade.exhausted !== null &&
    exploration.exhausted !== null
      ? trade.exhausted + exploration.exhausted
      : null;

  return {
    playerName: player?.name ?? "Current Player",

    totalIndustries:
      player?.industries.length ?? 0,

    occupiedIndustries:
      player?.industries.filter(
        industry => industry.occupied
      ).length ?? 0,

    trade,
    exploration,
    totalExhaustedTokens,

    ownedShipyards:
      navalData?.owned_shipyards.length ?? 0,

    ownedShips:
      navalData?.owned_ships.length ?? 0,

    canHoldFestival: reasons.length === 0,
    unavailableReasons: reasons,
  };
}
