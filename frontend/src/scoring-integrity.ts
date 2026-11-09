
/* STEP 119 — SCORING INTEGRITY */

import type {
  GameSnapshot,
  ScorePreviewSnapshot,
} from "./types";

export interface ScoringIntegrityResult {
  valid: boolean;
  issues: string[];
  finalResultAvailable: boolean;
}

export function calculateReportedScoreTotal(
  score: ScorePreviewSnapshot
): number {
  return (
    score.population_cards +
    score.expeditions +
    score.gold +
    score.fireworks +
    score.objectives
  );
}

export function auditScoringSnapshot(
  game: GameSnapshot
): ScoringIntegrityResult {
  const issues: string[] = [];

  const scoreRows = game.score_preview ?? [];

  for (const [playerIndex] of game.players.entries()) {
    const matching = scoreRows.filter(
      item => item.player_index === playerIndex
    );

    if (matching.length !== 1) {
      issues.push(
        `Player ${playerIndex} has ${matching.length} score preview entries; expected one.`
      );
      continue;
    }

    const score = matching[0];

    if (
      calculateReportedScoreTotal(score) !==
      score.total
    ) {
      issues.push(
        `Player ${playerIndex}: score breakdown does not match total.`
      );
    }

    const objectiveTotal = game.objectives.reduce(
      (sum, objective) =>
        sum + (objective.scores[playerIndex] ?? 0),
      0
    );

    if (objectiveTotal !== score.objectives) {
      issues.push(
        `Player ${playerIndex}: objective scores do not match the reported objective total.`
      );
    }
  }

  const final = game.final_result;

  if (game.game_over && !final) {
    issues.push(
      "The game has ended, but an authoritative final result is unavailable."
    );
  }

  if (!game.game_over && final) {
    issues.push(
      "An authoritative final result was supplied before the game ended."
    );
  }

  if (final) {
    if (final.scores.length !== game.players.length) {
      issues.push(
        "The final result contains an unexpected number of player scores."
      );
    }

    const finalIndices = new Set<number>();

    for (const score of final.scores) {
      if (
        score.player_index < 0 ||
        score.player_index >= game.players.length ||
        finalIndices.has(score.player_index)
      ) {
        issues.push(
          `Invalid or duplicate final score for player index ${score.player_index}.`
        );
      }

      finalIndices.add(score.player_index);

      if (
        calculateReportedScoreTotal(score) !==
        score.total
      ) {
        issues.push(
          `Final score breakdown does not match the total for player ${score.player_index}.`
        );
      }
    }

    if (final.winners.length === 0) {
      issues.push(
        "The authoritative final result contains no winner."
      );
    }

    const winnerSet = new Set<number>();

    for (const index of final.winners) {
      if (
        index < 0 ||
        index >= game.players.length ||
        winnerSet.has(index)
      ) {
        issues.push(
          `Invalid or duplicate final winner index: ${index}.`
        );
      }

      winnerSet.add(index);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    finalResultAvailable:
      game.game_over && Boolean(final),
  };
}
