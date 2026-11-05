
import { useEffect, useState } from "react";
import { IslandCanvas } from "./IslandCanvas";

import { PopulationHand } from "./PopulationHand";
import { TradeHarbor } from "./TradeHarbor";

import type { ComponentProps } from "react";
import type { GameSnapshot } from "../types";

type IslandSpaces =
  ComponentProps<typeof IslandCanvas>["spaces"];

type HandCards =
  ComponentProps<typeof PopulationHand>["cards"];

type FulfillHandler =
  ComponentProps<typeof PopulationHand>["onFulfill"];

type Props = {
  game: GameSnapshot | null;
  islandSpaces: IslandSpaces;
  handCards: HandCards;

  selectedLocation: string | null;
  actionLoading: boolean;
  notice: string;

  onSelectLocation: (id: string) => void;
  onEndTurn: () => void;
  onOpenWorkshop: () => void;
  onFulfillPopulationCard: FulfillHandler;
};

type DockAction = {
  id: string;
  label: string;
  symbol: string;
  description: string;
};

const dockActions: DockAction[] = [
  {
    id: "build",
    label: "Build",
    symbol: "⚒",
    description: "Construct industries",
  },
  {
    id: "produce",
    label: "Produce",
    symbol: "⚙",
    description: "Use your factories",
  },
  {
    id: "trade",
    label: "Trade",
    symbol: "⚓",
    description: "Open trading harbor",
  },
  {
    id: "explore",
    label: "Explore",
    symbol: "🧭",
    description: "Explore the New World",
  },
  {
    id: "cards",
    label: "Cards",
    symbol: "▤",
    description: "View your hand",
  },
];

