
import type {
  PaymentValidationResult,
} from "../payment-validation";

type Props = {
  validation: PaymentValidationResult;
};

export function TradePaymentInspector({
  validation,
}: Props) {
  const {
    requiredCount,
    assignedCount,
    validCount,
    localProductionCount,
    tradeCount,
    tradeCapacity,
    rows,
    errors,
    warnings,
    canSubmit,
  } = validation;

  return (
    <section
      className="trade-payment-inspector"
      aria-label="Trade and payment inspector"
    >
      <header className="trade-payment-header">
        <span className="construction-palette-eyebrow">
          THE MERCHANT SHIPPING OFFICE
        </span>

        <h3>Trade & Payment Inspector</h3>

        <p>
          Review local production and trading
          assignments before construction.
        </p>
      </header>

      <div className="trade-payment-stats">
        <div>
          <strong>
            {assignedCount}/{requiredCount}
          </strong>
          <span>Assigned</span>
        </div>

        <div>
          <strong>{localProductionCount}</strong>
          <span>Local</span>
        </div>

        <div>
          <strong>{tradeCount}</strong>
          <span>Trades</span>
        </div>
      </div>

      <div className="trade-shipping-status">
        <strong>Shipping Capacity</strong>

        <span>
          {tradeCapacity === null
            ? "Unknown"
            : tradeCapacity}
        </span>

        <p>
          {tradeCount} trade payment(s) selected.
          Shipping availability is verified
          by the game engine during execution.
        </p>
      </div>

      <div className="trade-payment-checks">
        <strong>Payment Source Validation</strong>

        {rows.map(row => (
          <article
            key={row.key}
            className={[
              "trade-payment-row",
              row.valid ? "is-valid" : "is-invalid",
            ].join(" ")}
          >
            <div className="trade-payment-row-top">
              <strong>{row.good}</strong>

              <span>
                {row.valid ? "Valid" : "Needs attention"}
              </span>
            </div>

            <small>
              {row.sourceLabel}
            </small>

            <p>{row.explanation}</p>
          </article>
        ))}

        {rows.length === 0 && (
          <p className="trade-payment-empty">
            This construction does not require
            resource payments.
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="trade-payment-warnings">
          <strong>Shipping advisory</strong>

          {warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className="trade-payment-errors">
          <strong>
            {errors.length} payment issue(s)
          </strong>

          <p>
            Resolve the invalid assignments
            before confirming construction.
          </p>
        </div>
      )}

      <div
        className={[
          "trade-payment-verdict",
          canSubmit ? "is-ready" : "is-blocked",
        ].join(" ")}
        role="status"
      >
        <strong>
          {canSubmit
            ? "Payment Sources Valid"
            : "Payments Incomplete or Invalid"}
        </strong>

        <span>
          {validCount}/{requiredCount}
          {" "}valid payment(s)
        </span>

        {canSubmit && (
          <p>
            Payment-source checks passed.
            The engine will validate the
            complete construction transaction.
          </p>
        )}
      </div>
    </section>
  );
}
