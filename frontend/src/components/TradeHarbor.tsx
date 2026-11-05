
import { useEffect, useMemo, useState } from "react";
import { pretty } from "../types";
import { getResourceIcon } from "../resource-icons";
import type { GameSnapshot } from "../types";

type TradeHarborProps = {
  game: GameSnapshot;
  requiredGood?: string;
  onAssign?: (partnerIndex: number, good: string) => void;
  onClose: () => void;
};

export function TradeHarbor({
  game,
  requiredGood,
  onAssign,
  onClose,
}: TradeHarborProps) {
  const [partnerIndex, setPartnerIndex] = useState<number | null>(null);
  const [selectedGood, setSelectedGood] = useState<string | null>(
    requiredGood ?? null
  );

  const partners = useMemo(
    () =>
      game.players
        .map((player, index) => ({ player, index }))
        .filter(
          item => item.index !== game.current_player_index
        ),
    [game.players, game.current_player_index]
  );

  const partner = partners.find(
    item => item.index === partnerIndex
  );

  const goods = useMemo(() => {
    if (!partner) return [];

    const unique = new Map<string, string[]>();

    for (const industry of partner.player.industries) {
      const existing = unique.get(industry.good) ?? [];
      existing.push(industry.name);
      unique.set(industry.good, existing);
    }

    return [...unique.entries()].map(([good, industries]) => ({
      good,
      industries,
    }));
  }, [partner]);

  const selectedCargo = goods.find(
    item => item.good === selectedGood
  );

  const matchesRequirement =
    !requiredGood || selectedGood === requiredGood;

  const canAssign =
    Boolean(onAssign) &&
    partnerIndex !== null &&
    Boolean(selectedCargo) &&
    matchesRequirement &&
    !game.main_action_used &&
    !game.game_over;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function assignCargo() {
    if (
      !canAssign ||
      !selectedCargo ||
      partnerIndex === null
    ) {
      return;
    }

    onAssign?.(partnerIndex, selectedCargo.good);
    onClose();
  }

  return (
    <div
      className="harbor-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="harbor-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="harbor-title"
      >
        <header className="harbor-header">
          <div>
            <span className="game-overline">
              MARITIME COMMERCE
            </span>

            <h2 id="harbor-title">
              The Trading Harbor
            </h2>

            <p>
              {requiredGood
                ? `Seeking ${pretty(requiredGood)}`
                : "Inspect the trading companies and their cargo"}
            </p>
          </div>

          <button
            type="button"
            className="harbor-close"
            aria-label="Close trading harbor"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="harbor-sea">
          <div className="harbor-sea-heading">
            <span>THE SHIPPING LANES</span>
            <span>{partners.length} companies</span>
          </div>

          <div className="harbor-fleet">
            {partners.map(({ player, index }) => {
              const selected = partnerIndex === index;

              const hasRequiredGood =
                !requiredGood ||
                player.industries.some(
                  industry => industry.good === requiredGood
                );

              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={selected}
                  className={[
                    "harbor-vessel",
                    selected ? "harbor-vessel--selected" : "",
                  ].join(" ")}
                  disabled={!hasRequiredGood}
                  onClick={() => {
                    setPartnerIndex(index);
                    setSelectedGood(requiredGood ?? null);
                  }}
                >
                  <span
                    className="harbor-vessel-art"
                    aria-hidden="true"
                  >
                    ⛵
                  </span>

                  <strong>{player.name}</strong>

                  <small>
                    {hasRequiredGood
                      ? `${player.industries.length} industries`
                      : `No ${pretty(requiredGood ?? "")}`}
                  </small>
                </button>
              );
            })}
          </div>

          {partners.length === 0 && (
            <p className="harbor-empty">
              No trading companies are available.
            </p>
          )}
        </div>

        <div className="harbor-cargo-section">
          <div className="harbor-section-heading">
            <span className="game-overline">
              CARGO WAREHOUSE
            </span>

            <strong>
              {partner?.player.name ?? "Select a company"}
            </strong>
          </div>

          {partner && (
            <div className="harbor-cargo-grid">
              {goods.map(item => {
                const selected =
                  selectedGood === item.good;

                const eligible =
                  !requiredGood ||
                  item.good === requiredGood;

                return (
                  <button
                    key={item.good}
                    type="button"
                    className={[
                      "harbor-cargo",
                      selected
                        ? "harbor-cargo--selected"
                        : "",
                    ].join(" ")}
                    disabled={!eligible}
                    aria-pressed={selected}
                    onClick={() => setSelectedGood(item.good)}
                  >
                    <span className="harbor-cargo-icon">
                      {getResourceIcon(item.good)}
                    </span>

                    <strong>{pretty(item.good)}</strong>

                    <small>
                      {item.industries.length} producer
                      {item.industries.length === 1
                        ? ""
                        : "s"}
                    </small>
                  </button>
                );
              })}
            </div>
          )}

          {!partner && (
            <div className="harbor-placeholder">
              Select a vessel to inspect its cargo.
            </div>
          )}
        </div>

        <footer className="harbor-footer">
          <div className="harbor-cargo-preview">
            <span className="game-overline">
              CARGO PREVIEW
            </span>

            {selectedCargo ? (
              <>
                <strong>
                  {getResourceIcon(selectedCargo.good)}{" "}
                  {pretty(selectedCargo.good)}
                </strong>

                <small>
                  Supplied by {partner?.player.name}
                </small>

                <small>
                  Potential supplier only. Token costs and
                  availability are validated by the engine.
                </small>
              </>
            ) : (
              <p>Select a company and cargo.</p>
            )}
          </div>

          <div className="harbor-footer-actions">
            <button
              type="button"
              className="harbor-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            {onAssign && (
              <button
                type="button"
                className="harbor-confirm"
                disabled={!canAssign}
                onClick={assignCargo}
              >
                Assign Cargo
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
