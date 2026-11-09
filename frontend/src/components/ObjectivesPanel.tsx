
import { pretty } from "../types";
import type {
  ActiveObjectiveSnapshot,
  GameSnapshot,
} from "../types";

import {
  auditScoringSnapshot,
} from "../scoring-integrity";

type Props = {
  game: GameSnapshot;
  onClose: () => void;
};

function describeObjective(
  objective: ActiveObjectiveSnapshot
): string {
  const rule = objective.rule;

  if (rule.type === "industry") {
    const names = (rule.industries ?? [])
      .map(pretty)
      .join(", ");

    return (
      `Score ${rule.points_per_industry ?? 0} points ` +
      `per owned matching industry: ${names}.`
    );
  }

  if (rule.type === "population") {
    return (
      `Have at least ${rule.minimum ?? 0} ` +
      `${pretty(rule.population_type ?? "")} population ` +
      `to score ${rule.points ?? 0} points.`
    );
  }

  if (rule.type === "resource") {
    return (
      `Produce at least ${rule.minimum ?? 0} ` +
      `${pretty(rule.resource ?? "")} cumulatively ` +
      `to score ${rule.points ?? 0} points.`
    );
  }

  return "See objective rules in the game engine.";
}

export function ObjectivesPanel({
  game,
  onClose,
}: Props) {
  /* STEP 119 — SCORE INTEGRITY */

  const scoringAudit = auditScoringSnapshot(game);
  const playerIndex = game.current_player_index;
  const player = game.players[playerIndex];

  const preview = game.score_preview?.find(
    item => item.player_index === playerIndex
  );

  const opponents = game.players
    .map((other, index) => ({
      name: other.name,
      index,
      score: game.score_preview?.find(
        item => item.player_index === index
      ),
    }))
    .filter(item => item.index !== playerIndex);

  return (
    <div
      className="objectives-backdrop"
      onClick={onClose}
    >
      <section
        className="objectives-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="objectives-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="objectives-header">
          <div>
            <span className="construction-palette-eyebrow">
              IMPERIAL AMBITIONS
            </span>
            <h2 id="objectives-title">
              Objectives & Victory Progress
            </h2>
            <p>
              {player?.name ?? "Current Player"}
              {" · "}Round {game.round}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close objectives"
          >
            ×
          </button>
        </header>

        <div className="objectives-content">
          <section className="objectives-score-section">
            <div className="objectives-score-main">
              <small>Current score preview</small>
              <strong>
                {preview ? preview.total : "—"}
              </strong>
              <span>Victory Points</span>
            </div>

            {preview && (
              <div className="objectives-breakdown">
                {[
                  ["Population cards", preview.population_cards],
                  ["Expeditions", preview.expeditions],
                  ["Gold", preview.gold],
                  ["Fireworks", preview.fireworks],
                  ["Objectives", preview.objectives],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="objectives-score-row"
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            )}

            <p className="objectives-disclaimer">
              Live score only. Final scoring and
              tie-breaks are determined by the engine.
            </p>
          </section>
            {/* STEP 119 — SCORE DATA CONSISTENCY */}
            {!scoringAudit.valid && (
              <section
                className="objectives-score-warning"
                role="status"
              >
                <strong>Score consistency warning</strong>

                {scoringAudit.issues.map((issue, index) => (
                  <p key={index}>{issue}</p>
                ))}
              </section>
            )}
          <section className="objectives-active-section">
            <h3>Active Objectives</h3>

            {game.objectives.length === 0 ? (
              <p>No scoring objectives are active.</p>
            ) : (
              <div className="objectives-card-list">
                {game.objectives.map((objective, index) => (
                  <article
                    className="objectives-card"
                    key={objective.id}
                  >
                    <span className="objectives-card-number">
                      OBJECTIVE {index + 1}
                    </span>

                    <h4>{objective.name}</h4>

                    <p>{describeObjective(objective)}</p>

                    <div className="objectives-card-score">
                      <span>Current objective score</span>
                      <strong>
                        {objective.scores[playerIndex] ?? 0}
                        {" "}VP
                      </strong>
                    </div>

                    <small>
                      End-game scoring objective
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="objectives-standings-section">
            <h3>Current Score Comparison</h3>

            <div className="objectives-score-row">
              <span>{player?.name ?? "Current Player"}</span>
              <strong>{preview?.total ?? "—"}</strong>
            </div>

            {opponents.map(opponent => (
              <div
                key={opponent.index}
                className="objectives-score-row"
              >
                <span>{opponent.name}</span>
                <strong>
                  {opponent.score?.total ?? "—"}
                </strong>
              </div>
            ))}

            <p className="objectives-disclaimer">
              These values are not a final ranking.
              End-game tie-breaks are not applied here.
            </p>
          </section>
        </div>

        <footer className="objectives-footer">
          <span>
            Phase: {pretty(game.phase)}
          </span>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
