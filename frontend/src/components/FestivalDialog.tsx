
import { useState } from "react";

type Props = {
  playerName: string;
  disabled: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function FestivalDialog({
  playerName,
  disabled,
  onConfirm,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = disabled || submitting;

  async function handleConfirm() {
    if (busy) return;

    setSubmitting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Festival action failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="festival-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="festival-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="festival-dialog-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="festival-dialog-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE OLD WORLD
            </span>
            <h2 id="festival-dialog-title">
              Hold a Festival
            </h2>
          </div>

          <button
            type="button"
            className="festival-dialog-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close festival dialog"
          >
            ×
          </button>
        </header>

        <div className="festival-dialog-art" aria-hidden="true">
          <span>✦</span>
          <span>⚜</span>
          <span>✦</span>
        </div>

        <p className="festival-dialog-player">
          Current company: <strong>{playerName}</strong>
        </p>

        <p className="festival-dialog-description">
          Confirm this Festival action for the current
          player. The Python game engine determines
          its effects and updates the game state.
        </p>

        <p className="festival-dialog-note">
          This action uses the current turn's main
          action, subject to backend validation.
        </p>

        {error && (
          <p className="festival-dialog-error" role="alert">
            {error}
          </p>
        )}

        <footer className="festival-dialog-actions">
          <button
            type="button"
            className="festival-dialog-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="festival-dialog-confirm"
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {submitting ? "Holding Festival..." : "Hold Festival"}
          </button>
        </footer>
      </section>
    </div>
  );
}
