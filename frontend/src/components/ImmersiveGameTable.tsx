
import { useEffect, useState, useRef } from "react";
import { IslandCanvas } from "./IslandCanvas";
import { ResourceToken } from "./ResourceToken";
import { ResourceDependencyPanel } from "./ResourceDependencyPanel";
import { TradeDirectory } from "./TradeDirectory";
import { pretty } from "../types";
import { TurnStatus } from "./TurnStatus";
import { EndTurnDialog } from "./EndTurnDialog";
import { FinalResultsDialog } from "./FinalResultsDialog";
import { GameHistoryPanel } from "./GameHistoryPanel";
import { SaveLoadDialog } from "./SaveLoadDialog";
import { NewGameDialog } from "./NewGameDialog";
import type { SaveSlotId, GameSetupSettings } from "../api";
import { NavalConstructionPanel } from "./NavalConstructionPanel";

import type {
  AppPreferences,
} from "../app-preferences";

import { PreferencesDialog } from "./PreferencesDialog";

import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

import { ContextHelp } from "./ContextHelp";
import { GameHelpDialog } from "./GameHelpDialog";
import { GameTutorial } from "./GameTutorial";

import {
  getKeyboardShortcut,
} from "../keyboard-shortcuts";

import type { NavalCatalogueSnapshot } from "../types";

import { ConstructionPalette } from "./ConstructionPalette";
import {
  ResourcePaymentPicker,
  hasDuplicateProductionSources,
  toConstructionPayments,
} from "./ResourcePaymentPicker";
import type { ConstructionPayment } from "../api";
import type { IndustryCatalogueSnapshot } from "../types";

import { PopulationHand } from "./PopulationHand";
import { PopulationCardDesk } from "./PopulationCardDesk";
import { FestivalDialog } from "./FestivalDialog";
import { ExplorationDialog } from "./ExplorationDialog";
import { NewWorldAtlas } from "./NewWorldAtlas";
import { ObjectivesPanel } from "./ObjectivesPanel";

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
  tradeCapacity?: number | null;
  islandSpaces: IslandSpaces;
  handCards: HandCards;
  industryData: IndustryCatalogueSnapshot | null;
  navalData: NavalCatalogueSnapshot | null
  selectedLocation: string | null;
  actionLoading: boolean;
  notice: string;
  preferences: AppPreferences;
  shortcutsEnabled: boolean;
  
  tutorialRequested: boolean;
  onTutorialRequestConsumed: () => void;
  onTutorialCompleted: () => void;
  onTutorialSkipped: () => void;

  onChangePreferences: (value: AppPreferences) => void; 
  onOpenMainMenu: () => void;
  onSelectLocation: (id: string) => void;
  onConfirmEndTurn: () => Promise<void>;
  onFestival: () => Promise<void>;
  onExploreNewWorld: () => Promise<void>;
  onOpenWorkshop: () => void;
  onFulfillPopulationCard: FulfillHandler;
  onProduceIndustry: (industryIndex: number) => Promise<void>;
  onBuildIndustry: (
    industryId: string,
    spaceId: string,
    payments: ConstructionPayment[]
  ) => Promise<void>;

  onBuildNaval: (
    type: "shipyard" | "ship",
    constructionId: string,
    spaceId: string,
    payments: ConstructionPayment[],
    shipyardIndex?: number
  ) => Promise<void>;
  onSaveGame: (slot: SaveSlotId) => Promise<void>;
  onLoadGame: (slot: SaveSlotId) => Promise<void>;
  onCreateNewGame: (
      names: string[],
      settings: GameSetupSettings
    ) => Promise<void>;
};


