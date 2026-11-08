
import type {
  FestivalLifecycleResult,
  TokenLifecycle,
} from "../festival-lifecycle";

type Props = {
  lifecycle: FestivalLifecycleResult;
};

function TokenRow({
  title,
  tokens,
}: {
  title: string;
  tokens: TokenLifecycle;
}) {
  const total = tokens.total;
  const percent =
    total !== null && total > 0
      ? Math.min(
          100,
          (tokens.available / total) * 100
        )
      : 0;

  return (
    <div className="festival-lifecycle-token">
      <div className="festival-lifecycle-token-heading">
        <strong>{title}</strong>

        <span>
          {tokens.available}
          {total === null ? " available" : ` / ${total}`}
        </span>
      </div>

      {total !== null && (
        <div
          className="festival-lifecycle-track"
          aria-label={`${title} token availability`}
        >
          <div
            className="festival-lifecycle-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <small>
        {tokens.afterFestival === null
          ? "Total capacity is not available."
          : `After Festival: ${tokens.afterFestival} available`}
      </small>
    </div>
  );
}

export function FestivalLifecyclePanel({
  lifecycle,
}: Props) {
  return (
    <section
      className="festival-lifecycle-panel"
      aria-label="Festival lifecycle preview"
    >
      <header className="festival-lifecycle-header">
        <span className="construction-palette-eyebrow">
          COMPANY RESTORATION
        </span>

        <h3>Festival Benefits Preview</h3>

        <p>
          Review the expected workforce and naval
          token refresh before confirming.
        </p>
      </header>

      <div className="festival-lifecycle-stats">
        <div>
          <strong>
            {lifecycle.occupiedIndustries}
          </strong>
          <span>Occupied workplaces</span>
        </div>

        <div>
          <strong>
            {lifecycle.totalExhaustedTokens ?? "?"}
          </strong>
          <span>Exhausted naval tokens</span>
        </div>
      </div>

      <div className="festival-lifecycle-section">
        <strong>Workforce Restoration</strong>

        <p>
          {lifecycle.occupiedIndustries} of{" "}
          {lifecycle.totalIndustries} industry
          workplaces currently have assigned workers.
        </p>

        <p>
          A successful Festival releases assigned
          workers and refreshes population cubes.
        </p>
      </div>

      <div className="festival-lifecycle-section">
        <strong>Naval Token Restoration</strong>

        <TokenRow
          title="Trade"
          tokens={lifecycle.trade}
        />

        <TokenRow
          title="Exploration"
          tokens={lifecycle.exploration}
        />
      </div>

      <div className="festival-lifecycle-section">
        <strong>Fleet Ownership</strong>

        <p>
          {lifecycle.ownedShips} ship(s) and{" "}
          {lifecycle.ownedShipyards} shipyard(s)
          currently owned.
        </p>

        <p>
          Festival refreshes tokens; it does not
          create additional ships or shipyards.
        </p>
      </div>

      {!lifecycle.canHoldFestival && (
        <div className="festival-lifecycle-warning">
          <strong>Festival unavailable</strong>

          {lifecycle.unavailableReasons.map(
            (reason, index) => (
              <p key={index}>{reason}</p>
            )
          )}
        </div>
      )}

      <p className="festival-lifecycle-note">
        Preview based on the latest available
        game snapshot. The Python engine determines
        the actual Festival result.
      </p>
    </section>
  );
}
