
/* STEP 110 — CONSTRUCTION PLACEMENT DIAGNOSTICS */

export type PlacementStatus =
  | "candidate"
  | "occupied"
  | "unsupported"
  | "not_eligible";

export interface PlacementSpace {
  id: string;
  type: string;
  occupied: boolean;
}

export interface PlacementResult {
  spaceId: string;
  spaceType: string;
  status: PlacementStatus;
  selectable: boolean;
  reason: string;
  requiresBackendValidation: boolean;
}

export interface PlacementSummary {
  total: number;
  candidates: number;
  occupied: number;
  unsupported: number;
  notEligible: number;
}

export interface PlacementAnalysis {
  results: PlacementResult[];
  summary: PlacementSummary;
}

export interface PlacementAnalysisInput {
  spaces: readonly PlacementSpace[];

  /*
   * The existing frontend candidate list.
   * This is an input, not an independent rules engine.
   */
  candidateSpaceIds: readonly string[];

  /*
   * Optional authoritative engine eligibility data.
   * null means no authoritative list is available.
   */
  authoritativeSpaceIds?: readonly string[] | null;
}

export function analyzeConstructionPlacement(
  input: PlacementAnalysisInput
): PlacementAnalysis {
  const {
    spaces,
    candidateSpaceIds,
    authoritativeSpaceIds = null,
  } = input;

  const candidates = new Set(candidateSpaceIds);

  const authoritative =
    authoritativeSpaceIds === null
      ? null
      : new Set(authoritativeSpaceIds);

  const results: PlacementResult[] =
    spaces.map(space => {
      if (space.occupied) {
        return {
          spaceId: space.id,
          spaceType: space.type,
          status: "occupied",
          selectable: false,
          reason:
            "This space is occupied by an existing structure.",
          requiresBackendValidation: false,
        };
      }

      /*
       * Existing island-industry UI convention:
       * candidate spaces use land or coast.
       *
       * Do not extend this to sea spaces, which
       * are currently handled by Naval Construction.
       */
      if (
        space.type !== "land" &&
        space.type !== "coast"
      ) {
        return {
          spaceId: space.id,
          spaceType: space.type,
          status: "unsupported",
          selectable: false,
          reason:
            "This space is outside the current island-industry placement categories.",
          requiresBackendValidation: false,
        };
      }

      if (!candidates.has(space.id)) {
        return {
          spaceId: space.id,
          spaceType: space.type,
          status: "not_eligible",
          selectable: false,
          reason:
            "This space is not in the current frontend candidate list.",
          requiresBackendValidation: false,
        };
      }

      if (
        authoritative !== null &&
        !authoritative.has(space.id)
      ) {
        return {
          spaceId: space.id,
          spaceType: space.type,
          status: "not_eligible",
          selectable: false,
          reason:
            "The provided engine eligibility list excludes this space.",
          requiresBackendValidation: false,
        };
      }

      return {
        spaceId: space.id,
        spaceType: space.type,
        status: "candidate",
        selectable: true,
        reason:
          authoritative === null
            ? "This space passes current frontend filters. The engine must still validate placement."
            : "This space is listed as eligible. The engine must revalidate it when the action is submitted.",
        requiresBackendValidation: true,
      };
    });

  return {
    results,

    summary: {
      total: results.length,

      candidates: results.filter(
        item => item.status === "candidate"
      ).length,

      occupied: results.filter(
        item => item.status === "occupied"
      ).length,

      unsupported: results.filter(
        item => item.status === "unsupported"
      ).length,

      notEligible: results.filter(
        item => item.status === "not_eligible"
      ).length,
    },
  };
}

export function getSelectablePlacementIds(
  analysis: PlacementAnalysis
): string[] {
  return analysis.results
    .filter(item => item.selectable)
    .map(item => item.spaceId);
}

export function getPlacementResult(
  analysis: PlacementAnalysis,
  spaceId: string | null
): PlacementResult | null {
  if (!spaceId) return null;

  return (
    analysis.results.find(
      item => item.spaceId === spaceId
    ) ?? null
  );
}
