
import type {
  ConstructionReadinessResult,
} from "../construction-readiness";

type Props = {
  readiness: ConstructionReadinessResult;
};

const STATUS_LABELS = {
  blocked: "Action Blocked",
  incomplete: "Complete Required Selections",
  ready_for_backend: "Ready for Engine Validation",
} as const;

export function ConstructionReadinessPanel({
  readiness,
}: Props) {
  const {
    status,
    industryName,
    requiredCount,
    assignedCount,
    missingCount,
    resources,
    blockers,
    warnings,
  } = readiness;

  const percentage =
    requiredCount === 0
      ? 100
      : Math.round(
          (assignedCount / requiredCount) * 100
        );

  return (
    <section
      className={[
        "construction-readiness",
        `is-${status}`,
      ].join(" ")}
      aria-label="Construction readiness"
    >
      <header className="construction-readiness-header">
        <div>
          <span className="construction-palette-eyebrow">
            THE INDUSTRIAL PLANNING OFFICE
          </span>

          <h3>Construction Readiness</h3>
        </div>

        <strong className="construction-readiness-status">
          {STATUS_LABELS[status]}
        </strong>
      </header>

      {industryName && (
        <p className="construction-readiness-industry">
          Selected: <strong>{industryName}</strong>
        </p>
      )}

      <div className="construction-readiness-progress">
        <div>
          <span>Resource Assignments</span>

          <strong>
            {assignedCount} / {requiredCount}
          </strong>
        </div>

        <div
          className="construction-readiness-track"
          role="progressbar"
          aria-label="Resource assignment progress"
          aria-valuenow={assignedCount}
          aria-valuemin={0}
          aria-valuemax={requiredCount}
        >
          <div
            className="construction-readiness-fill"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>

      <div className="construction-readiness-resources">
        {resources.map(resource => (
          <div
            key={resource.good}
            className="construction-readiness-resource"
          >
            <div className="construction-readiness-resource-main">
              <strong>{resource.good}</strong>

              <span>
                {resource.assigned}
                {" / "}
                {resource.required} assigned
              </span>
            </div>

            <small>
              {resource.missing === 0
                ? "All required sources selected"
                : `${resource.missing} assignment(s) missing`}
            </small>

            <small>
              Available local producers reporting readiness:
              {" "}{resource.readyLocalProducers}
            </small>
          </div>
        ))}

        {resources.length === 0 && industryName && (
          <p>
            No resource requirements are currently
            listed for this construction.
          </p>
        )}
      </div>

      {blockers.length > 0 && (
        <div className="construction-readiness-blockers">
          <strong>Known Blockers</strong>

          <ul>
            {blockers.map((blocker, index) => (
              <li key={index}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="construction-readiness-warnings">
          <strong>
            {missingCount > 0
              ? "Next Steps"
              : "Validation Notes"}
          </strong>

          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="construction-readiness-footer">
        {readiness.canSubmit
          ? "The request can be submitted. Final legality is determined by the backend."
          : "Resolve known blockers and complete the required selections before submitting."}
      </footer>
    </section>
  );
}