export function ImmersiveGameTable({
  game,
  islandSpaces,
  handCards,
  selectedLocation,
  actionLoading,
  notice,
  onSelectLocation,
  onEndTurn,
  onOpenWorkshop,
  onFulfillPopulationCard,
}: Props) {
  const [objectivesOpen, setObjectivesOpen] =
    useState(true);

  const [inspectorOpen, setInspectorOpen] =
    useState(true);

  const [handOpen, setHandOpen] =
    useState(false);

  const [harborOpen, setHarborOpen] =
    useState(false);

  const [activeAction, setActiveAction] =
    useState<string | null>(null);

  const selectedSpace = islandSpaces.find(
    space => space.id === selectedLocation
  );

  const activePlayer = game
    ? game.players[game.current_player_index]
    : null;

  const occupiedSpaces = islandSpaces.filter(
    space => space.occupied
  ).length;

  useEffect(() => {
    if (!game) return;

    setActiveAction(null);
    setHarborOpen(false);
  }, [game?.current_player_index]);

  function selectDockAction(id: string) {
    setActiveAction(id);

    if (id === "trade") {
      setHarborOpen(true);
      return;
    }

    if (id === "cards") {
      setHandOpen(true);
      return;
    }

    // Transitional route. Future steps will replace
    // these with direct board interactions.
    onOpenWorkshop();
  }

  if (!game) {
    return (
      <div className="immersive-loading">
        <h1>ANNO 1800</h1>
        <p>Preparing the game table...</p>
      </div>
    );
  }

  return (
    <main className="immersive-shell">
      {/* TOP STATUS BAR */}
      <header className="immersive-topbar">
        <div className="immersive-brand">
          <strong>ANNO 1800</strong>
          <small>THE BOARD GAME</small>
        </div>

        <div className="immersive-turn-info">
          <span className="immersive-top-label">
            ACTIVE PLAYER
          </span>

          <strong>
            {activePlayer?.name ?? "Unknown"}
          </strong>
        </div>

        <div className="immersive-round">
          <span className="immersive-top-label">
            ROUND
          </span>

          <strong>{game.round}</strong>
        </div>

        <div className="immersive-top-actions">
          <span
            className={
              game.main_action_used
                ? "immersive-action-state is-used"
                : "immersive-action-state"
            }
          >
            {game.main_action_used
              ? "Main action used"
              : "Main action available"}
          </span>

          <button
            type="button"
            className="immersive-workshop-button"
            onClick={onOpenWorkshop}
          >
            Workshop
          </button>
        </div>
      </header>

      {/* CENTRAL PLAY AREA */}
      <div className="immersive-play-area">
        {/* OBJECTIVES / PROGRESS RAIL */}
        <aside
          className={[
            "immersive-objectives",
            objectivesOpen ? "" : "is-collapsed",
          ].join(" ")}
          aria-label="Game information"
        >
          <button
            type="button"
            className="immersive-rail-toggle"
            onClick={() =>
              setObjectivesOpen(value => !value)
            }
            aria-expanded={objectivesOpen}
            aria-label={
              objectivesOpen
                ? "Collapse game information"
                : "Expand game information"
            }
          >
            {objectivesOpen ? "◀" : "▶"}
          </button>

          {objectivesOpen && (
            <div className="immersive-rail-content">
              <span className="immersive-overline">
                YOUR EMPIRE
              </span>

              <h3>{activePlayer?.name}</h3>

              <div className="immersive-stat">
                <small>Occupied spaces</small>
                <strong>
                  {occupiedSpaces}/{islandSpaces.length}
                </strong>
              </div>

              <div className="immersive-stat">
                <small>Cards in hand</small>
                <strong>{handCards.length}</strong>
              </div>

              <div className="immersive-stat">
                <small>Available spaces</small>
                <strong>
                  {islandSpaces.length - occupiedSpaces}
                </strong>
              </div>

              <p className="immersive-rail-note">
                Select an island space to inspect it.
                Objectives will be connected to the
                engine's objective state in a later step.
              </p>
            </div>
          )}
        </aside>

        {/* ISLAND VIEWPORT */}
        <section
          className="immersive-island-stage"
          aria-label="Interactive island"
        >
          <div className="immersive-stage-heading">
            <div>
              <span className="immersive-overline">
                YOUR ISLAND
              </span>

              <h2>Industrial Island</h2>
            </div>

            <span className="immersive-stage-hint">
              Select a space to inspect
            </span>
          </div>

          

            <div className="immersive-island-surface">
            <IslandCanvas
                spaces={islandSpaces}
                selectedSpaceId={selectedLocation}
                onSelectSpace={onSelectLocation}
            />
            </div>

          <div className="immersive-island-footer">
            <span>
              {islandSpaces.length} board spaces
            </span>

            <span>
              {selectedLocation
                ? `Selected: ${selectedLocation}`
                : "No selection"}
            </span>
          </div>
        </section>

        {/* CONTEXT INSPECTOR */}
        <aside
          className={[
            "immersive-inspector",
            inspectorOpen ? "" : "is-collapsed",
          ].join(" ")}
          aria-label="Context inspector"
        >
          <button
            type="button"
            className="immersive-rail-toggle"
            onClick={() =>
              setInspectorOpen(value => !value)
            }
            aria-expanded={inspectorOpen}
            aria-label={
              inspectorOpen
                ? "Collapse context inspector"
                : "Expand context inspector"
            }
          >
            {inspectorOpen ? "▶" : "◀"}
          </button>

          {inspectorOpen && (
            <div className="immersive-rail-content">
              <span className="immersive-overline">
                CONTEXT INSPECTOR
              </span>

              {selectedSpace ? (
                <>
                  <div className="immersive-inspector-symbol">
                    {selectedSpace.occupied ? "🏭" : "◇"}
                  </div>

                  <h3>
                    Space {selectedSpace.id}
                  </h3>

                  <div className="immersive-inspector-detail">
                    <small>Region</small>
                    <strong>
                      {selectedSpace.type}
                    </strong>
                  </div>

                  <div className="immersive-inspector-detail">
                    <small>Status</small>
                    <strong>
                      {selectedSpace.occupied
                        ? "Occupied"
                        : "Unoccupied"}
                    </strong>
                  </div>

                  <p className="immersive-rail-note">
                    Construction and other legal
                    interactions will be connected
                    directly to the selected board
                    space in the next steps.
                  </p>

                  <button
                    type="button"
                    className="immersive-inspector-action"
                    onClick={onOpenWorkshop}
                  >
                    Open actions
                  </button>
                </>
              ) : (
                <div className="immersive-inspector-empty">
                  <span aria-hidden="true">⌖</span>

                  <p>
                    Select a building or empty island
                    space to view its details.
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ACTION DOCK */}
      <nav
        className="immersive-action-dock"
        aria-label="Game actions"
      >
        {dockActions.map(action => (
          <button
            key={action.id}
            type="button"
            className={[
              "immersive-dock-button",
              activeAction === action.id
                ? "is-active"
                : "",
            ].join(" ")}
            onClick={() =>
              selectDockAction(action.id)
            }
            title={action.description}
          >
            <span
              className="immersive-dock-symbol"
              aria-hidden="true"
            >
              {action.symbol}
            </span>

            <strong>{action.label}</strong>
          </button>
        ))}

        <button
          type="button"
          className="immersive-end-turn"
          disabled={actionLoading || game.game_over}
          onClick={onEndTurn}
        >
          End Turn
        </button>
      </nav>

      {/* EXPANDABLE POPULATION HAND */}
      <section className="immersive-hand">
        <button
          type="button"
          className="immersive-hand-toggle"
          onClick={() => setHandOpen(value => !value)}
          aria-expanded={handOpen}
        >
          <span>▤</span>

          <strong>
            Population Cards ({handCards.length})
          </strong>

          <span>{handOpen ? "▼" : "▲"}</span>
        </button>

        {handOpen && (
          <div className="immersive-hand-content">
            <PopulationHand
              key={`${game.current_player_index}:${game.round}`}
              game={game}
              cards={handCards}
              actionLoading={actionLoading}
              onFulfill={onFulfillPopulationCard}
            />
          </div>
        )}
      </section>

      {/* GAME FEEDBACK */}
      {notice && (
        <div
          className="immersive-notice"
          role="status"
        >
          {notice}
        </div>
      )}

      {/* TRADE OVERLAY */}
      {harborOpen && (
        <TradeHarbor
          game={game}
          onClose={() => setHarborOpen(false)}
        />
      )}
    </main>
  );
}
