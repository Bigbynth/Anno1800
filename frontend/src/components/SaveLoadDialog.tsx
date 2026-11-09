
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

/* STEP 123 — SAVE DIAGNOSTIC PRESENTATION */

function getSaveDiagnosticInfo(
  code: string | undefined
): {
  label: string;
  guidance: string;
} {
  switch (code) {
    case "unsupported_version":
      return {
        label: "Incompatible Version",
        guidance:
          "This checkpoint uses a different save format. " +
          "Preserve it and use a compatible game version " +
          "or a future migration tool.",
      };

    case "incompatible_code":
      return {
        label: "Engine Incompatible",
        guidance:
          "The save was authenticated but cannot be " +
          "deserialized by this engine. Keep the original " +
          "file and try the version that created it.",
      };

    case "authentication_failed":
      return {
        label: "Authentication Failed",
        guidance:
          "The save cannot be authenticated. Check that " +
          "the original save and its matching signing key " +
          "are still available. Do not edit the save file.",
      };

    case "unknown_format":
      return {
        label: "Unknown Format",
        guidance:
          "This file is not recognized as an Anno 1800 " +
          "checkpoint. Preserve it before attempting recovery.",
      };

    case "incomplete":
      return {
        label: "Incomplete Save",
        guidance:
          "This save appears truncated. Check for an " +
          "earlier backup or an intact copy.",
      };

    case "too_large":
      return {
        label: "Oversized Save",
        guidance:
          "The file exceeds the permitted checkpoint size. " +
          "Do not bypass the limit without investigating it.",
      };

    case "read_error":
      return {
        label: "Read Error",
        guidance:
          "The server could not read the save. Check " +
          "filesystem permissions and disk availability.",
      };

    case "signing_key_error":
      return {
        label: "Signing Key Error",
        guidance:
          "The server's signing key is invalid. Restore " +
          "the matching key from a trusted backup.",
      };

    default:
      return {
        label: "Unreadable Save",
        guidance:
          "This checkpoint cannot be loaded. Preserve " +
          "the original file and check the server logs " +
          "before attempting recovery.",
      };
  }
}

export function SaveLoadDialog({
  onSave,
  onLoad,
  onClose,
}: Props) {
  const [slots, setSlots] =
    useState<SaveSlotInfo[]>([]);

  /* STEP 123 — SUPPORTED SAVE FORMAT */
  const [supportedSaveVersion, setSupportedSaveVersion] =
    useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(true);
  /* STEP 122 — SAVE SLOT AVAILABILITY */
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [pending, setPending] = useState<{
    slot: SaveSlotId;
    operation: "save" | "load";
  } | null>(null);

  async function refreshSlots() {
    setLoadingSlots(true);
    setSlotsLoaded(false);
    setError(null);

    // Do not display potentially stale save information.
    setSlots([]);

    try {
      const result = await fetchSaveSlots();

      setSlots(result.slots);
      setSupportedSaveVersion(
        result.save_format_version
      );
      setSlotsLoaded(true);
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
            {supportedSaveVersion !== null && (
              <small className="save-load-version">
                Supported save format: v{supportedSaveVersion}
              </small>
            )}
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

            /* STEP 123 — SLOT RECOVERY INFORMATION */

            const diagnosticInfo = saved?.exists && !saved.valid
              ? getSaveDiagnosticInfo(
                  saved.diagnostic?.code
                )
              : null;

            return (
              <article
                className="save-load-slot"
                key={slot}
              >
                <div className="save-load-slot-info">
                  <strong>Save Slot {index + 1}</strong>

                  {/* STEP 123 — SAVE SLOT DIAGNOSTICS */}

                  {!saved?.exists ? (
                    <small>Empty slot</small>
                  ) : !saved.valid ? (
                    <div className="save-load-diagnostic">
                      <strong>
                        {diagnosticInfo?.label ??
                          "Unreadable Save"}
                      </strong>

                      {saved.format_version !== null && (
                        <small>
                          Checkpoint format: v{saved.format_version}
                        </small>
                      )}

                      {saved.diagnostic?.message && (
                        <small>
                          {saved.diagnostic.message}
                        </small>
                      )}

                      {diagnosticInfo && (
                        <p>{diagnosticInfo.guidance}</p>
                      )}
                    </div>
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

                      <small className="save-load-compatible">
                        Compatible · Format v
                        {saved.format_version}
                      </small>
                    </>
                  )}
                </div>

                <div className="save-load-slot-actions">
                  <button
                    type="button"
                    disabled={
                        busy ||
                        loadingSlots ||
                        !slotsLoaded
                      }
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
                      !slotsLoaded ||
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
          <p className="save-load-recovery-note">
            Recovery notice: If a saved game becomes
            incompatible or damaged, preserve its file
            before updating the engine or restoring a
            backup. The Save Manager does not perform
            automatic repair or migration.
          </p>
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
