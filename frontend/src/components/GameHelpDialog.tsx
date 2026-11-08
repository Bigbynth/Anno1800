
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  GAME_HELP_TOPICS,
} from "../game-help";

import type {
  GameHelpTopic,
} from "../game-help";

type Props = {
  initialTopic?: GameHelpTopic;
  onClose: () => void;
};

export function GameHelpDialog({
  initialTopic = "board",
  onClose,
}: Props) {
  const [selectedTopic, setSelectedTopic] =
    useState<GameHelpTopic>(initialTopic);

  const [search, setSearch] = useState("");

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const dialogRef =
    useRef<HTMLElement>(null);

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  const filteredTopics = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return GAME_HELP_TOPICS;

    return GAME_HELP_TOPICS.filter(topic =>
      [
        topic.title,
        topic.category,
        topic.description,
        ...topic.tips,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search]);

  const selected =
    GAME_HELP_TOPICS.find(
      topic => topic.id === selectedTopic
    ) ?? GAME_HELP_TOPICS[0];

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus();

    return () => {
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLElement>
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled)'
      ) ?? []
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey &&
        document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="game-help-backdrop">
      <section
        ref={dialogRef}
        className="game-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-help-title"
        onKeyDown={handleKeyDown}
      >
        <header className="game-help-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE INDUSTRIAL HANDBOOK
            </span>

            <h2 id="game-help-title">
              Game Guide
            </h2>

            <p>
              Learn about the current digital
              implementation of Anno 1800.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close game guide"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="game-help-search">
          <label htmlFor="game-help-search-input">
            Search help topics
          </label>

          <input
            id="game-help-search-input"
            type="search"
            value={search}
            onChange={event =>
              setSearch(event.target.value)
            }
            placeholder="Search construction, trading, cards..."
          />
        </div>

        <div className="game-help-layout">
          <nav
            className="game-help-navigation"
            aria-label="Help topics"
          >
            {filteredTopics.map(topic => (
              <button
                key={topic.id}
                type="button"
                className={
                  selectedTopic === topic.id
                    ? "is-selected"
                    : ""
                }
                aria-current={
                  selectedTopic === topic.id
                    ? "true"
                    : undefined
                }
                onClick={() =>
                  setSelectedTopic(topic.id)
                }
              >
                <small>{topic.category}</small>
                <strong>{topic.title}</strong>
              </button>
            ))}

            {filteredTopics.length === 0 && (
              <p>No topics match your search.</p>
            )}
          </nav>

          <article className="game-help-article">
            <span>{selected.category}</span>

            <h3>{selected.title}</h3>

            <p>{selected.description}</p>

            <h4>How it works</h4>

            <ul>
              {selected.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>

            <p className="game-help-engine-note">
              The Python engine determines legal
              actions and their effects. This guide
              explains the interface and does not
              override game rules.
            </p>
          </article>
        </div>

        <footer className="game-help-footer">
          <span>
            Game Guide · Step 103
          </span>

          <button type="button" onClick={onClose}>
            Return to Board
          </button>
        </footer>
      </section>
    </div>
  );
}