const sessionActions = new Set([
  "objectives",
  "results",
  "history",
  "archive",
  "new_game",
  "main_menu",
  "settings",
  "keyboard_help",
  "game_help",
  "tutorial",
]);


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
    id: "naval",
    label: "Naval",
    symbol: "⚓",
    description: "Construct shipyards and ships",
  },
  {
    id: "festival",
    label: "Festival",
    symbol: "✦",
    description: "Hold a Festival",
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
    id: "world",
    label: "World",
    symbol: "◈",
    description: "View discovered New World islands",
  },
  {
    id: "objectives",
    label: "Objectives",
    symbol: "★",
    description: "Inspect objectives and victory progress",
  },
  {
    id: "results",
    label: "Results",
    symbol: "★",
    description: "View current or final scores",
  },
  {
    id: "history",
    label: "History",
    symbol: "☷",
    description: "Review completed game actions",
  },
  {
    id: "archive",
    label: "Archive",
    symbol: "▣",
    description: "Save or load the current game",
  }, 
  {
    id: "new_game",
    label: "New Game",
    symbol: "+",
    description: "Establish a fresh company match",
  },
  {
    id: "main_menu",
    label: "Main Menu",
    symbol: "⌂",
    description: "Return to the game start screen",
  },
  {
    id: "settings",
    label: "Settings",
    symbol: "⚙",
    description: "Accessibility and application preferences",
  },
  {
    id: "keyboard_help",
    label: "Shortcuts",
    symbol: "?",
    description: "View keyboard navigation shortcuts",
  },
  {
    id: "game_help",
    label: "Game Guide",
    symbol: "?",
    description: "Read the in-game rules and interface guide",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    symbol: "◎",
    description: "Learn the game through a guided first turn",
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
  tradeCapacity,
  islandSpaces,
  handCards,
  navalData,
  selectedLocation,
  actionLoading,
  notice,
  industryData,
  preferences,
  shortcutsEnabled,
  tutorialRequested,
  onTutorialRequestConsumed,
  onTutorialCompleted,
  onTutorialSkipped,
  onChangePreferences,
  onOpenMainMenu,
  onSelectLocation,
  onConfirmEndTurn,
  onFestival,
  onExploreNewWorld,
  onOpenWorkshop,
  onFulfillPopulationCard,
  onBuildIndustry,
  onProduceIndustry,
  onBuildNaval,
  onSaveGame,
  onLoadGame,
  onCreateNewGame,
}: Props) {
  const [inspectorOpen, setInspectorOpen] =
    useState(true);

  const [handOpen, setHandOpen] =
    useState(false);

  const [harborOpen, setHarborOpen] =
    useState(false);
  
  const [festivalOpen, setFestivalOpen] = useState(false);
  
  const [explorationOpen, setExplorationOpen] =
    useState(false);

  const [newWorldAtlasOpen, setNewWorldAtlasOpen] =
    useState(false);

  const [objectivesOpen, setObjectivesOpen] =
    useState(false);

  const [objectivesPanelOpen, setObjectivesPanelOpen] =
    useState(false);
 
  const [finalResultsOpen, setFinalResultsOpen] =
    useState(false);

  const [gameHistoryOpen, setGameHistoryOpen] =
    useState(false);

  const [saveLoadOpen, setSaveLoadOpen] =
    useState(false);

  const [newGameOpen, setNewGameOpen] =
    useState(false);
  
  const [preferencesOpen, setPreferencesOpen] =
    useState(false);

  const [keyboardHelpOpen, setKeyboardHelpOpen] =
    useState(false);

  const [gameHelpOpen, setGameHelpOpen] =
    useState(false);
    
  const [tutorialOpen, setTutorialOpen] =
    useState(false);

  const resultsShownForGame = useRef(false);


  const [endTurnDialogOpen, setEndTurnDialogOpen] =
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

  
  const [navalMode, setNavalMode] = useState(false);

  const [navalType, setNavalType] =
    useState<"shipyard" | "ship">("shipyard");

  const [navalTargetId, setNavalTargetId] =
    useState<string | null>(null);

  
  const [lastProduction, setLastProduction] = useState<{
    industryIndex: number;
    industryName: string;
    good: string;
  } | null>(null);


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
    setLastProduction(null);
    setObjectivesOpen(false);
    setNavalMode(false);
    setNavalTargetId(null);
    setNavalType("shipyard");
    setExplorationOpen(false);
    setNewWorldAtlasOpen(false);
    setEndTurnDialogOpen(false);
    setGameHistoryOpen(false);
    setSaveLoadOpen(false);
    setNewGameOpen(false);
    setObjectivesPanelOpen(false);
    setKeyboardHelpOpen(false);
    setGameHelpOpen(false);
    setTutorialOpen(false);
  }, [game?.current_player_index]);
  
  
  /* STEP 105 — OPEN TUTORIAL REQUESTED BY MAIN MENU */
  useEffect(() => {
    if (!tutorialRequested || !game) return;

    // Close existing application overlays.
    setPreferencesOpen(false);
    setKeyboardHelpOpen(false);
    setGameHelpOpen(false);
    setObjectivesPanelOpen(false);
    setFinalResultsOpen(false);
    setGameHistoryOpen(false);
    setSaveLoadOpen(false);
    setNewGameOpen(false);
    setEndTurnDialogOpen(false);
    setFestivalOpen(false);
    setExplorationOpen(false);
    setNewWorldAtlasOpen(false);
    setHarborOpen(false);

    // Reset UI-only placement modes.
    // This does not execute or reverse game actions.
    setConstructionMode(false);
    setProductionMode(false);
    setNavalMode(false);

    // Make sure the tutorial can point to Turn Status.
    setInspectorOpen(true);

    // Start at Lesson 1.
    setTutorialOpen(true);
    setActiveAction("tutorial");

    // Clear the temporary launch request in App.tsx.
    onTutorialRequestConsumed();
  }, [
    tutorialRequested,
    game,
    onTutorialRequestConsumed,
  ]);

