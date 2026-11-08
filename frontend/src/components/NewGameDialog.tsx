
import { useState } from "react";

import {
  DEFAULT_GAME_SETUP,
  previewNewGame,
} from "../api";

import type {
  GameSetupSettings,
  GameSetupPreview as PreviewData,
} from "../api";

import { GameSetupPreview } from "./GameSetupPreview";

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

  const [preview, setPreview] =
    useState<PreviewData | null>(null);

  const [previewFingerprint, setPreviewFingerprint] =
    useState<string | null>(null);

  const [previewLoading, setPreviewLoading] =
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

  const configurationFingerprint = JSON.stringify({
    player_names: trimmed,
    settings,
  });

  const previewIsCurrent =
    preview?.valid === true &&
    previewFingerprint === configurationFingerprint;

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

  async function validateAndPreview() {
    if (!valid || busy || previewLoading) return;

    setPreviewLoading(true);
    setError(null);
    setConfirming(false);

    // The fingerprint identifies the exact submitted setup.
    const submittedFingerprint = configurationFingerprint;

    setPreview(null);
    setPreviewFingerprint(null);

    try {
      const result = await previewNewGame(
        trimmed,
        settings
      );

      setPreview(result);
      setPreviewFingerprint(submittedFingerprint);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to validate the game setup."
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  
  async function confirmNewGame() {
    if (
      !valid ||
      !previewIsCurrent ||
      busy ||
      previewLoading
    ) {
      return;
    }


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
            disabled={busy || previewLoading}
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
                  disabled={busy || previewLoading || names.length <= 2}
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
              disabled={busy || previewLoading || names.length >= 4}
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

        
        {/* STEP 99 — VALIDATE GAME SETUP */}
        <div className="new-game-preview-controls">
          <button
            type="button"
            disabled={!valid || busy || previewLoading}
            onClick={() => void validateAndPreview()}
          >
            {previewLoading
              ? "Validating Configuration..."
              : previewIsCurrent
                ? "Refresh Preview"
                : "Validate & Preview"}
          </button>

          {previewIsCurrent && (
            <span className="new-game-preview-ready">
              Setup successfully validated
            </span>
          )}
        </div>

        {previewIsCurrent && preview && (
          <GameSetupPreview preview={preview} />
        )}

        {preview && !previewIsCurrent && (
          <p className="new-game-validation">
            Configuration changed. Validate the setup again
            before starting the game.
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
            disabled={
              !valid ||
              !previewIsCurrent ||
              busy ||
              previewLoading
            }
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
