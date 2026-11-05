
import { useEffect, useState } from "react";
import { IslandCanvas } from "./IslandCanvas";

import { ConstructionPalette } from "./ConstructionPalette";
import {
  ResourcePaymentPicker,
  hasDuplicateProductionSources,
  toConstructionPayments,
} from "./ResourcePaymentPicker";
import type { ConstructionPayment } from "../api";
import type { IndustryCatalogueSnapshot } from "../types";

import { PopulationHand } from "./PopulationHand";
import { TradeHarbor } from "./TradeHarbor";

import type { ComponentProps } from "react";
import type { GameSnapshot } from "../types";
import { pretty } from "../types";

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
  industryData: IndustryCatalogueSnapshot | null;
  selectedLocation: string | null;
  actionLoading: boolean;
  notice: string;

  onSelectLocation: (id: string) => void;
  onEndTurn: () => void;
  onOpenWorkshop: () => void;
  onFulfillPopulationCard: FulfillHandler;
  onProduceIndustry: (industryIndex: number) => Promise<void>;
  onBuildIndustry: (
    industryId: string,
    spaceId: string,
    payments: ConstructionPayment[]
  ) => Promise<void>;
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
  industryData,
  onSelectLocation,
  onEndTurn,
  onOpenWorkshop,
  onFulfillPopulationCard,
  onBuildIndustry,
  onProduceIndustry,
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

  // Step 78: hooks must run on every render, including before game loads.
  const [constructionMode, setConstructionMode] = useState(false);
  const [selectedConstructionId, setSelectedConstructionId] =
    useState<string | null>(null);
  const [constructionTargetId, setConstructionTargetId] =
    useState<string | null>(null);
  const [paymentSources, setPaymentSources] =
    useState<Record<string, string>>({});
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Step 80 — frontend-only production selection.
  const [productionMode, setProductionMode] = useState(false);
  const [selectedProducerIndex, setSelectedProducerIndex] = useState<number | null>(null);
  const [isProducing, setIsProducing] = useState(false);
  const [productionError, setProductionError] = useState<string | null>(null);

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
    setConstructionMode(false);
    setSelectedConstructionId(null);
    setConstructionTargetId(null);
    setPaymentSources({});
    setBuildError(null);
    setProductionMode(false);
    setSelectedProducerIndex(null);
    setProductionError(null);
  }, [game?.current_player_index]);

  function selectDockAction(id: string) {
    if (id === "produce") {
      if (productionMode) {
        closeProductionMode();
      } else {
        openProductionMode();
      }
      return;
    }

    if (id === "build") {
      if (constructionMode) {
        closeConstructionMode();
      } else {
        openConstructionMode();
      }
      return;
    }

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

const selectedConstruction =
  industryData?.industries.find(
    item => item.id === selectedConstructionId
  ) ?? null;

const canEnterConstruction =
  Boolean(game) &&
  Boolean(industryData) &&
  !actionLoading &&
  !game?.main_action_used &&
  !game?.game_over;

const constructionCandidates =
  constructionMode && selectedConstruction
    ? islandSpaces
        .filter(space =>
          !space.occupied &&
          (space.type === "land" || space.type === "coast")
        )
        .map(space => space.id)
    : [];

const constructionTarget =
  islandSpaces.find(space => space.id === constructionTargetId)
  ?? null;

const requirements = Object.entries(
  selectedConstruction?.build_cost ?? {}
).flatMap(([good, amount]) =>
  Array.from({ length: amount }, (_, index) => ({
    key: `${good}:${index}`,
    good,
  }))
);

const paymentComplete = requirements.every(
  requirement => Boolean(paymentSources[requirement.key])
);

const duplicateProduction = hasDuplicateProductionSources(
  paymentSources,
  requirements
);

const canConfirmBuild =
  canEnterConstruction &&
  !isBuilding &&
  Boolean(selectedConstruction) &&
  Boolean(constructionTarget) &&
  Boolean(constructionTarget && constructionCandidates.includes(constructionTarget.id)) &&
  paymentComplete &&
  !duplicateProduction;

async function confirmConstruction() {
  if (!canConfirmBuild || !selectedConstruction || !constructionTarget) return;

  setIsBuilding(true);
  setBuildError(null);

  try {
    const payments = toConstructionPayments(requirements, paymentSources);
    await onBuildIndustry(
      selectedConstruction.id,
      constructionTarget.id,
      payments
    );
    // App owns the authoritative backend snapshot; only clear the UI on success.
    closeConstructionMode();
  } catch (error) {
    setBuildError(
      error instanceof Error ? error.message : "Construction failed"
    );
  } finally {
    setIsBuilding(false);
  }
}

  // Step 80: no authoritative space -> industry-index mapping is available
  // in the current frontend snapshot. The player explicitly chooses the
  // producer from the active player's industry list.
  const ownedIndustries = activePlayer?.industries ?? [];
  const selectedProducer = ownedIndustries.find(
    industry => industry.index === selectedProducerIndex
  ) ?? null;
  const canProduce = Boolean(game) && !actionLoading && !isProducing &&
    !game?.main_action_used && !game?.game_over;

  function openProductionMode() {
    if (!canProduce) return;
    closeConstructionMode();
    setProductionMode(true);
    setSelectedProducerIndex(null);
    setProductionError(null);
    setActiveAction("produce");
  }

  function closeProductionMode() {
    setProductionMode(false);
    setSelectedProducerIndex(null);
    setProductionError(null);
    setActiveAction(null);
  }

  async function confirmProduction() {
    if (!canProduce || !selectedProducer?.can_produce ||
        selectedProducerIndex === null) return;

    setIsProducing(true);
    setProductionError(null);
    try {
      await onProduceIndustry(selectedProducerIndex);
      closeProductionMode();
    } catch (error) {
      setProductionError(
        error instanceof Error ? error.message : "Production failed"
      );
    } finally {
      setIsProducing(false);
    }
  }

  function openConstructionMode() {
    if (!canEnterConstruction) return;
    setSelectedConstructionId(null);
    setConstructionTargetId(null);
    setPaymentSources({});
    setBuildError(null);
    setConstructionMode(true);
    setProductionMode(false);
    setSelectedProducerIndex(null);
    setProductionError(null);
    setActiveAction("build");
  }

  function closeConstructionMode() {
    setConstructionMode(false);
    setSelectedConstructionId(null);
    setConstructionTargetId(null);
    setPaymentSources({});
    setBuildError(null);
    setActiveAction(null);
  }

  function selectConstructionIndustry(industryId: string) {
    if (!canEnterConstruction) return;
    const industry = industryData?.industries.find(item => item.id === industryId);
    if (!industry || industry.remaining <= 0 || industry.already_owned) return;
    setSelectedConstructionId(industryId);
    setConstructionTargetId(null);
    setPaymentSources({});
    setBuildError(null);
  }

  function selectBoardSpace(spaceId: string) {
    onSelectLocation(spaceId);

    // Clicking a built space opens the production panel, but does not
    // select an industry by guessing from the building name.
    const target = islandSpaces.find(space => space.id === spaceId);
    if (!constructionMode && !productionMode && target?.occupied && canProduce) {
      openProductionMode();
    }

    if (!constructionMode || !selectedConstruction) return;

    setConstructionTargetId(
      constructionCandidates.includes(spaceId) ? spaceId : null
    );
    setBuildError(null);
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
              onSelectSpace={selectBoardSpace}
              constructionMode={constructionMode}
              candidateSpaceIds={constructionCandidates}
            />
            </div>

          {/* Step 79: board selection, payment, backend construction. */}
          {constructionMode && (
            <div className="immersive-construction-overlay">
              <ConstructionPalette
                industries={industryData?.industries ?? []}
                selectedIndustryId={selectedConstructionId}
                disabled={!canEnterConstruction}
                onSelect={selectConstructionIndustry}
                onClose={closeConstructionMode}
              />

              {selectedConstruction && (
                <div className="construction-placement-preview">
                  <span className="construction-palette-eyebrow">
                    CONSTRUCTION PREVIEW
                  </span>
                  <h3>{selectedConstruction.name}</h3>
                  {constructionTarget ? (
                    <>
                      <p>
                        Selected location: <strong>{constructionTarget.id}</strong>
                      </p>
                      <p>Region: {constructionTarget.type}</p>
                      <p className="construction-preview-warning">
                        Candidate only. The engine must validate placement before building.
                      </p>
                      <div className="construction-payment-section">
                        <ResourcePaymentPicker
                          game={game}
                          requirements={requirements}
                          paymentSources={paymentSources}
                          onChange={(next) => {
                            setPaymentSources(next);
                            setBuildError(null);
                          }}
                          disabled={actionLoading || isBuilding}
                        />
                      </div>

                      {buildError && (
                        <p className="construction-preview-error" role="alert">
                          {buildError}
                        </p>
                      )}

                      <button
                        type="button"
                        className="construction-preview-confirm"
                        disabled={!canConfirmBuild}
                        onClick={() => void confirmConstruction()}
                      >
                        {isBuilding ? "Constructing..." : "Confirm Construction"}
                      </button>
                    </>
                  ) : (
                    <p>Choose a highlighted candidate space on the island.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 80 — ENGINE-BACKED PRODUCTION PANEL */}
          {productionMode && (
            <section className="immersive-production-overlay" aria-label="Production controls">
              <header className="immersive-production-header">
                <div>
                  <span className="construction-palette-eyebrow">INDUSTRIAL OUTPUT</span>
                  <h3>Produce Goods</h3>
                </div>
                <button type="button" onClick={closeProductionMode}
                  className="construction-palette-close" aria-label="Close production mode">×</button>
              </header>
              {selectedSpace?.occupied && (
                <p className="immersive-production-hint">
                  Inspected space: <strong>{selectedSpace.id}</strong>
                  {selectedSpace.construction ? ` · ${selectedSpace.construction}` : ""}
                </p>
              )}
              <p className="immersive-production-hint">
                Choose a producer below. A board space is not yet mapped to an
                industry index, so selection must be explicit.
              </p>
              <div className="immersive-production-list">
                {ownedIndustries.length === 0 && <p>No industries owned yet.</p>}
                {ownedIndustries.map(industry => (
                  <button key={industry.index} type="button"
                    className={`immersive-producer ${selectedProducerIndex === industry.index ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelectedProducerIndex(industry.index);
                      setProductionError(null);
                    }}
                    aria-pressed={selectedProducerIndex === industry.index}
                    disabled={!canProduce || !industry.can_produce}>
                    <span className="immersive-producer-name">{industry.name}</span>
                    <span>{pretty(industry.good)}</span>
                    <small>{industry.can_produce ? "Ready" : "Unavailable"}</small>
                  </button>
                ))}
              </div>
              {selectedProducer && (
                <p className="immersive-production-hint">
                  Selected: <strong>{selectedProducer.name}</strong> → {pretty(selectedProducer.good)}
                </p>
              )}
              {productionError && <p role="alert" className="construction-preview-error">{productionError}</p>}
              <button type="button" className="construction-preview-confirm"
                disabled={!canProduce || !selectedProducer?.can_produce}
                onClick={() => void confirmProduction()}>
                {isProducing ? "Producing..." : "Confirm Production"}
              </button>
            </section>
          )}

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

                  {selectedSpace.occupied && (
                    <button type="button" className="immersive-inspector-action"
                      disabled={!canProduce}
                      onClick={openProductionMode}>
                      Produce Goods
                    </button>
                  )}

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
            aria-pressed={action.id === "build" ? constructionMode : action.id === "produce" ? productionMode : undefined}
            disabled={action.id === "build"
              ? !constructionMode && !canEnterConstruction
              : action.id === "produce"
                ? !productionMode && !canProduce
                : false}
          >
            <span
              className="immersive-dock-symbol"
              aria-hidden="true"
            >
              {action.symbol}
            </span>

            <strong>{action.id === "build" && constructionMode
              ? "Cancel Build"
              : action.id === "produce" && productionMode
                ? "Cancel Produce"
                : action.label}</strong>
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
