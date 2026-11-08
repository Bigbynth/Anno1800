
import { useState } from "react";

import type {
  PlacementAnalysis,
  PlacementResult,
} from "../construction-placement";

type Props = {
  industryName: string;
  analysis: PlacementAnalysis;
  inspectedSpace: PlacementResult | null;
  onInspectSpace: (spaceId: string) => void;
};

const STATUS_LABELS = {
  candidate: "Candidate",
  occupied: "Occupied",
  unsupported: "Unsupported Space",
  not_eligible: "Not Eligible",
} as const;

export function ConstructionPlacementInspector({
  industryName,
  analysis,
  inspectedSpace,
  onInspectSpace,
}: Props) {
  const [showAllSpaces, setShowAllSpaces] =
    useState(false);

  const { summary, results } = analysis;

  const visibleSpaces = showAllSpaces
    ? results
    : results.slice(0, 8);

  return (
    <section
      className="construction-placement-inspector"
      aria-label="Construction placement inspector"
    >
      <header className="construction-placement-header">
        <div>
          <span className="construction-palette-eyebrow">
            THE INDUSTRIAL PLANNING OFFICE
          </span>

          <h3>Placement Inspector</h3>

          <p>{industryName}</p>
        </div>
      </header>

      <div className="construction-placement-summary">
        <div>
          <strong>{summary.candidates}</strong>
          <span>Candidates</span>
        </div>

        <div>
          <strong>{summary.occupied}</strong>
          <span>Occupied</span>
        </div>

        <div>
          <strong>
            {summary.unsupported +
              summary.notEligible}
          </strong>
          <span>Other</span>
        </div>
      </div>

      {inspectedSpace ? (
        <article
          className={[
            "construction-placement-detail",
            `is-${inspectedSpace.status}`,
          ].join(" ")}
        >
          <div className="construction-placement-detail-heading">
            <strong>
              Space {inspectedSpace.spaceId}
            </strong>

            <span>
              {STATUS_LABELS[inspectedSpace.status]}
            </span>
          </div>

          <p>
            Region: {inspectedSpace.spaceType}
          </p>

          <p>{inspectedSpace.reason}</p>

          {inspectedSpace.selectable && (
            <small>
              This is a placement candidate, not a
              confirmed legal construction.
            </small>
          )}
        </article>
      ) : (
        <p className="construction-placement-instruction">
          Select a space on the island to inspect
          its construction eligibility.
        </p>
      )}

      <div className="construction-placement-list">
        <div className="construction-placement-list-heading">
          <strong>Island Spaces</strong>

          <span>{summary.total} total</span>
        </div>

        {visibleSpaces.map(space => (
          <button
            key={space.spaceId}
            type="button"
            className={[
              "construction-placement-space",
              `is-${space.status}`,
              inspectedSpace?.spaceId === space.spaceId
                ? "is-selected"
                : "",
            ].join(" ")}
            onClick={() =>
              onInspectSpace(space.spaceId)
            }
          >
            <span>
              <strong>{space.spaceId}</strong>
              <small>{space.spaceType}</small>
            </span>

            <small>
              {STATUS_LABELS[space.status]}
            </small>
          </button>
        ))}
      </div>

      {results.length > 8 && (
        <button
          type="button"
          className="construction-placement-show-all"
          onClick={() =>
            setShowAllSpaces(value => !value)
          }
        >
          {showAllSpaces
            ? "Show Fewer Spaces"
            : `Show All ${results.length} Spaces`}
        </button>
      )}

      <p className="construction-placement-disclaimer">
        Placement diagnostics describe current
        frontend information. The Python engine
        validates construction when submitted.
      </p>
    </section>
  );
}
