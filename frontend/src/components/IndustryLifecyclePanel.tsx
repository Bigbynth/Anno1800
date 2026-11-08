
import type {
  IndustryLifecycleResult,
} from "../industry-lifecycle";

type Props = {
  lifecycle: IndustryLifecycleResult;
};

export function IndustryLifecyclePanel({
  lifecycle,
}: Props) {
  const {
    summary,
    industries,
    selected,
  } = lifecycle;

  return (
    <section
      className="industry-lifecycle-panel"
      aria-label="Industry lifecycle"
    >
      <header className="industry-lifecycle-header">
        <span className="construction-palette-eyebrow">
          INDUSTRIAL OPERATIONS
        </span>

        <h3>Industry Lifecycle</h3>

        <p>
          Workplaces, workforce readiness,
          and production availability.
        </p>
      </header>

      <div className="industry-lifecycle-stats">
        <div>
          <strong>{summary.ready}</strong>
          <span>Ready</span>
        </div>

        <div>
          <strong>{summary.occupied}</strong>
          <span>Occupied</span>
        </div>

        <div>
          <strong>{summary.unavailable}</strong>
          <span>Unavailable</span>
        </div>
      </div>

      <div className="industry-lifecycle-list">
        {industries.map(industry => (
          <div
            key={industry.index}
            className={[
              "industry-lifecycle-item",
              `is-${industry.status}`,
              selected?.index === industry.index
                ? "is-selected"
                : "",
            ].join(" ")}
          >
            <div>
              <strong>{industry.name}</strong>

              <small>
                Produces: {industry.good}
              </small>

              <small>
                Worker: {industry.workerType}
              </small>
            </div>

            <span>
              {industry.status === "ready"
                ? "Ready"
                : industry.status === "occupied"
                  ? "Occupied"
                  : "Unavailable"}
            </span>
          </div>
        ))}

        {industries.length === 0 && (
          <p>No industries owned.</p>
        )}
      </div>

      {selected && (
        <article className="industry-lifecycle-detail">
          <strong>{selected.name}</strong>

          <p>{selected.explanation}</p>

          <p>
            Workplace:{" "}
            {selected.occupied
              ? "Occupied"
              : "Empty"}
          </p>
        </article>
      )}

      <p className="industry-lifecycle-note">
        Produced goods are action-scoped, not
        stored inventory. Workplace occupancy
        and worker availability determine
        whether production can occur again.
      </p>
    </section>
  );
}
