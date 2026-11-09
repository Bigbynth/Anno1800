
import type { GameSnapshot } from "../types";
import { pretty } from "../types";

import {
  auditScoringSnapshot,
} from "../scoring-integrity";

type Props = {
  game: GameSnapshot;
  onClose: () => void;
};

type Standing = {
  playerIndex: number;
  playerName: string;
  total: number | null;
  populationCards: number;
  expeditions: number;
  gold: number;
  fireworks: number;
  objectives: number;
};

export function FinalResultsDialog({
  game,
  onClose,
}: Props) {
    /* STEP 119 — USE FINAL SCORES AFTER GAME OVER */

  const scores =
    game.game_over && game.final_result
      ? game.final_result.scores
      : game.score_preview ?? [];

  const scoringAudit = auditScoringSnapshot(game);

  const authoritativeWinners =
    game.game_over
      ? game.final_result?.winners ?? []
      : [];

  const standings: Standing[] = game.players.map(
    (player, index) => {
      const score = scores.find(
        item => item.player_index === index
      );

      return {
        playerIndex: index,
        playerName: player.name,
        total: score?.total ?? null,
        populationCards: score?.population_cards ?? 0,
        expeditions: score?.expeditions ?? 0,
        gold: score?.gold ?? 0,
        fireworks: score?.fireworks ?? 0,
        objectives: score?.objectives ?? 0,
      };
    }
  );

  const completeScores = standings.every(
    item => item.total !== null
  );

  const sortedStandings = [...standings].sort(
    (a, b) => {
      if (a.total === null) return 1;
      if (b.total === null) return -1;
      return b.total - a.total;
    }
  );

  const highestScore = completeScores
    ? Math.max(...standings.map(
        item => item.total ?? 0
      ))
    : null;

  function getRank(item: Standing): number | null {
    if (item.total === null) return null;

    return 1 + standings.filter(
      other =>
        other.total !== null &&
        other.total > item.total!
    ).length;
  }

  return (
    <div
      className="final-results-backdrop"
      onClick={onClose}
    >
      <section
        className="final-results-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="final-results-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="final-results-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE FINAL LEDGER
            </span>

            <h2 id="final-results-title">
              {game.game_over
                ? "The Industrial Age Concludes"
                : "Current Standings"}
            </h2>

            <p>
              Round {game.round}
              {" · "}
              {pretty(game.phase)}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close results"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {/* STEP 119 — ENGINE-AUTHORITATIVE WINNERS */}
        {game.game_over &&
          game.final_result &&
          scoringAudit.valid && (
            <div className="final-results-leader">
              <span>
                {authoritativeWinners.length === 1
                  ? "OFFICIAL WINNER"
                  : "OFFICIAL SHARED WINNERS"}
              </span>

              <strong>
                {authoritativeWinners
                  .map(index => game.players[index]?.name)
                  .filter(
                    (name): name is string =>
                      name !== undefined
                  )
                  .join(" · ")}
              </strong>

              <p>
                Winner determination includes the
                engine's construction-count and
                remaining-hand tie-break rules.
              </p>
            </div>
          )}
          {/* STEP 119 — SCORING DATA DIAGNOSTICS */}
          {!scoringAudit.valid && (
            <div
              className="final-results-warning"
              role="alert"
            >
              <strong>Scoring data needs attention</strong>

              {scoringAudit.issues.map(
                (issue, index) => (
                  <p key={index}>{issue}</p>
                )
              )}
            </div>
          )}
        {!completeScores && (
          <p
            className="final-results-warning"
            role="status"
          >
            Some player scores are unavailable.
            Full standings cannot yet be determined.
          </p>
        )}

        <div className="final-results-standings">
          {sortedStandings.map(item => {
            const rank = getRank(item);

            return (
              <article
                key={item.playerIndex}
                className={[
                  "final-results-player",
                  game.game_over && game.final_result
                    ? authoritativeWinners.includes(item.playerIndex)
                      ? "is-leading"
                      : ""
                    : rank === 1 && completeScores
                      ? "is-leading"
                      : "",
                ].join(" ")}
              >
                <div className="final-results-player-heading">
                  <span className="final-results-rank">
                    {rank === null ? "—" : `#${rank}`}
                  </span>

                  <div>
                    <strong>{item.playerName}</strong>
                    <small>
                      {item.playerIndex ===
                      game.current_player_index
                        ? "Current player"
                        : "Company"}
                    </small>
                  </div>

                  <div className="final-results-total">
                    <strong>
                      {item.total ?? "—"}
                    </strong>
                    <small>VP</small>
                  </div>
                </div>

                <div className="final-results-breakdown">
                  {[
                    ["Population cards", item.populationCards],
                    ["Expeditions", item.expeditions],
                    ["Gold", item.gold],
                    ["Fireworks", item.fireworks],
                    ["Objectives", item.objectives],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="final-results-breakdown-row"
                    >
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <footer className="final-results-footer">
          <p>
            Scores are supplied by the Python scoring
            engine. Equal totals remain tied unless
            the engine provides a tie-break result.
          </p>

          <button type="button" onClick={onClose}>
            Return to Board
          </button>
        </footer>
      </section>
    </div>
  );
}
