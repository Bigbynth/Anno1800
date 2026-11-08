
import { useEffect, useState } from "react";

import {
  fetchSaveSlots,
} from "../api";

import type {
  GameSetupSettings,
  SaveSlotId,
  SaveSlotInfo,
} from "../api";

import type { GameSnapshot } from "../types";

import { NewGameDialog } from "./NewGameDialog";

type Props = {
  game: GameSnapshot | null;
  onContinue: () => void;
  onCreateNewGame: (
    names: string[],
    settings: GameSetupSettings
  ) => Promise<void>;
  onLoadGame: (slot: SaveSlotId) => Promise<void>;
};

const SAVE_SLOTS: SaveSlotId[] = [
  "slot1",
  "slot2",
  "slot3",
];

export function StartScreen({
  game,
  onContinue,
  onCreateNewGame,
  onLoadGame,
}: Props) {
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedSlot, setSelectedSlot] =
    useState<SaveSlotId | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadOpen) return;

    let cancelled = false;

    async function readSlots() {
      setLoadingSlots(true);
      setError(null);

      try {
        const result = await fetchSaveSlots();

        if (!cancelled) {
          setSlots(result.slots);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load saved games."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    void readSlots();

    return () => {
      cancelled = true;
    };
  }, [loadOpen]);

  function openLoadGame() {
    setError(null);
    setSelectedSlot(null);
    setLoadOpen(true);
  }

  async function createGame(
    names: string[],
    settings: GameSetupSettings
  ) {
    await onCreateNewGame(names, settings);

    // On success, the App switches to the game board.
    // On failure, NewGameDialog retains the error.
    onContinue();
  }

  async function confirmLoadGame() {
    if (!selectedSlot || busy) return;

    setBusy(true);
    setError(null);

    try {
      await onLoadGame(selectedSlot);

      // Close the menu only after successful restoration.
      onContinue();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to restore the saved game."
      );
    } finally {
      setBusy(false);
    }
  }

  const player = game?.players[
    game.current_player_index
  ];

  return (
    <div className="start-screen">
      <div className="start-screen-atmosphere" />

      <main className="start-screen-content">
        <header className="start-screen-brand">
          <span className="start-screen-eyebrow">
            THE INDUSTRIAL AGE AWAITS
          </span>

          <h1>ANNO 1800</h1>

          <p>THE BOARD GAME · DIGITAL EDITION</p>
        </header>

        <section
          className="start-screen-menu"
          aria-label="Main game menu"
        >
          <button
            type="button"
            className="start-screen-primary"
            disabled={!game || busy}
            onClick={onContinue}
          >
            <span className="start-screen-menu-symbol">
              ▶
            </span>
            <span>
              <strong>Continue Game</strong>
              <small>
                Return to the current match
              </small>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setNewGameOpen(true);
            }}
          >
            <span className="start-screen-menu-symbol">
              +
            </span>
            <span>
              <strong>New Game</strong>
              <small>
                Configure a new company match
              </small>
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={openLoadGame}
          >
            <span className="start-screen-menu-symbol">
              ▣
            </span>
            <span>
              <strong>Load Game</strong>
              <small>
                Restore a previously saved match
              </small>
            </span>
          </button>
        </section>

        {game && (
          <div className="start-screen-current-session">
            <span>CURRENT SESSION</span>
            <strong>
              {player?.name ?? "Unknown Company"}
            </strong>
            <small>
              Round {game.round}
              {" · "}
              {game.players.length} companies
              {game.game_over
                ? " · Game complete"
                : ""}
            </small>
          </div>
        )}

        {error && !loadOpen && (
          <p className="start-screen-error" role="alert">
            {error}
          </p>
        )}

        <footer className="start-screen-footer">
          Local game session · Anno 1800 Board Game
        </footer>
      </main>

      {loadOpen && (
        <div
          className="start-screen-load-backdrop"
          onClick={() => {
            if (!busy) setLoadOpen(false);
          }}
        >
          <section
            className="start-screen-load-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-load-title"
            onClick={event => event.stopPropagation()}
          >
            <header className="start-screen-load-heading">
              <div>
                <span>THE ADMIRALTY ARCHIVE</span>
                <h2 id="start-load-title">
                  Load Game
                </h2>
              </div>

              <button
                type="button"
                disabled={busy}
                aria-label="Close load dialog"
                onClick={() => setLoadOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="start-screen-save-list">
              {SAVE_SLOTS.map((slot, index) => {
                const info = slots.find(
                  item => item.slot === slot
                );

                const available =
                  info?.exists === true &&
                  info.valid === true;

                return (
                  <button
                    key={slot}
                    type="button"
                    className={[
                      "start-screen-save-slot",
                      selectedSlot === slot
                        ? "is-selected"
                        : "",
                    ].join(" ")}
                    disabled={
                      loadingSlots ||
                      busy ||
                      !available
                    }
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <strong>Slot {index + 1}</strong>

                    {available ? (
                      <span>
                        {info.metadata?.current_player}
                        {" · "}
                        Round {info.metadata?.round}
                        {info.metadata?.game_over
                          ? " · Finished"
                          : ""}
                      </span>
                    ) : (
                      <span>
                        {info?.exists
                          ? "Unreadable save"
                          : "Empty slot"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedSlot && (
              <p className="start-screen-load-warning">
                Loading this slot replaces the current
                active game. Unsaved progress will be lost.
              </p>
            )}

            {error && (
              <p
                className="start-screen-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <footer className="start-screen-load-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setLoadOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  !selectedSlot ||
                  busy ||
                  loadingSlots
                }
                onClick={() => void confirmLoadGame()}
              >
                {busy
                  ? "Restoring..."
                  : "Confirm Load Game"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {newGameOpen && (
        <NewGameDialog
          currentPlayerNames={
            game?.players.map(player => player.name) ?? []
          }
          onCreate={createGame}
          onClose={() => setNewGameOpen(false)}
        />
      )}
    </div>
  );
}