/* STEP 94 — PRESENT RESULTS WHEN GAME ENDS */
  useEffect(() => {
    if (!game?.game_over) {
      resultsShownForGame.current = false;
      return;
    }

    if (!resultsShownForGame.current) {
      resultsShownForGame.current = true;
      setFinalResultsOpen(true);
    }
  }, [game?.game_over]);
  
  function openEndTurnDialog() {
    if (!game || game.game_over || actionLoading) {
      return;
    }

    // STEP 101 — OPTIONAL END TURN CONFIRMATION
    if (!preferences.confirmEndTurn) {
      // Submit directly through the existing backend handler.
      // Never advance the player locally.
      void onConfirmEndTurn().catch(error => {
        console.error(
          "End Turn failed:",
          error
        );
      });
      return;
    }

    // Existing Step 93 exclusive confirmation behavior.
    setHarborOpen(false);
    setFestivalOpen(false);
    setExplorationOpen(false);
    setNewWorldAtlasOpen(false);
    setObjectivesPanelOpen(false);
    setHandOpen(false);

    closeConstructionMode();
    closeProductionMode();
    closeNavalMode();

    setEndTurnDialogOpen(true);
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

const navalCandidates = navalMode && navalData
  ? navalData.spaces
      .filter(space =>
        !space.occupied &&
        space.type === (
          navalType === "shipyard" ? "coast" : "sea"
        )
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
    setLastProduction(null);
  }

  function closeProductionMode() {
    setProductionMode(false);
    setSelectedProducerIndex(null);
    setProductionError(null);
    setActiveAction(null);
  }

  async function confirmProduction() {
    if (
      !canProduce ||
      !selectedProducer?.can_produce ||
      selectedProducerIndex === null
    ) {
      return;
    }

    const completed = {
      industryIndex: selectedProducer.index,
      industryName: selectedProducer.name,
      good: selectedProducer.good,
    };

    setIsProducing(true);
    setProductionError(null);

    try {
      await onProduceIndustry(selectedProducerIndex);

      // Show feedback only after backend success.
      setLastProduction(completed);
      closeProductionMode();
    } catch (error) {
      setProductionError(
        error instanceof Error
          ? error.message
          : "Production failed."
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

  function closeNavalMode() {
    setNavalMode(false);
    setNavalType("shipyard");
    setNavalTargetId(null);
    setActiveAction(null);
  }

  function openNavalMode() {
    if (
      !game ||
      !navalData ||
      actionLoading ||
      game.main_action_used ||
      game.game_over
    ) {
      return;
    }

    closeConstructionMode();
    closeProductionMode();
    setHarborOpen(false);
    setHandOpen(false);

    setNavalType("shipyard");
    setNavalTargetId(null);
    setNavalMode(true);
    setActiveAction("naval");
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
    
    if (navalMode) {
      setNavalTargetId(
        navalCandidates.includes(spaceId)
          ? spaceId
          : null
      );
      return;
    }

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
  
  /* STEPS 78–101 — ACTION DOCK DISPATCHER */
  function selectDockAction(id: string) {
    
    if (id === "game_help") {
      if (actionLoading) return;

      setGameHelpOpen(true);
      setActiveAction("game_help");
      return;
    }

    if (id === "keyboard_help") {
      if (actionLoading) return;

      setKeyboardHelpOpen(true);
      return;
    }

    if (!game || actionLoading) return;
    
    // STEP 104 — INTERACTIVE TUTORIAL
    if (id === "tutorial") {
      if (actionLoading) return;

      // Close other panels before opening the tutorial.
      setPreferencesOpen(false);
      setKeyboardHelpOpen(false);
      setGameHelpOpen(false);
      setObjectivesPanelOpen(false);
      setFinalResultsOpen(false);
      setGameHistoryOpen(false);
      setSaveLoadOpen(false);
      setNewGameOpen(false);
      setEndTurnDialogOpen(false);
      setFestivalOpen(false);
      setExplorationOpen(false);
      setNewWorldAtlasOpen(false);
      setHarborOpen(false);
// Ensure the Context Inspector is visible for the tour.
      setInspectorOpen(true);
      setTutorialOpen(true);
      setActiveAction("tutorial");
      return;
    }

    const isSessionAction = sessionActions.has(id);

    if (
      !isSessionAction &&
      (game.main_action_used || game.game_over)
    ) {
      return;
    }

    // STEP 101 — SETTINGS
    if (id === "settings") {
      setPreferencesOpen(true);
      return;
    }

    // STEP 100 — MAIN MENU
    if (id === "main_menu") {
      onOpenMainMenu();
      return;
    }

    // STEP 97 — NEW GAME
    if (id === "new_game") {
      setNewGameOpen(true);
      setActiveAction("new_game");
      return;
    }

    // STEP 96 — SAVE / LOAD
    if (id === "archive") {
      setSaveLoadOpen(true);
      setActiveAction("archive");
      return;
    }

    // STEP 95 — ACTION HISTORY
    if (id === "history") {
      setGameHistoryOpen(true);
      setActiveAction("history");
      return;
    }

    // STEP 94 — RESULTS
    if (id === "results") {
      setFinalResultsOpen(true);
      setActiveAction("results");
      return;
    }

    // STEP 92 — OBJECTIVES
    if (id === "objectives") {
      setObjectivesPanelOpen(true);
      setActiveAction("objectives");
      return;
    }

    // STEP 89 — NEW WORLD ATLAS
    if (id === "world") {
      setNewWorldAtlasOpen(true);
      setActiveAction("world");
      return;
    }

    // STEP 88 — EXPLORATION
    if (id === "explore") {
      setExplorationOpen(true);
      setActiveAction("explore");
      return;
    }

    // STEP 86 — FESTIVAL
    if (id === "festival") {
      setFestivalOpen(true);
      setActiveAction("festival");
      return;
    }

    // STEP 84 — TRADE HARBOR
    if (id === "trade") {
      setHarborOpen(true);
      setActiveAction("trade");
      return;
    }

    // POPULATION CARDS
    if (id === "cards") {
      setHandOpen(value => !value);
      setActiveAction("cards");
      return;
    }

    // STEP 87 — NAVAL CONSTRUCTION
    if (id === "naval") {
      if (navalMode) {
        closeNavalMode();
      } else {
        openNavalMode();
      }
      return;
    }

    // STEP 80 — PRODUCTION
    if (id === "produce") {
      if (productionMode) {
        closeProductionMode();
      } else {
        openProductionMode();
      }
      return;
    }

    // STEP 78 — CONSTRUCTION
    if (id === "build") {
      if (constructionMode) {
        closeConstructionMode();
      } else {
        openConstructionMode();
      }
    }
  }

  /* STEP 102 — BOARD KEYBOARD SHORTCUTS */
  useEffect(() => {
    if (!shortcutsEnabled || !game) {
      return;
    }

    function handleKeyboard(event: KeyboardEvent) {
      if (actionLoading) return;

      // The help dialog handles its own Escape key.
      if (keyboardHelpOpen) return;

      // Never override navigation inside another modal.
      if (
        festivalOpen ||
        explorationOpen ||
        tutorialOpen ||
        newWorldAtlasOpen ||
        objectivesPanelOpen ||
        endTurnDialogOpen ||
        finalResultsOpen ||
        gameHistoryOpen ||
        saveLoadOpen ||
        newGameOpen ||
        preferencesOpen ||
        gameHelpOpen
      ) {
        return;
      }

      // Avoid interrupting a placement or action workflow.
      if (
        constructionMode ||
        productionMode ||
        navalMode ||
        isBuilding ||
        isProducing
      ) {
        return;
      }

      // Protect other modal dialogs that might be
      // rendered by child components.
      if (
        document.querySelector(
          '[role="dialog"][aria-modal="true"]'
        )
      ) {
        return;
      }

      const shortcut = getKeyboardShortcut(event);

      if (!shortcut) return;

      event.preventDefault();

      if (shortcut === "help") {
        setKeyboardHelpOpen(true);
        return;
      }

      // Reuse the existing Action Dock dispatcher.
      // No separate business logic.
      selectDockAction(shortcut);
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  }, [
    shortcutsEnabled,
    game,
    actionLoading,
    keyboardHelpOpen,
    festivalOpen,
    explorationOpen,
    newWorldAtlasOpen,
    objectivesPanelOpen,
    endTurnDialogOpen,
    finalResultsOpen,
    gameHistoryOpen,
    saveLoadOpen,
    newGameOpen,
    preferencesOpen,
    constructionMode,
    productionMode,
    navalMode,
    isBuilding,
    isProducing,
    tutorialOpen,
    selectDockAction,
  ]);

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
                <small>Available production (not stock)</small>

                <div className="immersive-resource-summary">
                  {activePlayer?.industries.some(
                    industry => industry.can_produce
                  ) ? (
                    activePlayer.industries
                      .filter(industry => industry.can_produce)
                      .map(industry => (
                        <ResourceToken
                          key={industry.index}
                          good={industry.good}
                          size="small"
                          status="ready"
                        />
                      ))
                  ) : (
                    <span>No available producers</span>
                  )}
                </div>
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
          data-tutorial="island"
        >
          <div className="immersive-stage-heading">
            <div>
              <span className="immersive-overline">
                YOUR ISLAND
              </span>

              <h2>Industrial Island</h2>
              
            <ContextHelp topic="board" compact />

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
              constructionMode={constructionMode || navalMode}
              candidateSpaceIds={
                navalMode
                  ? navalCandidates
                  : constructionCandidates
              }
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
                  <ContextHelp topic="construction" compact />
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
                      {/* STEP 82 — RESOURCE SOURCE OVERVIEW */}
                      <ResourceDependencyPanel
                        game={game}
                        requirements={requirements}
                        paymentSources={paymentSources}
                      />
                      <div className="construction-payment-section">
                      <div className="context-help-inline-heading">
                        <strong>Resource Payments</strong>
                        <ContextHelp topic="payments" compact />
                      </div>
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
                  <ContextHelp topic="production" compact />
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
                    <ResourceToken
                      good={industry.good}
                      size="small"
                      status={
                        industry.can_produce
                          ? "ready"
                          : "unavailable"
                      }
                    />
                    <small>{industry.can_produce ? "Ready" : "Unavailable"}</small>
                  </button>
                ))}
              </div>
              {selectedProducer && (
                <p className="immersive-production-hint">
                  Selected: <strong>{selectedProducer.name}</strong> → <ResourceToken
                                                                                good={selectedProducer.good}
                                                                                size="small"
                                                                              />
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

          {/* STEP 87 — NAVAL CONSTRUCTION */}
          {navalMode && navalData && (
            <div className="immersive-naval-overlay">
            <div className="context-help-inline-heading">
              <strong>Naval Construction</strong>
              <ContextHelp topic="naval" compact />
            </div>
              <NavalConstructionPanel
                game={game}
                navalData={navalData}
                selectedSpaceId={navalTargetId}
                actionLoading={actionLoading}
                onTypeChange={next => {
                  setNavalType(next);
                  setNavalTargetId(null);
                }}
                onClose={closeNavalMode}
                onBuild={onBuildNaval}
              />
            </div>
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
        {/* STEP 94 — GAME OVER BANNER */}
        {game.game_over && (
          <div className="immersive-game-over-banner">
            <strong>Game Complete</strong>

            <span>
              Final phase: {pretty(game.phase)}
            </span>

            <button
              type="button"
              onClick={() => setFinalResultsOpen(true)}
            >
              View Results
            </button>
          </div>
        )}

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
              
            <div className="context-help-inline-heading">
              <strong>Turn Management</strong>
              <ContextHelp topic="turns" compact />
            </div>

            {/* STEP 93 — TURN STATUS */}
            
            <div data-tutorial="turn">
              <TurnStatus
                game={game}
                actionLoading={actionLoading}
                onEndTurn={openEndTurnDialog}
              />
            </div>
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
            data-tutorial={
              action.id === "build" ||
              action.id === "produce" ||
              action.id === "naval"
                ? action.id
                : undefined
            }
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
            disabled={
              actionLoading ||
              (
                !sessionActions.has(action.id) &&
                (game.main_action_used || game.game_over)
              )
            }
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
          onClick={openEndTurnDialog}
        >
          End Turn
        </button>
      </nav>

      {/* EXPANDABLE POPULATION HAND */}
      
        <section
          className="immersive-hand"
          data-tutorial="population"
        >

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
            <PopulationCardDesk
              key={game.current_player_index}
              game={game}
              tradeCapacity={
                navalData?.naval_capacity.trade ?? null
              }
              cards={handCards}
              actionLoading={actionLoading}
              onFulfill={onFulfillPopulationCard}
            />
          </div>
        )}
      </section>
      
      {/* STEP 81 — PRODUCTION RESULT */}
      {lastProduction && (
        <div
          className="immersive-production-result"
          role="status"
        >
          <button
            type="button"
            className="immersive-production-result-close"
            onClick={() => setLastProduction(null)}
            aria-label="Dismiss production result"
          >
            ×
          </button>

          <strong>Production completed</strong>

          <span>
            {lastProduction.industryName}
            {" "} (#{lastProduction.industryIndex})
          </span>

          <div>
            <ResourceToken good={lastProduction.good} />
          </div>

          <p>
            The engine accepted this action.
            This token represents the output type,
            not an inventory quantity.
          </p>
        </div>
      )}
      {/* STEP 86 — FESTIVAL CONFIRMATION */}
      {festivalOpen && (
        <FestivalDialog
          playerName={activePlayer?.name ?? "Current Player"}
          disabled={
            actionLoading ||
            game.main_action_used ||
            game.game_over
          }
          onConfirm={onFestival}
          onClose={() => {
            setFestivalOpen(false);
            setActiveAction(null);
          }}
        />
      )}
      {/* GAME FEEDBACK */}
      {notice && (
        <div
          className="immersive-notice"
          role="status"
        >
          {notice}
        </div>
      )}
      
      {/* STEP 88 — NEW WORLD EXPLORATION */}
      {explorationOpen && (
        <ExplorationDialog
          playerName={activePlayer?.name ?? "Current Player"}
          explorationCapacity={
            navalData?.naval_capacity.exploration ?? null
          }
          disabled={
            actionLoading ||
            game.main_action_used ||
            game.game_over
          }
          onExplore={onExploreNewWorld}
          onClose={() => {
            setExplorationOpen(false);
            setActiveAction(null);
          }}
        />
      )}
      
      {/* STEP 89 — DISCOVERED NEW WORLD ISLANDS */}
      {newWorldAtlasOpen && (
        <NewWorldAtlas
          islands={activePlayer?.new_world_islands ?? []}
          playerName={activePlayer?.name ?? "Current Player"}
          tradeCapacity={
            navalData?.naval_capacity.trade ?? null
          }
          explorationCapacity={
            navalData?.naval_capacity.exploration ?? null
          }
          canExplore={
            !actionLoading &&
            !game.main_action_used &&
            !game.game_over &&
            (activePlayer?.new_world_islands.length ?? 0) < 4 &&
            (navalData?.naval_capacity.exploration ?? 0) > 0
          }
          onClose={() => {
            setNewWorldAtlasOpen(false);
            setActiveAction(null);
          }}
          onExplore={() => {
            setNewWorldAtlasOpen(false);
            setActiveAction("explore");
            setExplorationOpen(true);
          }}
        />
      )}

      {/* STEP 92 — OBJECTIVES AND VICTORY PROGRESS */}
      {objectivesPanelOpen && (
        <ObjectivesPanel
          game={game}
          onClose={() => {
            setObjectivesPanelOpen(false);
            setActiveAction(null);
          }}
        />
      )}
      
      {/* STEP 93 — END TURN CONFIRMATION */}
      {endTurnDialogOpen && (
        <EndTurnDialog
          playerName={activePlayer?.name ?? "Current Player"}
          round={game.round}
          mainActionUsed={game.main_action_used}
          disabled={actionLoading || game.game_over}
          onConfirm={onConfirmEndTurn}
          onClose={() => {
            setEndTurnDialogOpen(false);
          }}
        />
      )}
      
      {/* STEP 94 — FINAL RESULTS */}
      {finalResultsOpen && (
        <FinalResultsDialog
          game={game}
          onClose={() => {
            setFinalResultsOpen(false);
            setActiveAction(null);
          }}
        />
      )}

      {/* STEP 95 — GAME ACTION HISTORY */}
      {gameHistoryOpen && (
        <GameHistoryPanel
          onClose={() => {
            setGameHistoryOpen(false);
            setActiveAction(null);
          }}
        />
      )}

      {/* STEP 96 — SAVE / LOAD GAME */}
      {saveLoadOpen && (
        <SaveLoadDialog
          onSave={onSaveGame}
          onLoad={onLoadGame}
          onClose={() => {
            setSaveLoadOpen(false);
            setActiveAction(null);
          }}
        />
      )}

      
      {/* STEP 97 — NEW GAME SETUP */}
      {newGameOpen && (
        <NewGameDialog
          currentPlayerNames={
            game.players.map(player => player.name)
          }
          onCreate={onCreateNewGame}
          onClose={() => {
            setNewGameOpen(false);
            setActiveAction(null);
          }}
        />
      )}
      
      {/* STEP 101 — APPLICATION SETTINGS */}
      {preferencesOpen && (
        <PreferencesDialog
          preferences={preferences}
          onChange={onChangePreferences}
          onClose={() => setPreferencesOpen(false)}
        />
      )}

      {/* STEP 102 — KEYBOARD SHORTCUT REFERENCE */}
      {keyboardHelpOpen && (
        <KeyboardShortcutsDialog
          context="board"
          onClose={() => setKeyboardHelpOpen(false)}
        />
      )}

      {/* STEP 103 — FULL GAME HANDBOOK */}
      {gameHelpOpen && (
        <GameHelpDialog
          onClose={() => {
            setGameHelpOpen(false);
            setActiveAction(null);
          }}
        />
      )}

      {/* STEPS 104–105 — GUIDED FIRST TURN */}
      {tutorialOpen && (
        <GameTutorial
          onClose={() => {
            setTutorialOpen(false);
            setActiveAction(null);
            onTutorialSkipped();
          }}
          onComplete={() => {
            setTutorialOpen(false);
            setActiveAction(null);
            onTutorialCompleted();
          }}
        />
      )}

      {/* STEP 84 — MARITIME TRADING DIRECTORY */}
      {harborOpen && (
        <TradeDirectory
          game={game}
          tradeCapacity={tradeCapacity}
          onClose={() => {
            setHarborOpen(false);
            setActiveAction(null);
          }}
          onStartConstruction={() => {
            setHarborOpen(false);
            setActiveAction(null);
            openConstructionMode();
          }}
        />
      )}

    </main>
  );
}
