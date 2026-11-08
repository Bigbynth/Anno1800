
/* STEP 113 — NAVAL AND EXPLORATION READINESS */

export type NavalConstructionType =
  | "shipyard"
  | "ship";

export interface NavalSpace {
  id: string;
  type: string;
  occupied: boolean;
}

export interface NavalDefinition {
  id: string;
  name: string;
  strength: number;
  remaining: number;
}

export interface OwnedShipyard {
  index: number;
  name: string;
  strength: number;
}

export interface NavalReadinessInput {
  constructionType: NavalConstructionType;
  selectedSpaceId: string | null;

  spaces: readonly NavalSpace[];
  shipyards: readonly NavalDefinition[];
  ships: readonly NavalDefinition[];
  ownedShipyards: readonly OwnedShipyard[];

  ownedShipCount: number;

  tradeCapacity: number;
  explorationCapacity: number;
  discoveredIslandCount: number;

  actionEnabled: boolean;
  actionExplanation: string;

  gameOver: boolean;
  mainActionUsed: boolean;
}

export interface NavalSpaceReadiness {
  id: string;
  type: string;
  selectable: boolean;
  reason: string;
}

export interface NavalReadinessResult {
  constructionType: NavalConstructionType;

  candidateSpaceIds: string[];
  selectedSpace: NavalSpaceReadiness | null;

  totalSpaces: number;
  candidateSpaces: number;
  occupiedSpaces: number;

  availableShipyardDefinitions: number;
  availableShipDefinitions: number;

  ownedShipyards: readonly OwnedShipyard[];
  ownedShipCount: number;

  actionEnabled: boolean;
  actionExplanation: string;

  warnings: string[];

  exploration: ExplorationReadiness;
}

export interface ExplorationReadiness {
  status: "available" | "blocked";
  canAttempt: boolean;
  capacity: number;
  discoveredIslandCount: number;
  maximumIslands: number;
  reasons: string[];
}

export function analyzeExplorationReadiness(
  input: Pick<
    NavalReadinessInput,
    | "explorationCapacity"
    | "discoveredIslandCount"
    | "gameOver"
    | "mainActionUsed"
  > & {
    actionEnabled?: boolean;
    actionExplanation?: string;
  }
): ExplorationReadiness {
  const MAX_ISLANDS = 4;
  const reasons: string[] = [];

  if (input.gameOver) {
    reasons.push("The game has ended.");
  }

  if (input.mainActionUsed) {
    reasons.push(
      "The current player's main action has already been used."
    );
  }

  if (input.actionEnabled === false) {
    if (
      !input.gameOver &&
      !input.mainActionUsed
    ) {
      reasons.push(
        input.actionExplanation ??
        "The Explore action is unavailable."
      );
    }
  }

  if (input.explorationCapacity <= 0) {
    reasons.push(
      "No available exploration capacity is reported."
    );
  }

  if (
    input.discoveredIslandCount >= MAX_ISLANDS
  ) {
    reasons.push(
      "The player has reached the current exploration limit of four islands."
    );
  }

  return {
    status:
      reasons.length === 0
        ? "available"
        : "blocked",
    canAttempt: reasons.length === 0,
    capacity: input.explorationCapacity,
    discoveredIslandCount:
      input.discoveredIslandCount,
    maximumIslands: MAX_ISLANDS,
    reasons,
  };
}

export function analyzeNavalReadiness(
  input: NavalReadinessInput
): NavalReadinessResult {
  const requiredSpaceType =
    input.constructionType === "shipyard"
      ? "coast"
      : "sea";

  const spaceResults: NavalSpaceReadiness[] =
    input.spaces.map(space => {
      if (space.occupied) {
        return {
          id: space.id,
          type: space.type,
          selectable: false,
          reason:
            "This space is already occupied.",
        };
      }

      if (space.type !== requiredSpaceType) {
        return {
          id: space.id,
          type: space.type,
          selectable: false,
          reason:
            `This construction requires a ${requiredSpaceType} space.`,
        };
      }

      return {
        id: space.id,
        type: space.type,
        selectable: true,
        reason:
          "This location passes the known placement checks. The engine must validate the complete construction.",
      };
    });

  const candidateSpaceIds = spaceResults
    .filter(space => space.selectable)
    .map(space => space.id);

  const selectedSpace =
    input.selectedSpaceId === null
      ? null
      : spaceResults.find(
          space =>
            space.id === input.selectedSpaceId
        ) ?? null;

  const availableShipyardDefinitions =
    input.shipyards.filter(
      definition => definition.remaining > 0
    ).length;

  const availableShipDefinitions =
    input.ships.filter(
      definition => definition.remaining > 0
    ).length;

  const warnings: string[] = [];

  if (candidateSpaceIds.length === 0) {
    warnings.push(
      `No unoccupied ${requiredSpaceType} spaces are currently available.`
    );
  }

  if (
    input.constructionType === "shipyard" &&
    availableShipyardDefinitions === 0
  ) {
    warnings.push(
      "No shipyard definitions report remaining supply."
    );
  }

  if (
    input.constructionType === "ship" &&
    availableShipDefinitions === 0
  ) {
    warnings.push(
      "No ship definitions report remaining supply."
    );
  }

  if (
    input.constructionType === "ship" &&
    input.ownedShipyards.length === 0
  ) {
    warnings.push(
      "No owned shipyard is available to construct ships."
    );
  }

  if (
    input.constructionType === "ship" &&
    input.ownedShipyards.length > 0
  ) {
    warnings.push(
      "A ship must be assigned to an owned shipyard with sufficient strength. Check the selected ship and shipyard before confirming."
    );
  }

  return {
    constructionType:
      input.constructionType,

    candidateSpaceIds,

    selectedSpace,

    totalSpaces: spaceResults.length,
    candidateSpaces: candidateSpaceIds.length,

    occupiedSpaces: spaceResults.filter(
      space => !space.selectable && space.reason.includes("occupied")
    ).length,

    availableShipyardDefinitions,
    availableShipDefinitions,

    ownedShipyards: input.ownedShipyards,
    ownedShipCount: input.ownedShipCount,

    actionEnabled: input.actionEnabled,
    actionExplanation:
      input.actionExplanation,

    warnings,

    exploration: analyzeExplorationReadiness(input),
  };
}
