
/* STEP 107 — CONTEXT-AWARE ACTION ADVISOR */

import type {
  GameSnapshot,
  IndustryCatalogueSnapshot,
  NavalCatalogueSnapshot,
} from "./types";

import type {
  ActionAvailability,
  ActionId,
} from "./action-availability";

export type AdvisorActionId =
  | "build"
  | "produce"
  | "naval"
  | "explore"
  | "population"
  | "objectives"
  | "end_turn";

export type AdvisorStatus =
  | "available"
  | "unavailable"
  | "informational";

export interface AdvisorRecommendation {
  id: AdvisorActionId;
  title: string;
  status: AdvisorStatus;
  reason: string;
  suggestion: string;
  priority: number;
  actionId: string | null;
}

export interface AdvisorInput {
  game: GameSnapshot;
  availability: Record<ActionId, ActionAvailability>;
  industryData: IndustryCatalogueSnapshot | null;
  navalData: NavalCatalogueSnapshot | null;
  handCardCount: number;
  emptyLandOrCoastCount: number;
  actionLoading: boolean;
}

export function getActionRecommendations(
  input: AdvisorInput
): AdvisorRecommendation[] {
  const {
    game,
    industryData,
    navalData,
    handCardCount,
    emptyLandOrCoastCount,
    actionLoading,
    availability,
  } = input;

  const player =
    game.players[game.current_player_index];

  const producers = player?.industries ?? []; 

  const readyProducers =
    producers.filter(
      industry => industry.can_produce
    );

  const mainActionBlocked =
    game.main_action_used ||
    game.game_over ||
    actionLoading;

  function blockedReason(): string {
    if (actionLoading) {
      return "Another game action is currently processing.";
    }

    if (game.game_over) {
      return "The match has ended.";
    }

    if (game.main_action_used) {
      return "The current player's main action has already been used.";
    }

    return "";
  }

  const recommendations: AdvisorRecommendation[] = [];

  /* INDUSTRY CONSTRUCTION */

  const hasBuildCandidates =
    (industryData?.industries ?? []).some(
      industry =>
        industry.remaining > 0 &&
        !industry.already_owned
    );

  const canInspectBuild =
    !mainActionBlocked &&
    industryData !== null;

  recommendations.push({
    id: "build",
    title: "Construct an Industry",
    status: canInspectBuild
      ? "available"
      : "unavailable",
    reason: mainActionBlocked
      ? blockedReason()
      : industryData === null
        ? "Industry catalogue is not loaded."
        : !hasBuildCandidates
          ? "No unowned industry with remaining supply is listed."
          : emptyLandOrCoastCount === 0
            ? "No empty land or coast spaces are shown."
            : "The Construction Palette can be inspected.",
    suggestion:
      canInspectBuild && hasBuildCandidates
        ? "Open Build and check the industry requirements and eligible placement spaces."
        : "Review the existing industries, spaces, and turn status.",
    priority:
      canInspectBuild &&
      hasBuildCandidates &&
      emptyLandOrCoastCount > 0
        ? 80
        : 30,
    actionId: "build",
  });

  /* INDUSTRIAL PRODUCTION */

  const canInspectProduction =
    !mainActionBlocked;

  recommendations.push({
    id: "produce",
    title: "Produce Goods",
    status: canInspectProduction &&
      readyProducers.length > 0
        ? "available"
        : "unavailable",
    reason: mainActionBlocked
      ? blockedReason()
      : readyProducers.length === 0
        ? "No owned producer currently reports that it can produce."
        : `${readyProducers.length} owned producer(s) report production availability.`,
    suggestion: readyProducers.length > 0
      ? "Open Produce, select an eligible industry, and check its output."
      : "Inspect owned industries or consider future construction.",
    priority:
      canInspectProduction &&
      readyProducers.length > 0
        ? 90
        : 20,
    actionId: "produce",
  });

  /* NAVAL CONSTRUCTION */

  const canInspectNaval =
    !mainActionBlocked &&
    navalData !== null;

  recommendations.push({
    id: "naval",
    title: "Naval Construction",
    status: canInspectNaval
      ? "available"
      : "unavailable",
    reason: mainActionBlocked
      ? blockedReason()
      : navalData === null
        ? "Naval catalogue is not loaded."
        : "The naval construction catalogue is available for inspection.",
    suggestion: canInspectNaval
      ? "Open Naval to review ships, shipyards, costs and placement candidates."
      : "Review naval capacity and the current turn status.",
    priority: canInspectNaval ? 60 : 15,
    actionId: "naval",
  });

  /* NEW WORLD EXPLORATION */

  const explorationCapacity =
    navalData?.naval_capacity.exploration ?? 0;

  const discoveredIslands =
    player?.new_world_islands?.length ?? 0;

  // This threshold reflects the existing UI guard
  // from Step 89, not an independent rules decision.
  const explorationSlotsAvailable =
    discoveredIslands < 4;

  const canInspectExploration =
    !mainActionBlocked;

  const canSuggestExploration =
    canInspectExploration &&
    explorationCapacity > 0 &&
    explorationSlotsAvailable;

  recommendations.push({
    id: "explore",
    title: "Explore the New World",
    status: canSuggestExploration
      ? "available"
      : "unavailable",
    reason: mainActionBlocked
      ? blockedReason()
      : navalData === null
        ? "Exploration capacity is not available."
        : explorationCapacity <= 0
          ? "No available Exploration capacity is reported."
          : !explorationSlotsAvailable
            ? "The current frontend island limit has been reached."
            : "Exploration capacity is reported as available.",
    suggestion: canSuggestExploration
      ? "Open Explore to review and request an expedition."
      : "Inspect naval capacity and discovered islands.",
    priority: canSuggestExploration ? 70 : 10,
    actionId: "explore",
  });

  /* POPULATION CARDS */

  recommendations.push({
    id: "population",
    title: "Review Population Cards",
    status: "informational",
    reason:
      handCardCount > 0
        ? `${handCardCount} Population Card(s) in hand.`
        : "There are no cards in the current displayed hand.",
    suggestion:
      handCardCount > 0
        ? "Inspect card requirements and permitted payment sources."
        : "Review the population system in the Game Guide.",
    priority: handCardCount > 0 ? 75 : 10,
    actionId: "cards",
  });

  /* OBJECTIVES */

  recommendations.push({
    id: "objectives",
    title: "Review Victory Objectives",
    status: "informational",
    reason:
      "The Objectives panel displays the current scoring information returned by the engine.",
    suggestion:
      "Check objectives before committing resources to a main action.",
    priority: 50,
    actionId: "objectives",
  });

  /* TURN MANAGEMENT */

  recommendations.push({
    id: "end_turn",
    title: "End the Current Turn",
    status:
      game.game_over || actionLoading
        ? "unavailable"
        : "informational",
    reason:
      game.game_over
        ? "The match has ended."
        : actionLoading
          ? "An action is currently processing."
          : game.main_action_used
            ? "The main action has been used. You may be ready to end the turn."
            : "The main action is still available.",
    suggestion:
      game.main_action_used
        ? "Review remaining information, then use End Turn when ready."
        : "Consider whether to use the available main action before ending the turn.",
    priority:
      game.main_action_used && !game.game_over
        ? 95
        : 5,
    actionId: null,
  });

  
/* STEP 109 — MATCH SHARED FRONTEND AVAILABILITY */

const reconciled = recommendations.map(item => {
  // Turn management does not open through
  // the regular Action Dock dispatcher.
  if (item.id === "end_turn") {
    const turn = availability.end_turn;

    return {
      ...item,
      status: turn.enabled
        ? item.status
        : "unavailable" as const,
      reason: turn.enabled
        ? item.reason
        : turn.explanation,
    };
  }

  if (!item.actionId) {
    return item;
  }

  const actionId = item.actionId as ActionId;
  const control = availability[actionId];

  if (!control) {
    return {
      ...item,
      status: "unavailable" as const,
      reason: "No matching interface action is registered.",
      actionId: null,
    };
  }

  if (!control.enabled) {
    return {
      ...item,
      status: "unavailable" as const,
      reason: control.explanation,
      actionId: null,
    };
  }

  // Inspecting a panel and performing an actual
  // gameplay action are different capabilities.
  if (
    item.status === "unavailable" &&
    control.category === "gameplay"
  ) {
    return {
      ...item,
      status: "available" as const,
      reason:
        "The action panel can open. Specific requirements " +
        "must still be checked before submitting.",
    };
  }

  return item;
});

return reconciled.sort(
  (a, b) => b.priority - a.priority
);

}
