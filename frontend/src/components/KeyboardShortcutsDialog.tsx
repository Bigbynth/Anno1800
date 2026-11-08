
import { useEffect, useRef } from "react";

import {
  KEYBOARD_SHORTCUTS,
} from "../keyboard-shortcuts";

type Props = {
  context: "board" | "menu";
  onClose: () => void;
};

const MENU_SHORTCUTS = [
  { keys: "?", description: "Show keyboard help" },
  { keys: "Shift + C", description: "Continue Game" },
  { keys: "Shift + N", description: "New Game" },
  { keys: "Shift + L", description: "Load Game" },
  { keys: "Shift + S", description: "Application Settings" },
];

export function KeyboardShortcutsDialog({
  context,
  onClose,
}: Props) {
  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus();

    return () => {
      const previous = previousFocusRef.current;

      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, []);

  const shortcuts =
    context === "board"
      ? KEYBOARD_SHORTCUTS
      : MENU_SHORTCUTS;

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLElement>
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    // The close button is the dialog's only
    // interactive control; keep Tab inside it.
    if (event.key === "Tab") {
      event.preventDefault();
      closeButtonRef.current?.focus();
    }
  }

  return (
    <div
      className="keyboard-help-backdrop"
      onClick={onClose}
    >
      <section
        className="keyboard-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        onKeyDown={handleKeyDown}
        onClick={event => event.stopPropagation()}
      >
        <header className="keyboard-help-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE CAPTAIN'S REFERENCE
            </span>

            <h2 id="keyboard-help-title">
              Keyboard Shortcuts
            </h2>

            <p>
              {context === "board"
                ? "Navigate game information without executing game actions."
                : "Navigate the Main Menu using your keyboard."}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close keyboard help"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="keyboard-help-list">
          {shortcuts.map(shortcut => (
            <div
              className="keyboard-help-item"
              key={shortcut.keys}
            >
              <span>{shortcut.description}</span>
              <kbd>{shortcut.keys}</kbd>
            </div>
          ))}
        </div>

        <p className="keyboard-help-note">
          Shortcuts are disabled while typing and
          while another dialog is open. Use Tab to
          navigate buttons, Enter or Space to
          activate them, and Escape to close this help.
        </p>

        <footer className="keyboard-help-footer">
          <button
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
