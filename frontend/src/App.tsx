import { useEffect, useMemo, useState } from "react";
import { catalogue as fallbackCatalogue, deckLabels } from "./data/catalogue";

import { GameTable } from "./components/GameTable";
import "./game-table.css";


import {
  fetchGameData,
  performFestival,
  performProduction,
  endTurn,
  fetchIndustries,
  buildIndustry,
  removeConstruction,
  fetchNavalCatalogue,
  buildNavalConstruction
} from "./api";

import type { GameActionResponse, ConstructionPayment } from "./api";

import { CardFace, isPopulation, isExpedition } from "./components/CardFace";
import { IslandBoard, locations } from "./components/IslandBoard";
import { pretty } from "./types";

import type {
  AnyCard,
  DeckName,
  Catalogue,
  GameSnapshot,
  IndustryCatalogueSnapshot,
  NavalCatalogueSnapshot
} from "./types";

import "./styles.css";

type Screen = "table" | "harbor" | "codex";
const decks: DeckName[] = [
  "population",
  "new_world",
  "expedition",
  "objectives",
];
const players = [
  {
    name: "Your Company",
    subtitle: "The Crown & Anchor",
    color: "#bd995d",
    initials: "YC",
  },
  {
    name: "Rival Company",
    subtitle: "North Trading Guild",
    color: "#7a9c94",
    initials: "RC",
  },
];

