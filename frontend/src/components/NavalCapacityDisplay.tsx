
type Props = {
  tradeCapacity?: number | null;
  explorationCapacity?: number | null;
  requiredTrade?: number;
  compact?: boolean;
};

export function NavalCapacityDisplay({
  tradeCapacity = null,
  explorationCapacity = null,
  requiredTrade = 0,
  compact = false,
}: Props) {
  const tradeKnown =
    typeof tradeCapacity === "number" &&
    Number.isFinite(tradeCapacity);

  const explorationKnown =
    typeof explorationCapacity === "number" &&
    Number.isFinite(explorationCapacity);

  const insufficient =
    tradeKnown &&
    requiredTrade > tradeCapacity;

  const usagePercent =
    tradeKnown && tradeCapacity > 0
      ? Math.min(
          100,
          (requiredTrade / tradeCapacity) * 100
        )
      : 0;

  return (
    <section
      className={[
        "naval-capacity-display",
        compact ? "naval-capacity--compact" : "",
      ].join(" ")}
      aria-label="Available naval capacity"
    >
      <div className="naval-capacity-heading">
        <strong>Naval Capacity</strong>
        <span>AVAILABLE TOKENS</span>
      </div>

      <div className="naval-capacity-stats">
        <div className="naval-capacity-stat">
          <span>⚓ Trade</span>
          <strong>
            {tradeKnown ? tradeCapacity : "—"}
          </strong>
        </div>

        <div className="naval-capacity-stat">
          <span>◈ Exploration</span>
          <strong>
            {explorationKnown
              ? explorationCapacity
              : "—"}
          </strong>
        </div>
      </div>

      {requiredTrade > 0 && (
        <div className="naval-capacity-usage">
          <div className="naval-capacity-usage-label">
            <span>Selected New World shipping</span>
            <strong>
              {requiredTrade}
              {tradeKnown ? ` / ${tradeCapacity}` : " required"}
            </strong>
          </div>

          {tradeKnown && (
            <div
              className="naval-capacity-track"
              role="progressbar"
              aria-label="Trade capacity requested"
              aria-valuemin={0}
              aria-valuemax={Math.max(1, tradeCapacity)}
              aria-valuenow={Math.min(
                requiredTrade,
                Math.max(1, tradeCapacity)
              )}
            >
              <div
                className={[
                  "naval-capacity-fill",
                  insufficient ? "is-over" : "",
                ].join(" ")}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}

          {insufficient && (
            <p
              className="naval-capacity-warning"
              role="status"
            >
              Insufficient Trade tokens for the
              selected New World shipments.
            </p>
          )}

          {!tradeKnown && (
            <p className="naval-capacity-note">
              Available capacity is not loaded.
              The engine will validate the action.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
