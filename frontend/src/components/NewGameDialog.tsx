
import { useState } from "react";

import {
  DEFAULT_GAME_SETUP,
} from "../api";

import type {
  GameSetupSettings,
} from "../api";

type Props = {
  currentPlayerNames: string[];

  onCreate: (
    names: string[],
    settings: GameSetupSettings
  ) => Promise<void>;

  onClose: () => void;
};

const SETTINGS: {
  key: keyof GameSetupSettings;
  title: string;
  description: string;
}[] = [
  {
    key: "use_custom_population",
    title: "Custom Population Cards",
    description:
      "Enable the engine's custom population card content.",
  },
  {
    key: "use_custom_new_world",
    title: "Custom New World",
    description:
      "Enable the engine's custom New World content.",
  },
  {
    key: "use_custom_expeditions",
    title: "Custom Expeditions",
    description:
      "Enable the engine's custom expedition content.",
  },
  {
    key: "use_custom_objectives",
    title: "Custom Objectives",
    description:
      "Enable the engine's custom objective content.",
  },
];

export function NewGameDialog({
  currentPlayerNames,
  onCreate,
  onClose,
}: Props) {
  const [names, setNames] = useState<string[]>([
    currentPlayerNames[0] || "Company A",
    currentPlayerNames[1] || "Company B",
  ]);

  const [settings, setSettings] =
    useState<GameSetupSettings>({
      ...DEFAULT_GAME_SETUP,
    });

  const [confirming, setConfirming] =
    useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const trimmed = names.map(name => name.trim());

  const duplicateNames =
    new Set(
      trimmed.map(name => name.toLocaleLowerCase())
    ).size !== trimmed.length;

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
    setError(null);
  }

  function addPlayer() {
    if (names.length >= 4 || busy) return;

    setNames(previous => [
      ...previous,
      `Company ${previous.length + 1}`,
    ]);

    setConfirming(false);
  }

  function removePlayer(index: number) {
    if (names.length <= 2 || busy) return;

    setNames(previous =>
      previous.filter((_, i) => i !== index)
    );

    setConfirming(false);
  }

  function updateSetting(
    key: keyof GameSetupSettings,
    enabled: boolean
  ) {
    if (busy) return;

    setSettings(previous => ({
      ...previous,
      [key]: enabled,
    }));

    // Configuration changed: reconfirm before creation.
    setConfirming(false);
    setError(null);
  }

  function restoreDefaults() {
    if (busy) return;

    setSettings({ ...DEFAULT_GAME_SETUP });
    setConfirming(false);
    setError(null);
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
      await onCreate(trimmed, settings);
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
              Configure companies and game content
              before starting the match.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close New Game dialog"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* STEP 97 — COMPANY CONFIGURATION */}
        <section className="new-game-setup-section">
          <h3>Participating Companies</h3>

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
                  />
                </label>

                <button
                  type="button"
                  aria-label={`Remove Company ${index + 1}`}
                  disabled={busy || names.length <= 2}
                  onClick={() => removePlayer(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="new-game-player-controls">
            <span>{names.length} / 4 companies</span>

            <button
              type="button"
              disabled={busy || names.length >= 4}
              onClick={addPlayer}
            >
              + Add Company
            </button>
          </div>
        </section>

        {/* STEP 98 — GAME CONTENT CONFIGURATION */}
        <section className="new-game-setup-section">
          <div className="new-game-settings-heading">
            <div>
              <h3>Game Content</h3>
              <p>
                Choose which custom engine content
                to include in the new match.
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={restoreDefaults}
            >
              Restore Defaults
            </button>
          </div>

          <div className="new-game-settings-list">
            {SETTINGS.map(option => (
              <label
                key={option.key}
                className="new-game-setting"
              >
                <div className="new-game-setting-info">
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </div>

                <input
                  type="checkbox"
                  checked={settings[option.key]}
                  disabled={busy}
                  onChange={event =>
                    updateSetting(
                      option.key,
                      event.target.checked
                    )
                  }
                />
              </label>
            ))}
          </div>
        </section>

        {!valid && (
          <p
            className="new-game-validation"
            role="status"
          >
            Enter 2–4 unique company names,
            each between 1 and 40 characters.
          </p>
        )}

        {confirming && (
          <div className="new-game-confirmation">
            <strong>Replace the current match?</strong>

            <p>
              This starts a new game with your selected
              configuration. The active match and its
              action history will be replaced.
              Unsaved progress will be lost.
              Existing save slots remain available.
            </p>
          </div>
        )}

        {error && (
          <p
            className="new-game-error"
            role="alert"
          >
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
