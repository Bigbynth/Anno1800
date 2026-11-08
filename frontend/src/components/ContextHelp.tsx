
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  GAME_HELP,
} from "../game-help";

import type {
  GameHelpTopic,
} from "../game-help";

type Props = {
  topic: GameHelpTopic;
  label?: string;
  compact?: boolean;
};

export function ContextHelp({
  topic,
  label,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const buttonRef =
    useRef<HTMLButtonElement>(null);

  const contentId = useId();

  const entry = GAME_HELP[topic];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    };
  }, [open]);

  return (
    <div
      className={[
        "context-help",
        compact ? "context-help--compact" : "",
      ].join(" ")}
      ref={containerRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className="context-help-trigger"
        aria-label={`Help: ${entry.title}`}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen(value => !value)}
      >
        ?
      </button>

      {open && (
        <div
          id={contentId}
          className="context-help-popover"
          role="region"
          aria-label={`Help for ${entry.title}`}
        >
          <div className="context-help-heading">
            <span>{entry.category}</span>
            <strong>{label ?? entry.title}</strong>
          </div>

          <p>{entry.description}</p>

          <ul>
            {entry.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>

          <button
            type="button"
            className="context-help-dismiss"
            onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}
          >
            Close help
          </button>
        </div>
      )}
    </div>
  );
}
