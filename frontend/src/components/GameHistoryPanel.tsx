
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchGameHistory,
} from "../api";

import type {
  GameHistoryEvent,
  GameHistoryResponse,
} from "../api";

type Props = {
  onClose: () => void;
};

const ACTION_LABELS: Record<string, string> = {
  festival: "Festival",
  exploration: "New World Exploration",
  production: "Production",
  industry_construction: "Industry Construction",
  demolition: "Demolition",
  naval_construction: "Naval Construction",
  population_fulfillment: "Population Card Fulfillment",
  end_turn: "Turn Ended",
};

const ACTION_SYMBOLS: Record<string, string> = {
  festival: "✦",
  exploration: "◈",
  production: "⚙",
  industry_construction: "⚒",
  demolition: "✕",
  naval_construction: "⚓",
  population_fulfillment: "♜",
  end_turn: "→",
};

export function GameHistoryPanel({
  onClose,
}: Props) {
  const [history, setHistory] =
    useState<GameHistoryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerFilter, setPlayerFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchGameHistory();
      setHistory(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load action history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const events = useMemo(
    () => history?.events ?? [],
    [history]
  );

  const players = useMemo(
    () => Array.from(
      new Map(
        events.map(event => [
          event.player_index,
          {
            index: event.player_index,
            name: event.player_name,
          },
        ])
      ).values()
    ),
    [events]
  );

  const actionTypes = useMemo(
    () => Array.from(
      new Set(events.map(event => event.action_type))
    ),
    [events]
  );

  const filteredEvents = useMemo(
    () => events.filter(event => {
      const matchesPlayer =
        playerFilter === "all" ||
        String(event.player_index) === playerFilter;

      const matchesAction =
        actionFilter === "all" ||
        event.action_type === actionFilter;

      return matchesPlayer && matchesAction;
    }),
    [events, playerFilter, actionFilter]
  );

  function labelFor(event: GameHistoryEvent) {
    return ACTION_LABELS[event.action_type] ??
      event.action_type.replace(/_/g, " ");
  }

  return (
    <div
      className="game-history-backdrop"
      onClick={onClose}
    >
      <section
        className="game-history-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-history-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="game-history-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE CAPTAIN'S JOURNAL
            </span>

            <h2 id="game-history-title">
              Game History
            </h2>

            <p>
              A record of completed actions from
              the current game session.
            </p>
          </div>

          <button
            type="button"
            className="game-history-close"
            onClick={onClose}
            aria-label="Close game history"
          >
            ×
          </button>
        </header>

        <div className="game-history-overview">
          <div>
            <small>Recorded actions</small>
            <strong>
              {history?.total_recorded ?? "—"}
            </strong>
          </div>

          <div>
            <small>Available journal entries</small>
            <strong>
              {history?.retained ?? "—"}
            </strong>
          </div>

          <div>
            <small>Matching entries</small>
            <strong>
              {filteredEvents.length}
            </strong>
          </div>
        </div>

        <div className="game-history-controls">
          <label>
            <span>Company</span>

            <select
              value={playerFilter}
              onChange={event =>
                setPlayerFilter(event.target.value)
              }
            >
              <option value="all">
                All companies
              </option>

              {players.map(player => (
                <option
                  key={player.index}
                  value={String(player.index)}
                >
                  {player.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Action</span>

            <select
              value={actionFilter}
              onChange={event =>
                setActionFilter(event.target.value)
              }
            >
              <option value="all">
                All actions
              </option>

              {actionTypes.map(type => (
                <option key={type} value={type}>
                  {ACTION_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="game-history-refresh"
            disabled={loading}
            onClick={() => void refreshHistory()}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div
          className="game-history-events"
          aria-live="polite"
          aria-busy={loading}
        >
          {error && (
            <p
              className="game-history-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {!error && loading && !history && (
            <p className="game-history-empty">
              Loading action history...
            </p>
          )}

          {!error &&
            !loading &&
            filteredEvents.length === 0 && (
            <div className="game-history-empty">
              <strong>No matching actions</strong>
              <p>
                Completed game actions will appear
                here after the engine accepts them.
              </p>
            </div>
          )}

          {filteredEvents.map(event => (
            <article
              key={event.id}
              className="game-history-event"
            >
              <div className="game-history-event-symbol">
                {ACTION_SYMBOLS[event.action_type] ?? "•"}
              </div>

              <div className="game-history-event-content">
                <div className="game-history-event-heading">
                  <strong>{labelFor(event)}</strong>

                  <span>
                    Round {event.round}
                    {" · "}
                    #{event.id}
                  </span>
                </div>

                <small>{event.player_name}</small>

                <p>{event.message}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className="game-history-footer">
          <p>
            Only completed backend actions are logged.
            The journal keeps the latest 500 entries
            and is cleared when the server restarts.
          </p>

          <button
            type="button"
            onClick={onClose}
          >
            Return to Board
          </button>
        </footer>
      </section>
    </div>
  );
}
