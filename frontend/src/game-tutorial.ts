
/* STEP 104 — FIRST TURN TUTORIAL DEFINITIONS */

export type TutorialStepId =
  | "island"
  | "construction"
  | "production"
  | "population"
  | "naval"
  | "turn";


/* STEP 106 — OBSERVABLE TUTORIAL INTERACTIONS */

export type TutorialInteraction =
  | "space_selected"
  | "construction_opened"
  | "production_opened"
  | "population_opened"
  | "naval_opened";


export interface TutorialMilestone {
  id: string;
  label: string;
  interaction: TutorialInteraction | null;
}

export const TUTORIAL_MILESTONES: Record<
  TutorialStepId,
  readonly TutorialMilestone[]
> = {
  island: [
    {
      id: "island-select",
      label: "Select a space on your island",
      interaction: "space_selected",
    },
  ],

  construction: [
    {
      id: "construction-open",
      label: "Open the Construction Palette",
      interaction: "construction_opened",
    },
  ],

  production: [
    {
      id: "production-open",
      label: "Open the Production panel",
      interaction: "production_opened",
    },
  ],

  population: [
    {
      id: "population-open",
      label: "Open your Population Cards",
      interaction: "population_opened",
    },
  ],

  naval: [
    {
      id: "naval-open",
      label: "Open Naval Construction",
      interaction: "naval_opened",
    },
  ],

  turn: [
    {
      id: "turn-review",
      label: "Review Turn Status and End Turn",
      interaction: null,
    },
  ],
};


export interface TutorialInteractionEvent {
  id: TutorialInteraction;
  sequence: number;
}


export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  subtitle: string;
  description: string;
  instructions: readonly string[];
  target: string;
  actionLabel: string;
}

export const GAME_TUTORIAL_STEPS:
  readonly TutorialStep[] = [
  {
    id: "island",
    title: "Explore Your Island",
    subtitle: "THE WORLD BEFORE YOU",
    description:
      "Your island contains construction spaces. " +
      "Some spaces may already be occupied.",
    instructions: [
      "Inspect the central island board.",
      "Select a space to see its details.",
      "Use the Context Inspector to identify its state.",
    ],
    target: "island",
    actionLabel: "Next: Construction",
  },
  {
    id: "construction",
    title: "Construct an Industry",
    subtitle: "THE INDUSTRIAL FOUNDATION",
    description:
      "Industries are constructed using eligible " +
      "board spaces and required goods.",
    instructions: [
      "Find the Build action in the Action Dock.",
      "Open the Construction Palette when available.",
      "Inspect construction costs and payment sources.",
      "The engine validates the final construction.",
    ],
    target: "build",
    actionLabel: "Next: Production",
  },
  {
    id: "production",
    title: "Understand Production",
    subtitle: "THE ENGINE OF INDUSTRY",
    description:
      "Owned industries can produce goods when " +
      "the backend reports that they are available.",
    instructions: [
      "Locate the Produce action.",
      "Inspect the active player's producers.",
      "Select a producer when the current turn allows it.",
      "Goods shown in the UI are output types, not inventory counts.",
    ],
    target: "produce",
    actionLabel: "Next: Population",
  },
  {
    id: "population",
    title: "Fulfill Population Cards",
    subtitle: "THE GROWING CITY",
    description:
      "Population Cards require specific goods " +
      "and can contribute Victory Points.",
    instructions: [
      "Open your Population Cards.",
      "Inspect a card's required goods.",
      "Review local production and permitted trading sources.",
      "New World sources may become available after exploration.",
    ],
    target: "population",
    actionLabel: "Next: Naval Systems",
  },
  {
    id: "naval",
    title: "Discover Naval Systems",
    subtitle: "THE AGE OF EXPLORATION",
    description:
      "Shipyards, ships and naval-token capacity " +
      "support maritime development.",
    instructions: [
      "Locate the Naval action.",
      "Inspect available Trade and Exploration capacity.",
      "Review shipyard and ship construction requirements.",
      "The engine decides whether a naval action is legal.",
    ],
    target: "naval",
    actionLabel: "Next: Turn Management",
  },
  {
    id: "turn",
    title: "Manage Your Turn",
    subtitle: "THE COMPANY'S DECISION",
    description:
      "The Turn Status panel identifies the active " +
      "company, round and main-action availability.",
    instructions: [
      "Find the Turn Status panel.",
      "Check whether your main action has been used.",
      "Locate End Turn.",
      "End Turn advances the game only after backend validation.",
    ],
    target: "turn",
    actionLabel: "Finish Tutorial",
  },
];
