
/* STEP 107 — COMPANY ACTION ADVISOR */

import { useState } from "react";

import type {
  AdvisorRecommendation,
  AdvisorStatus,
} from "../action-advisor";

import type {
  ConstructionReadinessResult,
} from "../construction-readiness";

type Props = {
  recommendations: AdvisorRecommendation[];
    constructionReadiness?: ConstructionReadinessResult | null;
  onSelectAction: (actionId: string) => void;
  disabled?: boolean;
  onClose: () => void;
};

const STATUS_LABELS: Record<
  AdvisorStatus,
  string
> = {
  available: "Available to inspect",
  unavailable: "Unavailable",
  informational: "Informational",
};

export function ActionAdvisor({
  recommendations,
  constructionReadiness = null,
  onSelectAction,
  disabled = false,
  onClose,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const visible = showAll
    ? recommendations
    : recommendations.slice(0, 4);

  const availableCount =
    recommendations.filter(
      item => item.status === "available"
    ).length;

  return (
    <section
      className="action-advisor-panel"
      aria-label="Company action advisor"
    >
      <header className="action-advisor-header">
        <div>
          <span className="construction-palette-eyebrow">
            THE COMPANY ADVISOR
          </span>

          <h2>Your Next Move</h2>

          <p>
            Recommendations based on the current
            game snapshot.
          </p>
        </div>

        <button
          type="button"
          aria-label="Close Action Advisor"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="action-advisor-summary">
        <strong>
          {availableCount}
        </strong>

        <span>
          gameplay panel(s) available to inspect
        </span>
      </div>
        {/* STEP 108 — SELECTED CONSTRUCTION READINESS */}
        {constructionReadiness?.industryName && (
        <div className="action-advisor-readiness">
            <strong>Selected Construction</strong>

            <span>
            {constructionReadiness.industryName}
            </span>

            <small>
            Resources assigned:
            {" "}
            {constructionReadiness.assignedCount}
            {" / "}
            {constructionReadiness.requiredCount}
            </small>

            <small>
            {constructionReadiness.status ===
            "ready_for_backend"
                ? "Ready for backend validation"
                : constructionReadiness.status ===
                "blocked"
                ? "Known blockers must be resolved"
                : "Additional selections required"}
            </small>

            {constructionReadiness.blockers.map(
            (blocker, index) => (
                <p key={index}>{blocker}</p>
            )
            )}
        </div>
        )}

      <div className="action-advisor-list">
        {visible.map(item => (
          <article
            key={item.id}
            className={[
              "action-advisor-item",
              `is-${item.status}`,
            ].join(" ")}
          >
            <div className="action-advisor-item-heading">
              <h3>{item.title}</h3>

              <span className="action-advisor-status">
                {STATUS_LABELS[item.status]}
              </span>
            </div>

            <p>{item.reason}</p>

            <div className="action-advisor-suggestion">
              <strong>Consider</strong>
              <span>{item.suggestion}</span>
            </div>

            {item.actionId && (
              <button
                type="button"
                className="action-advisor-open"
                disabled={disabled}
                onClick={() => {
                  onSelectAction(item.actionId!);
                  onClose();
                }}
              >
                {item.status === "informational"
                  ? "Open Information"
                  : "Open Action"}
              </button>
            )}
          </article>
        ))}
      </div>

      {recommendations.length > 4 && (
        <button
          type="button"
          className="action-advisor-show-more"
          onClick={() =>
            setShowAll(value => !value)
          }
        >
          {showAll
            ? "Show Fewer Recommendations"
            : `Show All ${recommendations.length} Recommendations`}
        </button>
      )}

      <p className="action-advisor-disclaimer">
        Availability describes frontend controls.
        The Python engine remains responsible for
        validating every gameplay action.
      </p>
    </section>
  );
}
