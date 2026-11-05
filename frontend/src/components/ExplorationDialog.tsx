
import { useState } from "react";

type Props = {
  playerName: string;
  explorationCapacity: number | null;
  disabled: boolean;
  onExplore: () => Promise<void>;
  onClose: () => void;
};

export function ExplorationDialog({
  playerName,
  explorationCapacity,
  disabled,
  onExplore,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = disabled || submitting;

  async function confirmExploration() {
    if (busy) return;

    setSubmitting(true);
    setError(null);

    try {
      await onExplore();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Exploration failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="exploration-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="exploration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exploration-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="exploration-header">
          <div>
            <span className="construction-palette-eyebrow">
              MARITIME EXPEDITION
            </span>

            <h2 id="exploration-title">
              Explore the New World
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close exploration"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </header>

        <div
          className="exploration-chart"
          aria-hidden="true"
        >
          <div className="exploration-chart-origin">
            <span>OLD WORLD</span>
            <strong>⚓</strong>
          </div>

          <div className="exploration-chart-route">
            <span>⛵</span>
          </div>

          <div className="exploration-chart-destination">
            <span>NEW WORLD</span>
            <strong>?</strong>
          </div>
        </div>

        <div className="exploration-details">
          <div>
            <small>Current company</small>
            <strong>{playerName}</strong>
          </div>

          <div>
            <small>Exploration capacity available</small>
            <strong>
              {explorationCapacity === null
                ? "Not available"
                : explorationCapacity}
            </strong>
          </div>
        </div>

        <p className="exploration-description">
          Send an expedition to discover a New World
          island. The Python engine draws the island,
          applies its exploration cost and awards
          any associated cards.
        </p>

        <p className="exploration-note">
          The cost depends on the number of New World
          islands already explored. Capacity and other
          requirements are validated by the engine.
        </p>

        {error && (
          <p
            className="exploration-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <footer className="exploration-actions">
          <button
            type="button"
            className="exploration-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="exploration-confirm"
            onClick={() => void confirmExploration()}
            disabled={busy || explorationCapacity === 0}
          >
            {submitting
              ? "Exploring..."
              : "Explore New World"}
          </button>
        </footer>
      </section>
    </div>
  );
}
