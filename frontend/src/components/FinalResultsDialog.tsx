
import type { GameSnapshot } from "../types";
import { pretty } from "../types";

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
  const scores = game.score_preview ?? [];

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

  const leaders =
    highestScore === null
      ? []
      : standings.filter(
          item => item.total === highestScore
        );

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

        {game.game_over && completeScores &&
          leaders.length === 1 && (
          <div className="final-results-leader">
            <span>HIGHEST REPORTED SCORE</span>
            <strong>{leaders[0].playerName}</strong>
            <p>
              {leaders[0].total} Victory Points
            </p>
          </div>
        )}

        {game.game_over && completeScores &&
          leaders.length > 1 && (
          <div className="final-results-leader">
            <span>TIED FOR HIGHEST SCORE</span>
            <strong>
              {leaders.map(
                item => item.playerName
              ).join(" · ")}
            </strong>
            <p>
              {highestScore} points each.
              No additional tie-break has been applied.
            </p>
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
                  rank === 1 && completeScores
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
