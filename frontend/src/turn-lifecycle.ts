
/* STEP 120 — TURN & ENDGAME LIFECYCLE */

import type { GameSnapshot } from "./types";

export type EndGamePhase =
  | "normal"
  | "current_round_ending"
  | "final_round"
  | "finished";

export interface TurnLifecycleResult {
  playerName: string;
  playerIndex: number;
  playerCount: number;
  round: number;

  phase: EndGamePhase | "unknown";
  phaseLabel: string;
  phaseExplanation: string;

  mainActionUsed: boolean;
  canEndTurn: boolean;
  gameOver: boolean;

  isLastPlayerInRound: boolean;
  willAdvanceRound: boolean;
  willFinishGame: boolean;

  nextPlayerName: string | null;
  nextRound: number | null;
}

export function analyzeTurnLifecycle(
  game: GameSnapshot,
  actionLoading: boolean
): TurnLifecycleResult {
  const playerIndex = game.current_player_index;
  const playerCount = game.players.length;

  const player = game.players[playerIndex];

  const phase = game.phase as EndGamePhase;

  const knownPhases: readonly string[] = [
    "normal",
    "current_round_ending",
    "final_round",
    "finished",
  ];

  const resolvedPhase = knownPhases.includes(phase)
    ? phase
    : "unknown";

  const phaseDetails = {
    normal: {
      label: "Normal Play",
      explanation:
        "The game is in its regular turn sequence.",
    },
    current_round_ending: {
      label: "Endgame Triggered",
      explanation:
        "A player has emptied their hand. " +
        "Finish the current round before the final round begins.",
    },
    final_round: {
      label: "Final Round",
      explanation:
        "This is the final round of the game. " +
        "The match ends when every player has completed their turn.",
    },
    finished: {
      label: "Game Finished",
      explanation:
        "No further actions or turns are available.",
    },
    unknown: {
      label: "Unknown Phase",
      explanation:
        "The backend returned an unrecognized game phase.",
    },
  } as const;

  const isLastPlayerInRound =
    playerCount > 0 &&
    playerIndex === playerCount - 1;

  const canEndTurn =
    !game.game_over &&
    !actionLoading &&
    game.main_action_used;

  const willAdvanceRound =
    canEndTurn && isLastPlayerInRound;

  const willFinishGame =
    willAdvanceRound &&
    resolvedPhase === "final_round";

  const nextPlayerIndex =
    playerCount > 0
      ? (playerIndex + 1) % playerCount
      : -1;

  const nextPlayerName =
    game.game_over || nextPlayerIndex < 0
      ? null
      : game.players[nextPlayerIndex]?.name ?? null;

  const nextRound =
    game.game_over
      ? null
      : game.round + (isLastPlayerInRound ? 1 : 0);

  return {
    playerName: player?.name ?? "Unknown Player",
    playerIndex,
    playerCount,
    round: game.round,

    phase: resolvedPhase,
    phaseLabel: phaseDetails[resolvedPhase].label,
    phaseExplanation:
      phaseDetails[resolvedPhase].explanation,

    mainActionUsed: game.main_action_used,
    canEndTurn,
    gameOver: game.game_over,

    isLastPlayerInRound,
    willAdvanceRound,
    willFinishGame,

    nextPlayerName,
    nextRound,
  };
}