function App() {
  const [screen, setScreen] = useState<Screen>("table");
  const [activeDeck, setActiveDeck] = useState<DeckName>("population");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [activePlayer, setActivePlayer] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const [paymentSources, setPaymentSources] = useState<Record<string, string>>(
    {},
  );

  const [hand, setHand] = useState<string[]>(() =>
    fallbackCatalogue.population.slice(0, 3).map((card) => card.id),
  );
  const [notice, setNotice] = useState(
    "Select an island location to inspect it.",
  );

  // Step 52: Backend integration
  const [catalogue, setCatalogue] = useState<Catalogue>(
    fallbackCatalogue as Catalogue,
  );
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [industryData, setIndustryData] =
    useState<IndustryCatalogueSnapshot | null>(null);

  const [selectedIndustryId, setSelectedIndustryId] = useState("");

  const [selectedBuildSpace, setSelectedBuildSpace] = useState("");
  const [buildOver, setBuildOver] = useState(false);
  const [selectedRemoveSpace, setSelectedRemoveSpace] =
    useState("");

  
  const [navalData, setNavalData] =
    useState<NavalCatalogueSnapshot | null>(null);

  const [navalType, setNavalType] =
    useState<'shipyard' | 'ship'>('shipyard');

  const [selectedNavalId, setSelectedNavalId] = useState('');
  const [selectedNavalSpace, setSelectedNavalSpace] = useState('');
  const [selectedShipyardIndex, setSelectedShipyardIndex] = useState('');

  const [navalPaymentSources, setNavalPaymentSources] =
    useState<Record<string, string>>({});


  const [apiError, setApiError] = useState<string | null>(null);
  useEffect(() => {
  if (!industryData) return;

  if (
    selectedLocation &&
    !industryData.spaces.some(
      space => space.id === selectedLocation
    )
  ) {
    setSelectedLocation(null);
  }
  }, [industryData, selectedLocation]);
  useEffect(() => {
    if (!game) {
      setNavalData(null);
      return;
    }

    let cancelled = false;

    fetchNavalCatalogue()
      .then(data => {
        if (!cancelled) setNavalData(data);
      })
      .catch(error => {
        if (!cancelled) {
          setNotice(
            error instanceof Error
              ? error.message
              : 'Failed to load naval data'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [game]);


  useEffect(() => {
    let active = true;

    fetchGameData()
      .then((data) => {
        if (!active) return;

        setCatalogue(data.catalogue);
        setGame(data.game);
        setActivePlayer(data.game.current_player_index);
        setApiError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;

        setApiError(
          error instanceof Error ? error.message : "Unknown API error",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const deckCounts = decks.map((deck) => ({
    deck,
    count: catalogue[deck].reduce(
      (sum, card) => sum + ("quantity" in card ? card.quantity : 1),
      0,
    ),
  }));

  const visibleHand = game ? (game.players[activePlayer]?.hand ?? []) : hand;

  const visibleCards = useMemo(() => {
    const source = catalogue[activeDeck] as AnyCard[];
    return source.filter((card) => {
      if (
        isPopulation(card) &&
        category !== "all" &&
        card.category !== category
      )
        return false;
      const content = isPopulation(card)
        ? `${card.category} ${Object.keys(card.requirements).join(" ")} ${card.id}`
        : isExpedition(card)
          ? `${card.animal.name} ${card.artifact.name} ${card.id}`
          : `${card.name} ${card.id}`;
      return content.toLowerCase().includes(search.trim().toLowerCase());
    });
  }, [catalogue, activeDeck, category, search]);
  const selectedCard =
    visibleCards.find((card) => card.id === selectedCardId) ?? visibleCards[0];
  const location = locations.find((item) => item.id === selectedLocation);
  const handCards = catalogue.population
    .filter(isPopulation)
    .filter((card) => visibleHand.includes(card.id));

  function openDeck(deck: DeckName) {
    setActiveDeck(deck);
    setSelectedCardId(null);
    setCategory("all");
    setSearch("");
    setScreen("codex");
  }

  function resetDemo() {
    if (game) {
      setActivePlayer(game.current_player_index);
      setSelectedLocation("port");
      setNotice("UI view reset. Backend game state remains unchanged.");
      setScreen("harbor");
      return;
    }

    setHand(fallbackCatalogue.population.slice(0, 3).map((card) => card.id));
    setActivePlayer(0);
    setSelectedLocation("port");
    setNotice("Demo reset. No backend state was changed.");
    setScreen("harbor");
  }

  async function runGameAction(action: () => Promise<GameActionResponse>) {
    if (!game || actionLoading || game.game_over) return;

    setActionLoading(true);

    try {
      const result = await action();

      setGame(result.game);
      setActivePlayer(result.game.current_player_index);
      setApiError(null);
      setNotice(result.message);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to perform game action",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleFestival() {
    void runGameAction(performFestival);
  }

  function handleProduce(industryIndex: number) {
    void runGameAction(() => performProduction(industryIndex));
  }

  function handleEndTurn() {
    void runGameAction(endTurn);
  }
  
  
useEffect(() => {
  if (!game) {
    setIndustryData(null);
    return;
  }

  let cancelled = false;

  fetchIndustries()
    .then(data => {
      if (!cancelled) {
        setIndustryData(data);
      }
    })
    .catch(error => {
      if (!cancelled) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Cannot load industry catalogue"
        );
      }
    });

  return () => {
    cancelled = true;
  };
}, [game]);


  const selectedIndustry = industryData?.industries.find(
    (item) => item.id === selectedIndustryId,
  );

  const requiredPayments = Object.entries(
    selectedIndustry?.build_cost ?? {},
  ).flatMap(([good, amount]) =>
    Array.from({ length: amount }, (_, index) => ({
      key: `${good}:${index}`,
      good,
    })),
  );

  
  const allPaymentsSelected = requiredPayments.every(
    (item) => Boolean(paymentSources[item.key])
  );

  const productionSelections = Object.values(paymentSources)
    .filter(source => source.startsWith("produce:"));

  const hasDuplicateProduction = new Set(
    productionSelections
  ).size !== productionSelections.length;

  const canSubmitConstruction =
    allPaymentsSelected && !hasDuplicateProduction;


  function getConstructionPayments(): ConstructionPayment[] {
    return requiredPayments.map(({ key, good }) => {
      const selected = paymentSources[key];

      if (!selected) {
        throw new Error(`Missing payment for ${good}`);
      }

      const [source, indexString] = selected.split(":");
      const index = Number(indexString);

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        (source !== "produce" && source !== "trade")
      ) {
        throw new Error(`Invalid payment source for ${good}`);
      }

      if (source === "produce") {
        return {
          source,
          good,
          industry_index: index,
        };
      }

      return {
        source: "trade",
        good,
        partner_index: index,
      };
    });
  }

  async function handleBuildIndustry() {
    if (
      !game ||
      !selectedIndustryId ||
      !selectedBuildSpace ||
      !allPaymentsSelected ||
      actionLoading ||
      game.main_action_used ||
      game.game_over
    ) {
      return;
    }

    setActionLoading(true);

    try {
      const payments = getConstructionPayments();

      const result = await buildIndustry(
        selectedIndustryId,
        selectedBuildSpace,
        payments,
        buildOver
      );

      setGame(result.game);
      setActivePlayer(result.game.current_player_index);

      setSelectedIndustryId("");
      setSelectedBuildSpace("");
      setPaymentSources({});
      setApiError(null);
      setNotice(result.message);
      setBuildOver(false);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to construct industry",
      );
    } finally {
      setActionLoading(false);
    }
  }

  
  const displayPlayers = game
    ? game.players.map((player, index) => ({
      name: player.name,
        subtitle:
          index === game.current_player_index
            ? "Current turn"
            : "Trading company",
        color: players[index % players.length].color,
        initials: player.name
          .split(" ")
          .map(word => word[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
      }))
    : players;
  
  
  async function handleRemoveConstruction() {
    if (
      !game ||
      !selectedRemoveSpace ||
      actionLoading ||
      game.main_action_used ||
      game.game_over
    ) {
      return;
    }

    const target = industryData?.spaces.find(
      space => space.id === selectedRemoveSpace
    );

    if (!target?.occupied) {
      setNotice("Select an occupied space.");
      return;
    }

    if (
      !window.confirm(
        `Demolish ${target.construction ?? "construction"} at ${target.id}?`
      )
    ) {
      return;
    }

    setActionLoading(true);

    try {
      const result = await removeConstruction(
        selectedRemoveSpace
      );

      setGame(result.game);
      setActivePlayer(
        result.game.current_player_index
      );

      setSelectedRemoveSpace("");
      setSelectedBuildSpace("");
      setNotice(result.message);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to demolish construction"
      );
    } finally {
      setActionLoading(false);
    }
  }

  const selectedNavalDefinition =
    navalType === 'shipyard'
      ? navalData?.shipyards.find(x => x.id === selectedNavalId)
      : navalData?.ships.find(x => x.id === selectedNavalId);

  const navalRequiredPayments = Object.entries(
    selectedNavalDefinition?.build_cost ?? {}
  ).flatMap(([good, amount]) =>
    Array.from({ length: amount }, (_, index) => ({
      key: `${good}:${index}`,
      good,
    }))
  );

  const navalPaymentsComplete = navalRequiredPayments.every(
    item => Boolean(navalPaymentSources[item.key])
  );

  const navalProductionSelections = Object.values(
    navalPaymentSources
  ).filter(value => value.startsWith('produce:'));

  const navalHasDuplicateProduction =
    new Set(navalProductionSelections).size !==
    navalProductionSelections.length;

  const canBuildNaval =
    Boolean(game) &&
    Boolean(selectedNavalDefinition) &&
    Boolean(selectedNavalSpace) &&
    (navalType === 'shipyard' || selectedShipyardIndex !== '') &&
    navalPaymentsComplete &&
    !navalHasDuplicateProduction &&
    !actionLoading &&
    !game?.main_action_used &&
    !game?.game_over;

  async function handleBuildNaval() {
    if (!canBuildNaval || !game) return;

    setActionLoading(true);

    try {
      const payments: ConstructionPayment[] =
        navalRequiredPayments.map(({ key, good }) => {
          const value = navalPaymentSources[key];
          const [source, indexText] = value.split(':');
          const index = Number(indexText);

          if (!Number.isInteger(index) || index < 0) {
            throw new Error('Invalid payment source');
          }

          if (source === 'produce') {
            return {
              source,
              good,
              industry_index: index,
            };
          }

          if (source === 'trade') {
            return {
              source,
              good,
              partner_index: index,
            };
          }

          throw new Error('Invalid payment type');
        });

      const result = await buildNavalConstruction(
        navalType,
        selectedNavalId,
        selectedNavalSpace,
        payments,
        navalType === 'ship'
          ? Number(selectedShipyardIndex)
          : undefined
      );

      setGame(result.game);
      setActivePlayer(result.game.current_player_index);
      setSelectedNavalId('');
      setSelectedNavalSpace('');
      setSelectedShipyardIndex('');
      setNavalPaymentSources({});
      setNotice(result.message);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Naval construction failed'
      );
    } finally {
      setActionLoading(false);
    }
  }
  async function handleBoardBuildIndustry(
    industryId: string,
    spaceId: string,
    payments: ConstructionPayment[]
  ): Promise<void> {
    if (
      !game ||
      actionLoading ||
      game.main_action_used ||
      game.game_over
    ) {
      return;
    }

    setActionLoading(true);

    try {
      const result = await buildIndustry(
        industryId,
        spaceId,
        payments,
        false
      );

      setGame(result.game);
      setActivePlayer(result.game.current_player_index);
      setApiError(null);

      setNotice(result.message);
      setSelectedLocation(spaceId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to construct industry";

      setNotice(message);
      throw error;
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className={`app-shell ${screen === "table" ? "table-mode" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            A<span>·</span>
          </div>
          <div>
            <div className="brand-title">
              ANNO <em>1800</em>
            </div>
            <div className="brand-caption">THE BOARD GAME · COMPANION</div>
          </div>
        </div>
        <div className="sidebar-section-title">YOUR TABLE</div>
        <nav className="primary-nav" aria-label="Main navigation">
        <button
          className={screen === "table" ? "active" : ""}
          onClick={() => setScreen("table")}
        >
          <span className="nav-symbol">⚓</span>
          Game Table
          <span className="nav-arrow">↗</span>
        </button>
          <button
            className={screen === "harbor" ? "active" : ""}
            onClick={() => setScreen("harbor")}
          >
            <span className="nav-symbol">⌂</span> Harbor overview{" "}
            <span className="nav-arrow">↗</span>
          </button>
          <button
            className={screen === "codex" ? "active" : ""}
            onClick={() => setScreen("codex")}
          >
            <span className="nav-symbol">▤</span> Card collection{" "}
            <span className="nav-arrow">↗</span>
          </button>
        </nav>
        <div className="sidebar-section-title deck-heading">
          CARD CATALOGUES
        </div>
        <nav className="deck-nav" aria-label="Card catalogues">
          {deckCounts.map(({ deck, count }) => (
            <button
              key={deck}
              className={
                screen === "codex" && activeDeck === deck ? "current" : ""
              }
              onClick={() => openDeck(deck)}
            >
              <span className={`deck-dot ${deck}`} />
              {deckLabels[deck]}
              <span className="deck-count">{count}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-icon">✦</div>
          <div>
            <strong>Custom edition</strong>
            <p>Original, invented card decks. Balance is provisional.</p>
          </div>
        </div>
        <button className="sidebar-help" onClick={() => setShowHelp(true)}>
          ⓘ <span>About this prototype</span>
          <span>↗</span>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            THE ARCHIPELAGO <span>/</span>{" "}
            {screen === "harbor"
              ? "HARBOR OVERVIEW"
              : deckLabels[activeDeck].toUpperCase()}
          </div>
          <div className="topbar-actions">
            <span className="prototype-pill">
              <span />
              {game
                ? "ENGINE CONNECTED"
                : apiError
                  ? "DEMO MODE"
                  : "CONNECTING"}
            </span>
            <button
              className="topbar-icon"
              onClick={() => setShowHelp(true)}
              aria-label="Help"
            >
              ?
            </button>
            <div className="avatar">YC</div>
          </div>
        </header>
        {screen === "table" ? (
          <GameTable
            game={game}
            islandSpaces={industryData?.spaces ?? []}
            handCards={handCards}
            actionLoading={actionLoading}
            notice={notice}
            industryData={industryData}
            selectedLocation={selectedLocation}
            onBuildIndustry={handleBoardBuildIndustry}
            onSelectLocation={(id) => {
            setSelectedLocation(id);

            const space = industryData?.spaces.find(
              item => item.id === id
            );

            if (!space) {
              setNotice(`Selected space ${id}.`);
              return;
            }

            setNotice(
              space.occupied
                ? `${id}: ${space.construction ?? "Occupied construction"}`
                : `${id}: Empty ${pretty(space.type)} space.`
            );
          }}
            onFestival={handleFestival}
            onProduce={handleProduce}
            onEndTurn={handleEndTurn}
            onOpenWorkshop={() => setScreen("harbor")}
            onOpenCards={() => openDeck("population")}
          />
        ) : screen === "harbor" ? (
          <>
            <div className="page-intro">
              <div>
                <div className="eyebrow">YOUR EMPIRE AWAITS</div>
                <h1>
                  Welcome to your <i>harbor.</i>
                </h1>
                <p>A new age of industry, discovery and trade begins here.</p>
              </div>
              <div className="page-intro-actions">
                <button className="ghost-button" onClick={resetDemo}>
                  ↺ Reset demo
                </button>
                <button
                  className="gold-button"
                  onClick={() => openDeck("population")}
                >
                  Explore cards <span>↗</span>
                </button>
              </div>
            </div>
            <div className="dashboard-grid">
              <section className="board-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">THE OLD WORLD</span>
                    <h2>Your island estate</h2>
                  </div>
                  <span className="panel-kicker">
                    5 LOCATIONS · EXPLORE THE MAP
                  </span>
                </div>
                <IslandBoard
                  selectedId={selectedLocation}
                  onSelect={(id) => {
                    setSelectedLocation(id);
                    setNotice(
                      `${locations.find((x) => x.id === id)?.name} selected. Production actions will be connected in a later step.`,
                    );
                  }}
                />
                <div className="board-bottom">
                  <div className="location-info">
                    <div className="location-icon">{location?.icon ?? "✦"}</div>
                    <div>
                      <span className="eyebrow">
                        {location?.type ?? "LOCATION"}
                      </span>
                      <strong>{location?.name ?? "Select a location"}</strong>
                      <p>{location?.description ?? "Explore the island."}</p>
                    </div>
                  </div>
                  <div className="production-badge">
                    PRODUCES <b>{location?.production ?? "—"}</b>
                  </div>
                </div>
              </section>
              <aside className="dashboard-right">
                <section className="company-panel">
                  <div className="eyebrow">THE TRADING COMPANIES</div>
                  <h2>At the table</h2>
                  <div className="player-list">
                    {displayPlayers.map((player, i) => (
                      <button
                        key={player.name}
                        onClick={() => setActivePlayer(i)}
                        className={`player-row ${activePlayer === i ? "selected" : ""}`}
                      >
                        <span
                          className="player-avatar"
                          style={{ background: player.color }}
                        >
                          {player.initials}
                        </span>
                        <span className="player-description">
                          <strong>{player.name}</strong>
                          <small>{player.subtitle}</small>
                        </span>
                        {activePlayer === i ? (
                          <span className="turn-marker">VIEWING</span>
                        ) : (
                          <span className="player-arrow">↗</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="company-stats">
                    <div>
                      <span>ROUND</span>
                      <strong>
                        {String(game?.round ?? 1).padStart(2, "0")}
                      </strong>
                    </div>
                    <div>
                      <span>GOLD</span>
                      <strong>
                        {game?.players[activePlayer]?.gold ?? "—"}
                      </strong>
                    </div>
                    <div>
                      <span>VICTORY POINTS</span>
                      <strong>
                        {game?.players[activePlayer]?.victory_points ?? "—"}
                      </strong>
                    </div>
                  </div>
                  <div className="small-note">
                    {game
                      ? "Connected to Python game engine"
                      : apiError
                        ? `Demo mode: ${apiError}`
                        : "Connecting to Python game engine..."}
                  </div>
                </section>
                <section className="hand-panel">
                  <div className="hand-panel-heading">
                    <div>
                      <div className="eyebrow">YOUR COLLECTION</div>
                      <h2>Preview hand</h2>
                    </div>
                    <span className="hand-count">
                      {visibleHand.length} CARDS
                    </span>
                  </div>
                  <div className="mini-card-stack">
                    {handCards.map((card) => (
                      <button
                        key={card.id}
                        className="mini-card"
                        onClick={() => {
                          openDeck("population");
                          setSelectedCardId(card.id);
                        }}
                      >
                        <span className={`mini-card-emblem ${card.category}`}>
                          {card.category === "farmer" ? "♧" : "⚒"}
                        </span>
                        <span>
                          <strong>{pretty(card.category)}</strong>
                          <small>
                            {Object.entries(card.requirements)
                              .map(
                                ([good, amount]) =>
                                  `${amount}× ${pretty(good)}`,
                              )
                              .join(" · ")}
                          </small>
                        </span>
                        <b>{card.victory_points} VP</b>
                      </button>
                    ))}
                  </div>
                  <button
                    className="link-button"
                    onClick={() => openDeck("population")}
                  >
                    View complete card catalogue <span>→</span>
                  </button>
                </section>
              </aside>
            </div>
            <div className="bottom-strip">
              <div className="strip-intro">
                <span className="strip-icon">⚓</span>
                <div>
                  <strong>Set sail for discovery</strong>
                  <p>Four custom decks are ready to explore.</p>
                </div>
              </div>
              <div className="strip-decks">
                {deckCounts.map(({ deck, count }) => (
                  <button key={deck} onClick={() => openDeck(deck)}>
                    <strong>{count}</strong>
                    <span>{deckLabels[deck]}</span>
                    <i>↗</i>
                  </button>
                ))}
              </div>
            </div>

            {game && (
              <section className="company-panel">
                <div className="eyebrow">GAMEPLAY CONTROLS</div>

                <h2>{game.players[game.current_player_index]?.name}'s Turn</h2>

                <p>
                  Round {game.round} · {game.phase}
                </p>

                <p>
                  {game.game_over
                    ? "Game finished"
                    : game.main_action_used
                      ? "Main action completed"
                      : "Choose your main action"}
                </p>

                <div className="page-intro-actions">
                  <button
                    className="gold-button"
                    onClick={handleFestival}
                    disabled={
                      actionLoading || game.main_action_used || game.game_over
                    }
                  >
                    Festival
                  </button>

                  <button
                    className="ghost-button"
                    onClick={handleEndTurn}
                    disabled={
                      actionLoading || !game.main_action_used || game.game_over
                    }
                  >
                    End Turn →
                  </button>
                </div>

                <div className="eyebrow">AVAILABLE INDUSTRIES</div>

                <div className="mini-card-stack">
                  {game.players[game.current_player_index]?.industries.map(
                    (industry) => (
                      <div key={industry.index} className="mini-card">
                        <span>
                          <strong>{industry.name}</strong>
                          <small>
                            {pretty(industry.good)} ·{" "}
                            {pretty(industry.worker_type)}
                          </small>
                        </span>

                        <button
                          className="ghost-button"
                          disabled={
                            actionLoading ||
                            game.main_action_used ||
                            game.game_over ||
                            !industry.can_produce
                          }
                          onClick={() => handleProduce(industry.index)}
                        >
                          Produce
                        </button>
                      </div>
                    ),
                  )}
                </div>

                {game.players[game.current_player_index]?.industries.length ===
                  0 && (
                  <p className="small-note">
                    No industries built yet. Industry construction UI will be
                    added later.
                  </p>
                )}
              </section>
            )}

            {game && industryData && (
              <section className="company-panel">
                <div className="eyebrow">INDUSTRIAL DEVELOPMENT</div>

                <h2>Construct Industry</h2>

                <p className="small-note">
                  Build one industry per Expand action. Construction consumes
                  your main action.
                </p>

                <div className="filters">
                  <label>
                    Industry
                    <select
                      value={selectedIndustryId}
                      onChange={(event) => {
                        setSelectedIndustryId(event.target.value);
                        setSelectedBuildSpace("");
                        setPaymentSources({});
                      }}
                      disabled={
                        actionLoading || game.main_action_used || game.game_over
                      }
                    >
                      <option value="">Select industry</option>

                      {industryData.industries.map((industry) => (
                        <option
                          key={industry.id}
                          value={industry.id}
                          disabled={
                            industry.remaining === 0 || industry.already_owned
                          }
                        >
                          {industry.name} ({industry.remaining} left)
                          {Object.keys(industry.build_cost).length > 0
                            ? " — Requires resources"
                            : " — Free"}
                        </option>
                      ))}
                    </select>
                  </label>
                  
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={buildOver}
                      onChange={(event) => {
                        setBuildOver(event.target.checked);
                        setSelectedBuildSpace("");
                      }}
                      disabled={
                        actionLoading ||
                        game.main_action_used ||
                        game.game_over
                      }
                    />
                    Replace an existing construction
                  </label>

                  <label>
                    Construction Space
                    <select
                      value={selectedBuildSpace}
                      onChange={(event) =>
                        setSelectedBuildSpace(event.target.value)
                      }
                      disabled={
                        !selectedIndustryId ||
                        actionLoading ||
                        game.main_action_used ||
                        game.game_over
                      }
                    >
                      <option value="">Select space</option>

                      {industryData.spaces
                        .filter(space =>
                          buildOver
                            ? space.occupied &&
                              ["land", "coast"].includes(space.type)
                            : !space.occupied &&
                              ["land", "coast"].includes(space.type)
                        )
                        .map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.id} — {pretty(space.type)}
                            {space.occupied
                              ? ` (${space.construction ?? "Occupied"})`
                              : " (Empty)"}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                {selectedIndustryId && (
                  <div className="small-note">
                    {(() => {
                      const selected = industryData.industries.find(
                        (item) => item.id === selectedIndustryId,
                      );

                      if (!selected) return null;

                      const cost = Object.entries(selected.build_cost);

                      return (
                        <>
                          Produces: {pretty(selected.good)}
                          {" · "}
                          Worker: {pretty(selected.worker_type)}
                          {" · "}
                          Cost:{" "}
                          {cost.length
                            ? cost
                                .map(
                                  ([good, amount]) =>
                                    `${amount}× ${pretty(good)}`,
                                )
                                .join(", ")
                            : "Free"}
                        </>
                      );
                    })()}
                  </div>
                )}

                {selectedIndustry && requiredPayments.length > 0 && (
                  <div className="construction-payment">
                    <div className="eyebrow">RESOURCE PAYMENT</div>

                    <p className="small-note">
                      Select a resource source for each required good.
                    </p>

                    {requiredPayments.map(({ key, good }) => (
                      <label
                        key={key}
                        style={{
                          display: "block",
                          marginBottom: 12,
                        }}
                      >
                        <strong>{pretty(good)}</strong>

                        <select
                          value={paymentSources[key] ?? ""}
                          onChange={(event) =>
                            setPaymentSources((previous) => ({
                              ...previous,
                              [key]: event.target.value,
                            }))
                          }
                          disabled={
                            actionLoading ||
                            game.main_action_used ||
                            game.game_over
                          }
                        >
                          <option value="">Select source</option>

                          {game.players[game.current_player_index]?.industries
                            .filter(
                              (industry) =>
                                industry.good === good && industry.can_produce,
                            )
                            .map((industry) => (
                              <option
                                key={`produce:${industry.index}`}
                                value={`produce:${industry.index}`}
                              >
                                Produce — {industry.name}
                              </option>
                            ))}

                          {game.players.map((player, playerIndex) => {
                            if (playerIndex === game.current_player_index) {
                              return null;
                            }

                            if (
                              !player.industries.some(
                                (industry) => industry.good === good,
                              )
                            ) {
                              return null;
                            }

                            return (
                              <option
                                key={`trade:${playerIndex}`}
                                value={`trade:${playerIndex}`}
                              >
                                Trade — {player.name}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  className="gold-button"
                  onClick={() => void handleBuildIndustry()}
                  disabled={
                    !selectedIndustryId ||
                    !selectedBuildSpace ||
                    !canSubmitConstruction ||
                    actionLoading ||
                    game.main_action_used ||
                    game.game_over
                  }
                >
                  {actionLoading ? "Building..." : "Build Industry"}
                </button>
              </section>
            )}
            
            {game && industryData && (
              <section className="company-panel">
                <div className="eyebrow">
                  ISLAND MANAGEMENT
                </div>

                <h2>Demolish Construction</h2>

                <p className="small-note">
                  Remove a construction from your Home Island.
                  This consumes your main action.
                </p>

                <div className="filters">
                  <label>
                    Occupied Space

                    <select
                      value={selectedRemoveSpace}
                      onChange={event =>
                        setSelectedRemoveSpace(event.target.value)
                      }
                      disabled={
                        actionLoading ||
                        game.main_action_used ||
                        game.game_over
                      }
                    >
                      <option value="">
                        Select construction
                      </option>

                      {industryData.spaces
                        .filter(space => space.occupied)
                        .map(space => (
                          <option
                            key={space.id}
                            value={space.id}
                          >
                            {space.id} —{" "}
                            {space.construction ?? "Construction"}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <button
                  className="ghost-button"
                  onClick={() =>
                    void handleRemoveConstruction()
                  }
                  disabled={
                    !selectedRemoveSpace ||
                    actionLoading ||
                    game.main_action_used ||
                    game.game_over
                  }
                >
                  Demolish Construction
                </button>
              </section>
            )}
            
            {game && navalData && (
              <section className="company-panel">
                <div className="eyebrow">NAVAL DEVELOPMENT</div>
                <h2>Shipyard & Ship Construction</h2>

                <p className="small-note">
                  Trade tokens: {navalData.naval_capacity.trade}
                  {' · '}
                  Exploration tokens: {navalData.naval_capacity.exploration}
                </p>

                <div className="filters">
                  <label>
                    Construction Type
                    <select
                      value={navalType}
                      onChange={event => {
                        setNavalType(
                          event.target.value as 'shipyard' | 'ship'
                        );
                        setSelectedNavalId('');
                        setSelectedNavalSpace('');
                        setSelectedShipyardIndex('');
                        setNavalPaymentSources({});
                      }}
                      disabled={actionLoading || game.main_action_used}
                    >
                      <option value="shipyard">Shipyard</option>
                      <option value="ship">Ship</option>
                    </select>
                  </label>

                  <label>
                    Construction
                    <select
                      value={selectedNavalId}
                      onChange={event => {
                        setSelectedNavalId(event.target.value);
                        setNavalPaymentSources({});
                      }}
                      disabled={actionLoading || game.main_action_used}
                    >
                      <option value="">Select construction</option>
                      {(navalType === 'shipyard'
                        ? navalData.shipyards
                        : navalData.ships
                      ).map(item => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={item.remaining <= 0}
                        >
                          {item.name} — {item.remaining} left
                        </option>
                      ))}
                    </select>
                  </label>

                  {navalType === 'ship' && (
                    <label>
                      Shipyard
                      <select
                        value={selectedShipyardIndex}
                        onChange={event =>
                          setSelectedShipyardIndex(event.target.value)
                        }
                        disabled={actionLoading || game.main_action_used}
                      >
                        <option value="">Select shipyard</option>
                        {navalData.owned_shipyards.map(shipyard => (
                          <option
                            key={shipyard.index}
                            value={shipyard.index}
                            disabled={
                              (selectedNavalDefinition?.strength ?? 0) >
                              shipyard.strength
                            }
                          >
                            {shipyard.name} — Strength {shipyard.strength}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label>
                    Construction Space
                    <select
                      value={selectedNavalSpace}
                      onChange={event =>
                        setSelectedNavalSpace(event.target.value)
                      }
                      disabled={actionLoading || game.main_action_used}
                    >
                      <option value="">Select space</option>
                      {navalData.spaces
                        .filter(space =>
                          !space.occupied &&
                          space.type === (
                            navalType === 'shipyard' ? 'coast' : 'sea'
                          )
                        )
                        .map(space => (
                          <option key={space.id} value={space.id}>
                            {space.id} — {pretty(space.type)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                {selectedNavalDefinition && (
                  <p className="small-note">
                    Strength: {selectedNavalDefinition.strength}
                    {' · '}
                    Cost:{' '}
                    {Object.entries(selectedNavalDefinition.build_cost)
                      .map(([good, count]) => `${count}× ${pretty(good)}`)
                      .join(', ') || 'Free'}
                  </p>
                )}

                {navalRequiredPayments.length > 0 && (
                  <div className="construction-payment">
                    <div className="eyebrow">RESOURCE PAYMENT</div>

                    {navalRequiredPayments.map(({ key, good }) => (
                      <label key={key} style={{ display: 'block', marginBottom: 12 }}>
                        <strong>{pretty(good)}</strong>
                        <select
                          value={navalPaymentSources[key] ?? ''}
                          onChange={event =>
                            setNavalPaymentSources(previous => ({
                              ...previous,
                              [key]: event.target.value,
                            }))
                          }
                          disabled={actionLoading || game.main_action_used}
                        >
                          <option value="">Select source</option>

                          {game.players[game.current_player_index]
                            ?.industries
                            .filter(industry =>
                              industry.good === good &&
                              industry.can_produce
                            )
                            .map(industry => (
                              <option
                                key={`produce:${industry.index}`}
                                value={`produce:${industry.index}`}
                              >
                                Produce — {industry.name}
                              </option>
                            ))}

                          {game.players.map((player, index) => {
                            if (index === game.current_player_index) return null;
                            if (!player.industries.some(x => x.good === good)) {
                              return null;
                            }

                            return (
                              <option key={`trade:${index}`} value={`trade:${index}`}>
                                Trade — {player.name}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  className="gold-button"
                  onClick={() => void handleBuildNaval()}
                  disabled={!canBuildNaval}
                >
                  {actionLoading ? 'Building...' : 'Build Naval Construction'}
                </button>

                <div className="eyebrow">YOUR FLEET</div>
                <div className="mini-card-stack">
                  {navalData.owned_ships.map((ship, index) => (
                    <div className="mini-card" key={`${ship.name}:${index}`}>
                      <span>
                        <strong>{ship.name}</strong>
                        <small>
                          {pretty(ship.type)} · Strength {ship.strength}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="notice" role="status">
              ✦ {notice}
            </div>
          </>
        ) : (
          <>
            <div className="page-intro codex-intro">
              <div>
                <div className="eyebrow">THE GRAND ARCHIVE</div>
                <h1>
                  Card <i>collection.</i>
                </h1>
                <p>
                  Explore the custom cards powering your Anno 1800 prototype.
                </p>
              </div>
              <div className="catalogue-total">
                <strong>144</strong>
                <span>
                  CARDS ACROSS
                  <br />
                  FOUR DECKS
                </span>
              </div>
            </div>
            <section className="codex-panel">
              <div className="codex-tabs">
                {deckCounts.map(({ deck, count }) => (
                  <button
                    key={deck}
                    className={activeDeck === deck ? "active" : ""}
                    onClick={() => {
                      setActiveDeck(deck);
                      setCategory("all");
                      setSearch("");
                      setSelectedCardId(null);
                    }}
                  >
                    {deckLabels[deck]} <span>{count}</span>
                  </button>
                ))}
              </div>
              <div className="codex-toolbar">
                <div>
                  <h2>{deckLabels[activeDeck]} cards</h2>
                  <p>
                    {visibleCards.length} designs displayed · Original homebrew
                    data
                  </p>
                </div>
                <div className="filters">
                  <label className="search-box">
                    <span>⌕</span>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search cards or goods…"
                      aria-label="Search cards"
                    />
                  </label>
                  {activeDeck === "population" && (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      aria-label="Filter by population tier"
                    >
                      <option value="all">All tiers</option>
                      {[
                        "farmer",
                        "worker",
                        "artisan",
                        "engineer",
                        "investor",
                      ].map((tier) => (
                        <option key={tier} value={tier}>
                          {pretty(tier)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="codex-layout">
                <div className="card-gallery">
                  {visibleCards.map((card) => (
                    <CardFace
                      key={card.id}
                      card={card}
                      selected={selectedCard?.id === card.id}
                      onClick={() => setSelectedCardId(card.id)}
                    />
                  ))}
                  {visibleCards.length === 0 && (
                    <div className="empty-state">
                      No cards match this search. Try another term.
                    </div>
                  )}
                </div>
                <aside className="inspector">
                  <div className="eyebrow">CARD INSPECTOR</div>
                  {selectedCard ? (
                    <>
                      <h2>
                        {isPopulation(selectedCard)
                          ? pretty(selectedCard.category)
                          : isExpedition(selectedCard)
                            ? "Expedition"
                            : selectedCard.name}
                      </h2>
                      <p className="inspector-id">{selectedCard.id}</p>
                      <div className="inspector-divider" />
                      {isPopulation(selectedCard) ? (
                        <>
                          <div className="inspector-label">REQUIREMENTS</div>
                          {Object.entries(selectedCard.requirements).map(
                            ([good, count]) => (
                              <div className="inspector-line" key={good}>
                                <span>{pretty(good)}</span>
                                <strong>× {count}</strong>
                              </div>
                            ),
                          )}
                          <div className="inspector-divider" />
                          <div className="inspector-line">
                            <span>Victory points</span>
                            <strong>{selectedCard.victory_points}</strong>
                          </div>
                          <div className="inspector-label inspector-label-later">
                            CARD EFFECTS
                          </div>
                          {selectedCard.effects.length ? (
                            selectedCard.effects.map((effect, i) => (
                              <p className="inspector-effect" key={i}>
                                {pretty(effect.type)} {effect.amount ?? ""}{" "}
                                {effect.population_type
                                  ? pretty(effect.population_type)
                                  : ""}
                              </p>
                            ))
                          ) : (
                            <p className="inspector-effect">None</p>
                          )}
                          <div className="inspector-line">
                            <span>Copies in deck</span>
                            <strong>{selectedCard.quantity}</strong>
                          </div>
                          {activeDeck === "population" && (
                            <button
                              className="gold-button inspector-action"
                              disabled={
                                Boolean(game) ||
                                visibleHand.includes(selectedCard.id)
                              }
                              onClick={() => {
                                setHand((previous) => [
                                  ...previous,
                                  selectedCard.id,
                                ]);

                                setNotice(
                                  "Added card to the UI-only preview hand.",
                                );
                              }}
                            >
                              {game
                                ? "Read-only mode"
                                : visibleHand.includes(selectedCard.id)
                                  ? "In preview hand"
                                  : "Add to preview hand"}
                            </button>
                          )}
                        </>
                      ) : isExpedition(selectedCard) ? (
                        <>
                          <div className="inspector-label">ANIMAL</div>
                          <div className="inspector-line">
                            <span>{selectedCard.animal.name}</span>
                            <strong>
                              {selectedCard.animal.victory_points} VP
                            </strong>
                          </div>
                          <div className="inspector-label inspector-label-later">
                            ARTIFACT
                          </div>
                          <div className="inspector-line">
                            <span>{selectedCard.artifact.name}</span>
                            <strong>
                              {selectedCard.artifact.victory_points} VP
                            </strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="inspector-label">SCORING RULE</div>
                          <pre className="rule-json">
                            {JSON.stringify(selectedCard.rule, null, 2)}
                          </pre>
                        </>
                      )}
                      <div className="inspector-divider" />
                      <div className="verification-note">
                        ✦ Invented card. Gameplay balance is provisional.
                      </div>
                    </>
                  ) : (
                    <p>Select a card to see its details.</p>
                  )}
                </aside>
              </div>
            </section>
          </>
        )}
        <footer className="app-footer">
          <span>ANNO 1800 · UNOFFICIAL FAN-MADE PROTOTYPE</span>
          <span>STEP 64 · ADVANCED CONSTRUCTION</span>
        </footer>
      </main>
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowHelp(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="eyebrow">ABOUT THIS BUILD</div>
            <h2 id="modal-title">A beautiful beginning.</h2>
            <p>
              This is the Step 51 interface prototype. You can explore five
              island locations, browse all four custom card decks, filter and
              inspect cards, and preview a hand.
            </p>
            <p>
              Production, trading, turn progression, multiplayer and saving are
              not yet connected to the Python game engine. The displayed
              companies and island are sample UI data.
            </p>
            <button className="gold-button" onClick={() => setShowHelp(false)}>
              Return to harbor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
