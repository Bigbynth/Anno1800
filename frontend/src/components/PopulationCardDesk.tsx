
import { useState } from "react";
import type { ComponentProps } from "react";

import type { GameSnapshot, PopulationCard } from "../types";
import { pretty } from "../types";
import { PopulationHand } from "./PopulationHand";
import { ResourceToken } from "./ResourceToken";

type Props = {
  game: GameSnapshot;
  cards: PopulationCard[];
  actionLoading: boolean;
  onFulfill: ComponentProps<typeof PopulationHand>["onFulfill"];
};

export function PopulationCardDesk({
  game,
  cards,
  actionLoading,
  onFulfill,
}: Props) {
  const [selectedCardId, setSelectedCardId] =
    useState<string | null>(null);

  const selectedCard =
    cards.find(card => card.id === selectedCardId) ??
    cards[0] ??
    null;

  const activePlayer =
    game.players[game.current_player_index];

  const actionUnavailable =
    actionLoading ||
    game.game_over ||
    game.main_action_used;

  return (
    <div className="population-desk">
      <div className="population-desk-heading">
        <div>
          <span className="construction-palette-eyebrow">
            POPULATION DEVELOPMENT
          </span>
          <h3>Your Population Cards</h3>
        </div>

        <span>{cards.length} in hand</span>
      </div>

      {cards.length === 0 ? (
        <p className="population-desk-empty">
          There are no Population Cards in
          the current player's hand.
        </p>
      ) : (
        <>
          {/* CARD SELECTION */}
          <div
            className="population-desk-card-list"
            aria-label="Choose a Population Card"
          >
            {cards.map((card, index) => (
              <button
                key={`${card.id}:${index}`}
                type="button"
                className={[
                  "population-desk-card",
                  selectedCard === card
                    ? "is-selected"
                    : "",
                ].join(" ")}
                aria-pressed={selectedCard === card}
                onClick={() => setSelectedCardId(card.id)}
              >
                <span className="population-desk-card-tier">
                  {pretty(card.category)}
                </span>

                <strong>
                  {Object.entries(card.requirements)
                    .map(
                      ([good, count]) =>
                        `${count}× ${pretty(good)}`
                    )
                    .join(" · ") || "No goods required"}
                </strong>

                <small>
                  {card.victory_points} VP
                </small>
              </button>
            ))}
          </div>

          {selectedCard && (
            <div className="population-desk-details">
              <div className="population-desk-selected">
                <span className="construction-palette-eyebrow">
                  SELECTED CARD
                </span>

                <h4>
                  {pretty(selectedCard.category)}
                </h4>

                <p>
                  {selectedCard.victory_points} Victory Points
                </p>
              </div>

              {/* REQUIREMENTS FROM THE CARD CATALOGUE */}
              <div className="population-desk-requirements">
                <strong>Required goods</strong>

                {Object.entries(
                  selectedCard.requirements
                ).map(([good, amount]) => {
                  const localIndustries =
                    activePlayer?.industries.filter(
                      industry =>
                        industry.good === good
                    ) ?? [];

                  const readyCount =
                    localIndustries.filter(
                      industry => industry.can_produce
                    ).length;

                  const potentialPartners =
                    game.players.filter(
                      (player, index) =>
                        index !== game.current_player_index &&
                        player.industries.some(
                          industry =>
                            industry.good === good
                        )
                    ).length;

                  return (
                    <div
                      key={good}
                      className="population-desk-requirement"
                    >
                      <div className="population-desk-good">
                        <ResourceToken
                          good={good}
                          size="small"
                        />

                        <strong>× {amount}</strong>
                      </div>

                      <small>
                        {readyCount} ready local producer(s)
                        {" · "}
                        {potentialPartners} potential
                        trading partner(s)
                      </small>
                    </div>
                  );
                })}

                {Object.keys(
                  selectedCard.requirements
                ).length === 0 && (
                  <p>No goods required.</p>
                )}
              </div>

              <p className="population-desk-note">
                These are potential resource sources,
                not guaranteed legal payments.
                New World requirements and other rules
                are handled by the existing fulfillment
                workflow and Python engine.
              </p>

              {/* EXISTING ENGINE-BACKED FULFILLMENT */}
              <div className="population-desk-fulfillment">
                <h4>Fulfillment</h4>

                {actionUnavailable && (
                  <p className="population-desk-warning">
                    The main action is unavailable.
                    Card fulfillment cannot be submitted
                    right now.
                  </p>
                )}

                <PopulationHand
                  key={`${game.current_player_index}:${selectedCard.id}`}
                  game={game}
                  cards={[selectedCard]}
                  actionLoading={
                    actionLoading || actionUnavailable
                  }
                  onFulfill={onFulfill}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
