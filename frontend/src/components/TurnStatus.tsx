
import type { GameSnapshot } from "../types";
import { pretty } from "../types";

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
          <strong>{pretty(game.phase)}</strong>
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

      {game.game_over ? (
        <p className="turn-status-finished">
          The game has ended. No more turns can
          be taken.
        </p>
      ) : (
        <>
          <p className="turn-status-description">
            {mainActionUsed
              ? "Your main action has been used. You can end your turn."
              : "Your main action is available. You may take an action or end your turn."}
          </p>

          <button
            type="button"
            className="turn-status-end-button"
            onClick={onEndTurn}
            disabled={actionLoading}
          >
            {actionLoading
              ? "Action in progress..."
              : "End Turn"}
          </button>
        </>
      )}
    </section>
  );
}
