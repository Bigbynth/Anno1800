
import { useEffect, useState } from "react";

import {
  fetchSaveSlots,
} from "../api";

import type {
  SaveSlotId,
  SaveSlotInfo,
} from "../api";

type Props = {
  onSave: (slot: SaveSlotId) => Promise<void>;
  onLoad: (slot: SaveSlotId) => Promise<void>;
  onClose: () => void;
};

const SLOTS: SaveSlotId[] = [
  "slot1",
  "slot2",
  "slot3",
];

export function SaveLoadDialog({
  onSave,
  onLoad,
  onClose,
}: Props) {
  const [slots, setSlots] =
    useState<SaveSlotInfo[]>([]);

  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [pending, setPending] = useState<{
    slot: SaveSlotId;
    operation: "save" | "load";
  } | null>(null);

  async function refreshSlots() {
    setLoadingSlots(true);

    try {
      const result = await fetchSaveSlots();
      setSlots(result.slots);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to read save slots."
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    void refreshSlots();
  }, []);

  async function confirmOperation() {
    if (!pending || busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (pending.operation === "save") {
        await onSave(pending.slot);
        setNotice("Game saved successfully.");
        setPending(null);
        await refreshSlots();
      } else {
        await onLoad(pending.slot);
        onClose();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Save operation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="save-load-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className="save-load-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-load-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="save-load-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE ADMIRALTY ARCHIVE
            </span>
            <h2 id="save-load-title">
              Save & Load Game
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close save manager"
          >
            ×
          </button>
        </header>

        {loadingSlots && (
          <p>Reading save slots...</p>
        )}

        <div className="save-load-slots">
          {SLOTS.map((slot, index) => {
            const saved = slots.find(
              item => item.slot === slot
            );

            return (
              <article
                className="save-load-slot"
                key={slot}
              >
                <div className="save-load-slot-info">
                  <strong>Save Slot {index + 1}</strong>

                  {!saved?.exists ? (
                    <small>Empty slot</small>
                  ) : !saved.valid ? (
                    <small>
                      Unreadable or incompatible save
                    </small>
                  ) : (
                    <>
                      <small>
                        {saved.metadata?.current_player}
                      </small>
                      <small>
                        Round {saved.metadata?.round}
                        {saved.metadata?.game_over
                          ? " · Game finished"
                          : ""}
                      </small>
                    </>
                  )}
                </div>

                <div className="save-load-slot-actions">
                  <button
                    type="button"
                    disabled={busy || loadingSlots}
                    onClick={() =>
                      setPending({
                        slot,
                        operation: "save",
                      })
                    }
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      loadingSlots ||
                      !saved?.valid
                    }
                    onClick={() =>
                      setPending({
                        slot,
                        operation: "load",
                      })
                    }
                  >
                    Load
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {pending && (
          <div className="save-load-confirm">
            <strong>
              {pending.operation === "save"
                ? "Confirm Save"
                : "Confirm Load"}
            </strong>

            <p>
              {pending.operation === "save"
                ? "This will overwrite the selected slot if it already contains a save."
                : "This will replace the current in-memory game with the selected save. Unsaved progress will be lost."}
            </p>

            <div className="save-load-confirm-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmOperation()}
              >
                {busy
                  ? "Working..."
                  : pending.operation === "save"
                    ? "Confirm Save"
                    : "Confirm Load"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="save-load-error" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className="save-load-success" role="status">
            {notice}
          </p>
        )}

        <footer className="save-load-footer">
          <p>
            Saves are stored locally on the Python
            server and may be incompatible after
            changes to the game engine.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Return to Board
          </button>
        </footer>
      </section>
    </div>
  );
}
