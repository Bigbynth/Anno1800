import { useState } from "react";

import { pretty } from "../types";

import type {
  GameSnapshot,
  PopulationCard,
} from "../types";
import {
  analyzeTradeLifecycle,
} from "../trade-lifecycle";

import {
  TradeLifecyclePanel,
} from "./TradeLifecyclePanel";
import type { PopulationCardPayment } from "../api";

import {
  analyzePopulationFulfillment,
} from "../population-fulfillment-readiness";

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

  /* STEP 115 — LOCAL SUBMISSION PROTECTION */
  const [submitting, setSubmitting] = useState(false);
  const [fulfillmentError, setFulfillmentError] =
    useState<string | null>(null);

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

  /* STEP 115 — PAYMENT SOURCE VALIDATION */

  const fulfillmentReadiness = game
    ? analyzePopulationFulfillment({
        game,
        requirements,
        paymentSources,
        tradeCapacity,
      })
    : null;

  /* STEP 117 — POPULATION CARD SHIPPING */

  const populationTradeLifecycle = game
    ? analyzeTradeLifecycle({
        game,
        requirements,
        paymentSources,
        tradeCapacity,
        allowNewWorld: true,
      })
    : null;

  const canFulfill =
    Boolean(game) &&
    Boolean(game?.players[game.current_player_index]) &&
    Boolean(selectedCard) &&
    !game?.main_action_used &&
    !game?.game_over &&
    !actionLoading &&
    !submitting &&
    paymentsComplete &&
    !duplicateProduction &&
    fulfillmentReadiness?.canSubmit === true &&
    populationTradeLifecycle?.canSubmit === true;

  function selectCard(index: number) {
    if (submitting || actionLoading) return;

    if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(index);
    }

    // Payment selections belong to one card only.
    setPaymentSources({});
    setFulfillmentError(null);
  }

  function buildPayments(): PopulationCardPayment[] {
    return toPopulationCardPayments(
      requirements,
      paymentSources
    );
  }

  async function handleFulfill() {
    if (!canFulfill || !selectedCard || submitting) {
      return;
    }

    setSubmitting(true);
    setFulfillmentError(null);

    try {
      const cardId = selectedCard.id;

      const payments = buildPayments();

      // Backend performs the complete transaction.
      const successful = await onFulfill(
        cardId,
        payments
      );

      if (successful) {
        // Only clear the selection after success.
        setSelectedIndex(null);
        setPaymentSources({});
        setFulfillmentError(null);
      } else {
        setFulfillmentError(
          "The card could not be fulfilled. " +
          "Review the game notification and your payment selections."
        );
      }
    } catch (error) {
      setFulfillmentError(
        error instanceof Error
          ? error.message
          : "Unable to fulfill population card."
      );
    } finally {
      setSubmitting(false);
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
              onChange={(next) => {
                if (submitting) return;

                setPaymentSources(next);
                setFulfillmentError(null);
              }}
              disabled={
                actionLoading ||
                submitting ||
                game.main_action_used ||
                game.game_over
              }
            />
          )}
          {/* STEP 117 — NEW WORLD & SHIPPING READINESS */}
          {populationTradeLifecycle && (
            <TradeLifecyclePanel
              lifecycle={populationTradeLifecycle}
            />
          )}
          {/* STEP 115 — POPULATION FULFILLMENT READINESS */}
          {fulfillmentReadiness && (
            <section
              className="population-readiness"
              aria-label="Population fulfillment readiness"
            >
              <header className="population-readiness-heading">
                <strong>Fulfillment Readiness</strong>

                <span>
                  {fulfillmentReadiness.validCount}
                  /
                  {fulfillmentReadiness.requiredCount}
                  {" "}valid
                </span>
              </header>

              <div className="population-readiness-summary">
                <span>
                  Local: {fulfillmentReadiness.localProductionCount}
                </span>

                <span>
                  Trades: {fulfillmentReadiness.tradeCount}
                </span>

                <span>
                  New World: {fulfillmentReadiness.newWorldCount}
                </span>
              </div>

              {fulfillmentReadiness.checks.map(check => (
                <div
                  key={check.key}
                  className={[
                    "population-readiness-check",
                    `is-${check.status}`,
                  ].join(" ")}
                >
                  <strong>{pretty(check.good)}</strong>

                  <span>
                    {check.status === "valid"
                      ? "Valid"
                      : check.status === "missing"
                        ? "Missing"
                        : "Invalid"}
                  </span>

                  <p>{check.message}</p>
                </div>
              ))}

              {fulfillmentReadiness.errors.length > 0 && (
                <p className="population-readiness-error">
                  Resolve the payment issues before submitting.
                </p>
              )}

              {fulfillmentReadiness.warnings.map(
                (warning, index) => (
                  <p
                    key={index}
                    className="population-readiness-warning"
                  >
                    {warning}
                  </p>
                )
              )}

              {fulfillmentReadiness.canSubmit && (
                <p className="population-readiness-success">
                  Payment assignments pass the available
                  frontend checks. The engine must still
                  validate the action.
                </p>
              )}
            </section>
          )}

          {fulfillmentError && (
            <p
              className="population-readiness-error"
              role="alert"
            >
              {fulfillmentError}
            </p>
          )}
          
          {/* STEP 90 — SUBMIT CARD FULFILLMENT */}
          <div className="population-fulfillment-actions">
            <button
              type="button"
              className="population-fulfillment-confirm"
              disabled={!canFulfill}
              onClick={() => void handleFulfill()}
            >
              {actionLoading || submitting
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
