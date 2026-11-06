import { useState } from "react";

import { pretty } from "../types";

import type {
  GameSnapshot,
  PopulationCard,
} from "../types";

import type { PopulationCardPayment } from "../api";

import {
  ResourcePaymentPicker,
  hasDuplicateProductionSources,
  toPopulationCardPayments
} from "./ResourcePaymentPicker";

type Props = {
  game: GameSnapshot | null;
  cards: PopulationCard[];
  actionLoading: boolean;
  tradeCapacity?: number | null;
  onFulfill: (
    cardId: string,
    payments: PopulationCardPayment[]
  ) => Promise<boolean>;
};

export function PopulationHand({
  game,
  cards,
  actionLoading,
  tradeCapacity = null,
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
  const duplicateProduction = hasDuplicateProductionSources(
    paymentSources,
    requirements
  );

  const canFulfill =
    Boolean(game) &&
    Boolean(game?.players[game.current_player_index]) &&
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

  function buildPayments(): PopulationCardPayment[] {
    return toPopulationCardPayments(
      requirements,
      paymentSources
    );
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
          <span className="game-overline">POPULATION</span>
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
                .map(
                  ([good, count]) =>
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
                  .map(
                    ([good, amount]) =>
                      `${amount}× ${pretty(good)}`
                  )
                  .join(" · ")}
              </p>
            )}
          </div>

          {game && (
            <ResourcePaymentPicker
              game={game}
              allowNewWorld
              tradeCapacity={tradeCapacity}
              requirements={requirements}
              paymentSources={paymentSources}
              onChange={setPaymentSources}
              disabled={
                actionLoading ||
                game.main_action_used ||
                game.game_over
              }
            />
          )}

          
          {/* STEP 90 — SUBMIT CARD FULFILLMENT */}
          <div className="population-fulfillment-actions">
            <button
              type="button"
              className="population-fulfillment-confirm"
              disabled={!canFulfill}
              onClick={() => void handleFulfill()}
            >
              {actionLoading
                ? "Fulfilling..."
                : "Fulfill Population Card"}
            </button>

            {!paymentsComplete && (
              <p className="population-fulfillment-hint">
                Assign all required resources before fulfilling
                this card.
              </p>
            )}

            {duplicateProduction && (
              <p className="population-fulfillment-hint">
                The same local producer cannot be used twice.
              </p>
            )}
          </div>

        </div>
      )}
    </section>
  );
}
