
import { useState } from "react";

type Props = {
  currentPlayerNames: string[];
  onCreate: (names: string[]) => Promise<void>;
  onClose: () => void;
};

export function NewGameDialog({
  currentPlayerNames,
  onCreate,
  onClose,
}: Props) {
  const [names, setNames] = useState<string[]>([
    currentPlayerNames[0] || "Company A",
    currentPlayerNames[1] || "Company B",
  ]);

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = names.map(name => name.trim());

  const duplicateNames =
    new Set(trimmed.map(name => name.toLowerCase())).size
    !== trimmed.length;

  const valid =
    names.length >= 2 &&
    names.length <= 4 &&
    trimmed.every(
      name => name.length > 0 && name.length <= 40
    ) &&
    !duplicateNames;

  function updateName(index: number, value: string) {
    setNames(previous =>
      previous.map((name, i) =>
        i === index ? value : name
      )
    );
    setConfirming(false);
  }

  function addPlayer() {
    if (names.length >= 4) return;

    setNames(previous => [
      ...previous,
      `Company ${previous.length + 1}`,
    ]);

    setConfirming(false);
  }

  function removePlayer(index: number) {
    if (names.length <= 2) return;

    setNames(previous =>
      previous.filter((_, i) => i !== index)
    );

    setConfirming(false);
  }

  async function confirmNewGame() {
    if (!valid || busy) return;

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await onCreate(trimmed);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create a new game."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="new-game-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="new-game-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-game-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="new-game-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE COMPANY REGISTRY
            </span>

            <h2 id="new-game-title">
              Establish a New Game
            </h2>

            <p>
              Configure the participating companies
              before establishing a new match.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close New Game dialog"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </header>

        <div className="new-game-player-list">
          {names.map((name, index) => (
            <div
              className="new-game-player"
              key={index}
            >
              <span className="new-game-player-number">
                {index + 1}
              </span>

              <label>
                <span>Company {index + 1}</span>

                <input
                  type="text"
                  value={name}
                  maxLength={40}
                  disabled={busy}
                  onChange={event =>
                    updateName(index, event.target.value)
                  }
                  placeholder="Company name"
                />
              </label>

              <button
                type="button"
                aria-label={`Remove Company ${index + 1}`}
                onClick={() => removePlayer(index)}
                disabled={busy || names.length <= 2}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="new-game-player-controls">
          <span>
            {names.length} / 4 companies
          </span>

          <button
            type="button"
            onClick={addPlayer}
            disabled={busy || names.length >= 4}
          >
            + Add Company
          </button>
        </div>

        {!valid && (
          <p className="new-game-validation" role="status">
            Enter 2–4 unique company names, each
            between 1 and 40 characters.
          </p>
        )}

        {confirming && (
          <div className="new-game-confirmation">
            <strong>Replace the current match?</strong>

            <p>
              The active game and its action history
              will be replaced. Unsaved progress will
              be lost. Existing save slots will remain.
            </p>
          </div>
        )}

        {error && (
          <p className="new-game-error" role="alert">
            {error}
          </p>
        )}

        <footer className="new-game-footer">
          <button
            type="button"
            className="new-game-cancel"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="new-game-confirm"
            disabled={!valid || busy}
            onClick={() => void confirmNewGame()}
          >
            {busy
              ? "Creating Game..."
              : confirming
                ? "Confirm New Game"
                : "Start New Game"}
          </button>
        </footer>
      </section>
    </div>
  );
}
