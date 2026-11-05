
import { useState } from "react";
import { pretty } from "../types";

import type {
  GameSnapshot,
  PopulationCard,
} from "../types";

import type { ConstructionPayment } from "../api";

type Props = {
  game: GameSnapshot | null;
  cards: PopulationCard[];
  actionLoading: boolean;
  onFulfill: (
    cardId: string,
    payments: ConstructionPayment[]
  ) => Promise<boolean>;
};

export function PopulationHand({
  game,
  cards,
  actionLoading,
  onFulfill,
}: Props) {
  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  const [paymentSources, setPaymentSources] =
    useState<Record<string, string>>({});

  const selectedCard =
    selectedIndex === null
      ? null
      : cards[selectedIndex] ?? null;

  const player = game?.players[game.current_player_index];

  const requirements = Object.entries(
    selectedCard?.requirements ?? {}
  ).flatMap(([good, amount]) =>
    Array.from(
      { length: typeof amount === "number" ? amount : 0 },
      (_, index) => ({
        key: `${good}:${index}`,
        good,
      })
    )
  );

  const paymentsComplete = requirements.every(
    item => Boolean(paymentSources[item.key])
  );

  const selectedProduction = requirements
    .map(item => paymentSources[item.key])
    .filter(value => value?.startsWith("produce:"));

  const duplicateProduction =
    new Set(selectedProduction).size !==
    selectedProduction.length;

  const canFulfill =
    Boolean(game) &&
    Boolean(player) &&
    Boolean(selectedCard) &&
    !game?.main_action_used &&
    !game?.game_over &&
    !actionLoading &&
    paymentsComplete &&
    !duplicateProduction;

  function selectCard(index: number) {
    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
    }

    setPaymentSources({});
  }

  function buildPayments(): ConstructionPayment[] {
    return requirements.map(({ key, good }) => {
      const value = paymentSources[key];
      const [source, rawIndex] = value.split(":");
      const index = Number(rawIndex);

      if (!Number.isInteger(index) || index < 0) {
        throw new Error("Invalid payment selection");
      }

      if (source === "produce") {
        return {
          source: "produce",
          good,
          industry_index: index,
        };
      }

      if (source === "trade") {
        return {
          source: "trade",
          good,
          partner_index: index,
        };
      }

      throw new Error("Unknown payment source");
    });
  }

  async function handleFulfill() {
    if (!canFulfill || !selectedCard) return;

    const successful = await onFulfill(
      selectedCard.id,
      buildPayments()
    );

    if (successful) {
      setSelectedIndex(null);
      setPaymentSources({});
    }
  }

  return (
    <section className="game-hand">
      <div className="game-section-heading">
        <div>
          <span className="game-overline">
            POPULATION
          </span>
          <h2>Your Hand</h2>
        </div>

        <span className="population-hand-count">
          {cards.length} Cards
        </span>
      </div>

      <div className="game-card-row">
        {cards.map((card, index) => (
          <button
            key={`${card.id}:${index}`}
            type="button"
            aria-pressed={selectedIndex === index}
            className={[
              "game-population-card",
              card.category,
              selectedIndex === index
                ? "game-population-card--selected"
                : "",
            ].join(" ")}
            onClick={() => selectCard(index)}
          >
            <span className="game-population-tier">
              {pretty(card.category)}
            </span>

            <span className="game-population-symbol">
              ♜
            </span>

            <span className="game-population-requirements">
              {Object.entries(card.requirements)
                .map(([good, count]) =>
                  `${count}× ${pretty(good)}`
                )
                .join(" · ")}
            </span>

            <strong className="game-population-vp">
              {card.victory_points} VP
            </strong>
          </button>
        ))}

        {cards.length === 0 && (
          <p className="game-empty">
            Your hand is empty.
          </p>
        )}
      </div>

      {selectedCard && (
        <div className="population-inspector">
          <div className="population-inspector-heading">
            <div>
              <span className="game-overline">
                SELECTED POPULATION CARD
              </span>

              <h3>{pretty(selectedCard.category)}</h3>
              <small>{selectedCard.id}</small>
            </div>

            <strong className="population-inspector-vp">
              {selectedCard.victory_points} VP
            </strong>
          </div>

          <div className="population-requirements">
            <span className="game-overline">
              REQUIRED GOODS
            </span>

            {requirements.length === 0 ? (
              <p>No goods required.</p>
            ) : (
              <p>
                {Object.entries(selectedCard.requirements)
                  .map(([good, amount]) =>
                    `${amount}× ${pretty(good)}`
                  )
                  .join(" · ")}
              </p>
            )}
          </div>

          <div className="population-payment">
            <span className="game-overline">
              ASSIGN RESOURCES
            </span>

            {requirements.map(({ key, good }) => {
              const selectedValue =
                paymentSources[key] ?? "";

              return (
                <label key={key}>
                  <span>{pretty(good)}</span>

                  <select
                    value={selectedValue}
                    onChange={event =>
                      setPaymentSources(previous => ({
                        ...previous,
                        [key]: event.target.value,
                      }))
                    }
                    disabled={
                      actionLoading ||
                      Boolean(game?.main_action_used) ||
                      Boolean(game?.game_over)
                    }
                  >
                    <option value="">
                      Select source
                    </option>

                    {player?.industries
                      .filter(industry =>
                        industry.good === good &&
                        industry.can_produce
                      )
                      .map(industry => (
                        <option
                          key={`produce:${industry.index}`}
                          value={`produce:${industry.index}`}
                        >
                          Produce — {industry.name}
                        </option>
                      ))}

                    {game?.players.map((partner, index) => {
                      if (
                        index === game.current_player_index
                      ) {
                        return null;
                      }

                      if (
                        !partner.industries.some(
                          industry =>
                            industry.good === good
                        )
                      ) {
                        return null;
                      }

                      return (
                        <option
                          key={`trade:${index}`}
                          value={`trade:${index}`}
                        >
                          Trade — {partner.name}
                        </option>
                      );
                    })}
                  </select>
                </label>
              );
            })}

            {duplicateProduction && (
              <p className="population-payment-error">
                You cannot use the same industry
                twice in one action.
              </p>
            )}
          </div>

          <button
            type="button"
            className="game-primary-button"
            disabled={!canFulfill}
            onClick={() => void handleFulfill()}
          >
            {actionLoading
              ? "Fulfilling..."
              : `Fulfill Card · ${selectedCard.victory_points} VP`}
          </button>

          <p className="population-inspector-note">
            Fulfillment consumes your main action.
            Resource payments and card effects are
            validated by the Python game engine.
          </p>
        </div>
      )}
    </section>
  );
}
