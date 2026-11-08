
import type {
  ProductionReadinessResult,
} from "../production-readiness";

type Props = {
  readiness: ProductionReadinessResult;
  onSelectProducer?: (index: number) => void;
};

export function ProductionReadinessPanel({
  readiness,
  onSelectProducer,
}: Props) {
  const {
    summary,
    producers,
    selected,
    actionEnabled,
    actionExplanation,
  } = readiness;

  return (
    <section
      className="production-readiness-panel"
      aria-label="Production readiness inspector"
    >
      <header className="production-readiness-header">
        <div>
          <span className="construction-palette-eyebrow">
            THE INDUSTRIAL OPERATIONS OFFICE
          </span>

          <h3>Production Inspector</h3>

          <p>
            Review the current status of your
            owned industries.
          </p>
        </div>
      </header>

      <div className="production-readiness-summary">
        <div>
          <strong>{summary.total}</strong>
          <span>Owned</span>
        </div>

        <div>
          <strong>{summary.ready}</strong>
          <span>Ready</span>
        </div>

        <div>
          <strong>{summary.notReady}</strong>
          <span>Not ready</span>
        </div>
      </div>

      {!actionEnabled && (
        <div className="production-readiness-warning">
          <strong>Production Action Unavailable</strong>
          <p>{actionExplanation}</p>
        </div>
      )}

      <div className="production-readiness-list">
        {producers.map(producer => (
          <button
            key={producer.index}
            type="button"
            className={[
              "production-readiness-item",
              producer.status === "ready"
                ? "is-ready"
                : "is-not-ready",
              selected?.index === producer.index
                ? "is-selected"
                : "",
            ].join(" ")}
            disabled={!onSelectProducer}
            aria-pressed={
              selected?.index === producer.index
            }
            onClick={() =>
              onSelectProducer?.(producer.index)
            }
          >
            <span className="production-readiness-item-main">
              <strong>{producer.name}</strong>
              <small>Produces: {producer.good}</small>
            </span>

            <span className="production-readiness-badge">
              {producer.status === "ready"
                ? "Ready"
                : "Not Ready"}
            </span>
          </button>
        ))}

        {producers.length === 0 && (
          <div className="production-readiness-empty">
            No owned industries are listed for
            the current player.
          </div>
        )}
      </div>

      {selected && (
        <article className="production-readiness-detail">
          <h4>{selected.name}</h4>

          <p>
            Output good: <strong>{selected.good}</strong>
          </p>

          <p>{selected.explanation}</p>

          {selected.status === "ready" &&
            !actionEnabled && (
              <p>
                This producer reports readiness,
                but the Produce action cannot be
                opened in the current turn state.
              </p>
            )}
        </article>
      )}

      <p className="production-readiness-disclaimer">
        Readiness comes from the game snapshot.
        The Python engine validates the final
        production request.
      </p>
    </section>
  );
}
