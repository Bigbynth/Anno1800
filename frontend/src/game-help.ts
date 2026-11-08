
/* STEP 103 — CONTEXTUAL GAME HELP */

export type GameHelpTopic =
  | "board"
  | "construction"
  | "production"
  | "payments"
  | "trade"
  | "naval"
  | "exploration"
  | "new_world"
  | "population"
  | "objectives"
  | "turns"
  | "history"
  | "save_load";

export interface GameHelpEntry {
  id: GameHelpTopic;
  category: string;
  title: string;
  description: string;
  tips: readonly string[];
}

export const GAME_HELP: Record<
  GameHelpTopic,
  GameHelpEntry
> = {
  board: {
    id: "board",
    category: "Navigation",
    title: "Island Board",
    description:
      "The island displays available and occupied construction spaces. Select a space to inspect it.",
    tips: [
      "The Context Inspector shows information about the selected space.",
      "Construction mode highlights candidate locations.",
      "Highlighted locations are candidates, not guaranteed legal placements. The engine validates construction.",
    ],
  },

  construction: {
    id: "construction",
    category: "Industry",
    title: "Industry Construction",
    description:
      "Construct industries using the available industry catalogue, a suitable island space, and the required goods.",
    tips: [
      "Select an industry in the Construction Palette.",
      "Choose a highlighted candidate location.",
      "Assign every required resource to a payment source.",
      "The backend validates costs, ownership, and placement before construction succeeds.",
    ],
  },

  production: {
    id: "production",
    category: "Industry",
    title: "Industrial Production",
    description:
      "Select an industry belonging to the active player and request production of its output good.",
    tips: [
      "A producer marked Available can be selected.",
      "The output icon identifies the kind of good, not an inventory quantity.",
      "A selected island space is not automatically mapped to a producer index in the current frontend.",
      "The Python engine determines whether production succeeds.",
    ],
  },

  payments: {
    id: "payments",
    category: "Resources",
    title: "Resource Payments",
    description:
      "Construction and Population Cards require goods. Select permitted sources to satisfy their requirements.",
    tips: [
      "Local production uses an available owned producer.",
      "Trading uses an eligible industry from another player.",
      "New World resources may be available for Population Card fulfillment after exploration.",
      "The same local producer cannot satisfy two requirements in one payment selection.",
      "A complete frontend selection is still subject to backend validation.",
    ],
  },

  trade: {
    id: "trade",
    category: "Maritime",
    title: "Trading Harbor",
    description:
      "The Trading Harbor helps locate goods produced by other companies.",
    tips: [
      "Inspect available trading partners and their industries.",
      "Trade capacity comes from the naval catalogue.",
      "A partner appearing in the directory does not guarantee that a particular payment is legal.",
      "Trading and New World shipping may draw on the same available Trade-token capacity.",
    ],
  },

  naval: {
    id: "naval",
    category: "Maritime",
    title: "Naval Construction & Capacity",
    description:
      "Naval construction manages shipyards and ships. The naval catalogue reports available Trade and Exploration capacity.",
    tips: [
      "Shipyards and ships have different construction requirements.",
      "Candidate placement spaces depend on the selected naval construction type.",
      "Capacity values should be refreshed after successful relevant game actions.",
      "The engine determines naval-token availability and valid construction.",
    ],
  },

  exploration: {
    id: "exploration",
    category: "New World",
    title: "New World Exploration",
    description:
      "Exploration allows a company to discover New World islands when the game rules permit it.",
    tips: [
      "Available Exploration tokens are displayed in the naval catalogue.",
      "Discovered islands appear in the New World Atlas.",
      "The exploration action is validated by the Python engine.",
    ],
  },

  new_world: {
    id: "new_world",
    category: "New World",
    title: "New World Atlas",
    description:
      "The Atlas displays islands discovered by the active company and their available resource types.",
    tips: [
      "The Atlas does not generate resources when opened.",
      "New World resources may be selectable as Population Card payment sources.",
      "Selecting a New World shipment requires Trade-token capacity.",
      "The backend decides whether a shipment can be completed.",
    ],
  },

  population: {
    id: "population",
    category: "Population",
    title: "Population Cards",
    description:
      "Population Cards contain required goods and may award victory points when fulfilled.",
    tips: [
      "Select a card from your hand.",
      "Assign all required goods through permitted payment sources.",
      "Check for duplicate local producers and shipping requirements.",
      "Fulfill the card through the backend once the requirements are assigned.",
    ],
  },

  objectives: {
    id: "objectives",
    category: "Victory",
    title: "Objectives & Victory Progress",
    description:
      "Active scoring objectives and current victory-point information come from the engine's scoring system.",
    tips: [
      "Open Objectives to inspect the active scoring conditions.",
      "Current score previews are not necessarily final results.",
      "Equal reported scores do not imply an engine-confirmed tie-break result.",
    ],
  },

  turns: {
    id: "turns",
    category: "Turn Management",
    title: "Turns & Action Economy",
    description:
      "The turn-status panel reports the active player, current round, phase, and whether the main action has been used.",
    tips: [
      "An available main action may be used before ending your turn.",
      "End Turn asks for confirmation unless disabled in Settings.",
      "The engine determines the next player, round, and phase.",
      "Some read-only menus remain available after the main action is used.",
    ],
  },

  history: {
    id: "history",
    category: "Session",
    title: "Game History",
    description:
      "The game journal displays successful actions recorded by the FastAPI server.",
    tips: [
      "History entries are recorded after backend actions succeed.",
      "Rejected actions are not added to the journal.",
      "The current implementation retains up to 500 entries.",
      "History is not an undo or replay system.",
    ],
  },

  save_load: {
    id: "save_load",
    category: "Session",
    title: "Save & Load",
    description:
      "Save the current match to one of three local slots, or restore a previously saved match.",
    tips: [
      "Saving an occupied slot overwrites its checkpoint after confirmation.",
      "Loading replaces the active in-memory game.",
      "Save files may be incompatible after engine changes.",
      "New Game does not delete existing save slots.",
    ],
  },
};

export const GAME_HELP_TOPICS =
  Object.values(GAME_HELP);
