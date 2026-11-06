
import { useState } from "react";

import { NavalCapacityDisplay } from "./NavalCapacityDisplay";
import type { GameSnapshot } from "../types";
import { pretty } from "../types";
import { ResourceToken } from "./ResourceToken";

type Props = {
  game: GameSnapshot;
  tradeCapacity?: number | null;
  onClose: () => void;
  onStartConstruction: () => void;
};

export function TradeDirectory({
  game,
  tradeCapacity,
  onClose,
  onStartConstruction,
}: Props) {
  const [search, setSearch] = useState("");

  const currentPlayerIndex = game.current_player_index;

  const partners = game.players
    .map((player, index) => ({ player, index }))
    .filter(({ index }) => index !== currentPlayerIndex);

  const searchText = search.trim().toLowerCase();

  const visiblePartners = partners
    .map(({ player, index }) => {
      // Display the types of goods each partner
      // can produce. This is not stored inventory.
      const goods = Array.from(
        new Set(
          player.industries.map(industry => industry.good)
        )
      );

      const filteredGoods = goods.filter(good =>
        `${pretty(good)} ${good}`
          .toLowerCase()
          .includes(searchText)
      );

      return {
        player,
        index,
        goods: filteredGoods,
      };
    })
    .filter(({ player, goods }) =>
      searchText.length === 0 ||
      player.name.toLowerCase().includes(searchText) ||
      goods.length > 0
    );

  const canStartConstruction =
    !game.main_action_used && !game.game_over;

  return (
    <div
      className="trade-directory-backdrop"
      onClick={onClose}
    >
      <section
        className="trade-directory"
        role="dialog"
        aria-modal="true"
        aria-label="Maritime trading directory"
        onClick={event => event.stopPropagation()}
      >
        <header className="trade-directory-header">
          <div>
            <span className="construction-palette-eyebrow">
              THE TRADING HARBOR
            </span>

            <h2>Foreign Trade</h2>

            <p>
              Inspect the industries and goods available
              through other trading companies.
            </p>
          </div>

          <button
            type="button"
            className="trade-directory-close"
            aria-label="Close Trading Harbor"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="trade-directory-summary">
          <div>
            <small>Trading partners</small>
            <strong>{partners.length}</strong>
          </div>
        </div>

        {/* STEP 91 — NAVAL CAPACITY */}
        <NavalCapacityDisplay
          tradeCapacity={tradeCapacity}
          compact
        />

        <p className="trade-directory-explanation">
          Foreign industries identify potential goods
          suppliers, not guaranteed legal trades.
          Actual trades are validated and paid for
          when another game action is executed.
        </p>

        <label className="trade-directory-search">
          <span>Find a good or trading company</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search goods or companies..."
          />
        </label>

        <div className="trade-directory-list">
          {visiblePartners.map(({ player, index, goods }) => (
            <article
              className="trade-directory-partner"
              key={index}
            >
              <div className="trade-directory-partner-heading">
                <div>
                  <span className="construction-palette-eyebrow">
                    TRADING COMPANY
                  </span>
                  <h3>{player.name}</h3>
                </div>

                <span className="trade-directory-partner-count">
                  {player.industries.length} industries
                </span>
              </div>

              {goods.length > 0 ? (
                <div className="trade-directory-goods">
                  {goods.map(good => {
                    const producers = player.industries.filter(
                      industry => industry.good === good
                    );

                    return (
                      <div
                        className="trade-directory-good"
                        key={good}
                      >
                        <ResourceToken
                          good={good}
                          size="small"
                        />

                        <span>
                          {producers.map(
                            industry => industry.name
                          ).join(", ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="trade-directory-empty">
                  {searchText
                    ? "No matching goods."
                    : "No industries available."}
                </p>
              )}
            </article>
          ))}

          {visiblePartners.length === 0 && (
            <p className="trade-directory-empty">
              No matching trading partners or goods.
            </p>
          )}
        </div>

        <footer className="trade-directory-footer">
          <p>
            To use foreign goods, assign a trading
            partner in the Resource Payment picker
            during construction or card fulfillment.
          </p>

          <div className="trade-directory-actions">
            <button
              type="button"
              className="trade-directory-secondary"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="trade-directory-primary"
              disabled={!canStartConstruction}
              onClick={onStartConstruction}
            >
              Open Construction
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
