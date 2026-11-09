
/* STEP 109 — UNIFIED ACTION AVAILABILITY */

export const GAMEPLAY_ACTIONS = [
  "build",
  "produce",
  "naval",
  "festival",
  "explore",
] as const;

export const INSPECTION_ACTIONS = [
  "trade",
  "world",
  "cards",
  "objectives",
  "results",
  "history",
] as const;

export const SESSION_ACTIONS = [
  "archive",
  "new_game",
  "main_menu",
  "settings",
  "keyboard_help",
  "game_help",
  "tutorial",
  "advisor",
] as const;

export type GameplayAction =
  typeof GAMEPLAY_ACTIONS[number];

export type InspectionAction =
  typeof INSPECTION_ACTIONS[number];

export type SessionAction =
  typeof SESSION_ACTIONS[number];

export type ActionId =
  | GameplayAction
  | InspectionAction
  | SessionAction
  | "end_turn";

export type ActionCategory =
  | "gameplay"
  | "inspection"
  | "session"
  | "turn";

export type AvailabilityReason =
  | "available"
  | "no_game"
  | "game_over"
  | "action_loading"
  | "main_action_used"
  | "catalogue_unavailable"
  | "production_busy"
  | "construction_busy"
  | "naval_busy";

export interface ActionAvailability {
  id: ActionId;
  category: ActionCategory;
  enabled: boolean;
  reason: AvailabilityReason;
  explanation: string;
}

export interface ActionAvailabilityContext {
  hasGame: boolean;
  gameOver: boolean;
  mainActionUsed: boolean;
  actionLoading: boolean;

  industryCatalogueLoaded: boolean;
  navalCatalogueLoaded: boolean;

  constructionBusy: boolean;
  productionBusy: boolean;
  navalBusy: boolean;
}

const ALL_ACTIONS: readonly ActionId[] = [
  ...GAMEPLAY_ACTIONS,
  ...INSPECTION_ACTIONS,
  ...SESSION_ACTIONS,
  "end_turn",
];

function categoryFor(
  id: ActionId
): ActionCategory {
  if (
    (GAMEPLAY_ACTIONS as readonly string[])
      .includes(id)
  ) {
    return "gameplay";
  }

  if (
    (INSPECTION_ACTIONS as readonly string[])
      .includes(id)
  ) {
    return "inspection";
  }

  if (id === "end_turn") {
    return "turn";
  }

  return "session";
}

function allowed(
  id: ActionId,
  category: ActionCategory
): ActionAvailability {
  return {
    id,
    category,
    enabled: true,
    reason: "available",
    explanation:
      category === "gameplay"
        ? "This action can be opened for inspection or selection. The backend validates the final request."
        : "This interface is available.",
  };
}

function denied(
  id: ActionId,
  category: ActionCategory,
  reason: AvailabilityReason,
  explanation: string
): ActionAvailability {
  return {
    id,
    category,
    enabled: false,
    reason,
    explanation,
  };
}

/* Resolve availability for one action. */
export function resolveActionAvailability(
  id: ActionId,
  context: ActionAvailabilityContext
): ActionAvailability {
  const category = categoryFor(id);

  if (!context.hasGame) {
    return denied(
      id,
      category,
      "no_game",
      "No active game is loaded."
    );
  }

  if (context.actionLoading) {
    return denied(
      id,
      category,
      "action_loading",
      "Another game operation is in progress."
    );
  }

  /* Read-only and session controls remain available
     after the main action or after game over. */
  if (
    category === "inspection" ||
    category === "session"
  ) {
    return allowed(id, category);
  }

  /* End Turn has separate rules. */
  /* STEP 120 — END TURN AVAILABILITY */

  if (id === "end_turn") {
    if (context.gameOver) {
      return denied(
        id,
        "turn",
        "game_over",
        "The match has ended."
      );
    }

    if (!context.mainActionUsed) {
      return denied(
        id,
        "turn",
        "main_action_used",
        "You must complete a main action before ending your turn."
      );
    }

    return allowed(id, "turn");
  }

  /* Gameplay restrictions */
  if (context.gameOver) {
    return denied(
      id,
      category,
      "game_over",
      "The match has ended."
    );
  }

  if (context.mainActionUsed) {
    return denied(
      id,
      category,
      "main_action_used",
      "The current player's main action has already been used."
    );
  }

  if (
    id === "build" &&
    context.constructionBusy
  ) {
    return denied(
      id,
      category,
      "construction_busy",
      "Construction is already processing."
    );
  }

  if (
    id === "produce" &&
    context.productionBusy
  ) {
    return denied(
      id,
      category,
      "production_busy",
      "Production is already processing."
    );
  }

  if (
    id === "naval" &&
    context.navalBusy
  ) {
    return denied(
      id,
      category,
      "naval_busy",
      "Naval construction is already processing."
    );
  }

  if (
    id === "build" &&
    !context.industryCatalogueLoaded
  ) {
    return denied(
      id,
      category,
      "catalogue_unavailable",
      "The industry catalogue has not loaded."
    );
  }

  if (
    id === "naval" &&
    !context.navalCatalogueLoaded
  ) {
    return denied(
      id,
      category,
      "catalogue_unavailable",
      "The naval construction catalogue has not loaded."
    );
  }

  /* An available frontend control is not proof
     that every possible gameplay request is legal. */
  return allowed(id, category);
}

/* Resolve all known actions once per state snapshot. */
export function resolveAllActionAvailability(
  context: ActionAvailabilityContext
): Record<ActionId, ActionAvailability> {
  return Object.fromEntries(
    ALL_ACTIONS.map(id => [
      id,
      resolveActionAvailability(id, context),
    ])
  ) as Record<ActionId, ActionAvailability>;
}

/* Runtime type guard for Action Dock string IDs. */
export function isActionId(
  value: string
): value is ActionId {
  return (ALL_ACTIONS as readonly string[])
    .includes(value);
}
