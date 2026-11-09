
import type { GameSnapshot } from "../types";
import { analyzeTurnLifecycle } from "../turn-lifecycle";

type Props = {
  game: GameSnapshot;
  actionLoading: boolean;
  onEndTurn: () => void;
};

export function TurnStatus({
  game,
  actionLoading,
  onEndTurn,
}: Props) {
  const player =
    game.players[game.current_player_index];

  const mainActionUsed = game.main_action_used;

  /* STEP 120 — TURN STATUS */

  const turn = analyzeTurnLifecycle(
    game,
    actionLoading
  );

  return (
    <section
      className="turn-status"
      aria-label="Current turn status"
    >
      <div className="turn-status-heading">
        <div>
          <span className="turn-status-overline">
            CURRENT COMPANY
          </span>

          <h3>{player?.name ?? "Unknown Player"}</h3>
        </div>

        <div className="turn-status-round">
          <small>ROUND</small>
          <strong>{game.round}</strong>
        </div>
      </div>

      <div className="turn-status-details">
        <div className="turn-status-detail">
          <span>Game phase</span>
          <strong>{turn.phaseLabel}</strong>
        </div>
        <div className="turn-status-detail">
          <span>Main action</span>
          <strong
            className={
              game.game_over
                ? "is-ended"
                : mainActionUsed
                  ? "is-used"
                  : "is-available"
            }
          >
            {game.game_over
              ? "Game finished"
              : mainActionUsed
                ? "Used"
                : "Available"}
          </strong>
        </div>
      </div>

      {/* STEP 120 — TURN LIFECYCLE */}

      <p className="turn-status-description">
        {turn.phaseExplanation}
      </p>

      {game.game_over ? (
        <p className="turn-status-finished">
          The game has ended. Open Results to view
          the official final scores and winners.
        </p>
      ) : (
        <>
          <p className="turn-status-description">
            {mainActionUsed
              ? "Main action completed. You can end your turn."
              : "Complete one main action before ending your turn."}
          </p>

          {turn.phase !== "normal" && (
            <div
              className="turn-status-endgame"
              role="status"
            >
              <strong>{turn.phaseLabel}</strong>
              <p>{turn.phaseExplanation}</p>
            </div>
          )}

          {turn.willFinishGame ? (
            <p className="turn-status-finished">
              Ending this turn will conclude
              the match and trigger final scoring.
            </p>
          ) : turn.canEndTurn ? (
            <p className="turn-status-description">
              Next company:{" "}
              {turn.nextPlayerName ?? "Unknown"}.
            </p>
          ) : null}

          <button
            type="button"
            className="turn-status-end-button"
            onClick={onEndTurn}
            disabled={!turn.canEndTurn}
          >
            {actionLoading
              ? "Action in progress..."
              : turn.willFinishGame
                ? "Finish Game"
                : "End Turn"}
          </button>
        </>
      )}
    </section>
  );
}
