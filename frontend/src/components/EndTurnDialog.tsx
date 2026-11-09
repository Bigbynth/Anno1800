
import { useState } from "react";

type Props = {
  playerName: string;
  round: number;
  mainActionUsed: boolean;

  // STEP 120 — ENDGAME TRANSITION
  willFinishGame: boolean;

  disabled: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function EndTurnDialog({
  playerName,
  round,
  mainActionUsed,
  willFinishGame,
  disabled,
  onConfirm,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = submitting || disabled;

  const cannotConfirm =
    busy || !mainActionUsed;

  async function confirmEndTurn() {
    if (cannotConfirm) return;

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to end the turn."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="end-turn-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="end-turn-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-turn-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="end-turn-dialog-header">
          <div>
            <span className="construction-palette-eyebrow">
              END OF COMPANY TURN
            </span>
            <h2 id="end-turn-title">
              End Your Turn?
            </h2>
          </div>

          <button
            type="button"
            className="end-turn-dialog-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close end-turn dialog"
          >
            ×
          </button>
        </header>

        <div className="end-turn-dialog-summary">
          <div>
            <small>Current company</small>
            <strong>{playerName}</strong>
          </div>

          <div>
            <small>Current round</small>
            <strong>{round}</strong>
          </div>
        </div>

        {!mainActionUsed && (
          <p className="end-turn-dialog-warning">
            You must complete a main action before
            ending your turn.
          </p>
        )}

        {willFinishGame && (
          <p
            className="end-turn-dialog-warning"
            role="status"
          >
            This is the final turn of the final round.
            Confirming will end the match and
            calculate the official results.
          </p>
        )}

        <p className="end-turn-dialog-description">
          Confirm that you want to finish this
          company's turn. The Python engine will
          advance the turn according to the game rules.
        </p>

        {error && (
          <p className="end-turn-dialog-error" role="alert">
            {error}
          </p>
        )}

        <footer className="end-turn-dialog-actions">
          <button
            type="button"
            className="end-turn-dialog-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Continue Playing
          </button>

          <button
            type="button"
            className="end-turn-dialog-confirm"
            onClick={() => void confirmEndTurn()}
            disabled={cannotConfirm}
          >
            {submitting
              ? "Processing..."
              : willFinishGame
                ? "Finish Game"
                : "Confirm End Turn"}
          </button>
        </footer>
      </section>
    </div>
  );
}
