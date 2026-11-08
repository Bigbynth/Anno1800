
import type {
  TradeLifecycleResult,
} from "../trade-lifecycle";

type Props = {
  lifecycle: TradeLifecycleResult;
};

export function TradeLifecyclePanel({
  lifecycle,
}: Props) {
  const {
    rows,
    tradeCount,
    newWorldCount,
    requiredTradeTokens,
    availableTradeTokens,
    alreadyTradedGoods,
    errors,
    warnings,
    canSubmit,
  } = lifecycle;

  return (
    <section
      className="trade-lifecycle-panel"
      aria-label="Trade lifecycle inspector"
    >
      <header>
        <span className="construction-palette-eyebrow">
          THE MARITIME COMMERCE OFFICE
        </span>

        <h3>Trade Lifecycle</h3>

        <p>
          Review trading restrictions and
          shipping requirements.
        </p>
      </header>

      <div className="trade-lifecycle-stats">
        <div>
          <strong>{tradeCount}</strong>
          <span>Trades</span>
        </div>

        <div>
          <strong>{newWorldCount}</strong>
          <span>New World</span>
        </div>

        <div>
          <strong>
            {requiredTradeTokens}/
            {availableTradeTokens ?? "?"}
          </strong>
          <span>Trade tokens</span>
        </div>
      </div>

      <div className="trade-lifecycle-history">
        <strong>Goods traded this turn</strong>

        {alreadyTradedGoods.length === 0 ? (
          <p>None</p>
        ) : (
          <p>{alreadyTradedGoods.join(", ")}</p>
        )}
      </div>

      <div className="trade-lifecycle-rows">
        {rows
          .filter(
            row =>
              row.kind === "trade" ||
              row.kind === "new_world"
          )
          .map(row => (
            <article
              key={row.key}
              className={
                row.valid
                  ? "trade-lifecycle-row is-valid"
                  : "trade-lifecycle-row is-invalid"
              }
            >
              <div>
                <strong>{row.good}</strong>

                <span>
                  {row.valid
                    ? `${row.tokenCost} token(s)`
                    : "Unavailable"}
                </span>
              </div>

              <p>{row.explanation}</p>
            </article>
          ))}
      </div>

      {errors.length > 0 && (
        <div
          className="trade-lifecycle-errors"
          role="status"
        >
          <strong>Payment plan issues</strong>

          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}

      {warnings.map((warning, index) => (
        <p
          key={index}
          className="trade-lifecycle-warning"
        >
          {warning}
        </p>
      ))}

      <footer>
        {canSubmit
          ? "Trade lifecycle checks passed. The engine will validate the transaction."
          : "Resolve the payment issues before submitting."}
      </footer>
    </section>
  );
}
