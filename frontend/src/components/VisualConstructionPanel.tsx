
import { useState } from "react";

import { pretty } from "../types";

import type {
  GameSnapshot,
  IndustryCatalogueSnapshot,
} from "../types";

import type { ConstructionPayment } from "../api";

type Props = {
  game: GameSnapshot;
  industryData: IndustryCatalogueSnapshot;
  selectedSpaceId: string | null;
  actionLoading: boolean;
  onBuild: (
    industryId: string,
    spaceId: string,
    payments: ConstructionPayment[]
  ) => Promise<void>;
};

export function VisualConstructionPanel({
  game,
  industryData,
  selectedSpaceId,
  actionLoading,
  onBuild,
}: Props) {
  const [selectedIndustryId, setSelectedIndustryId] =
    useState("");

  const [paymentSources, setPaymentSources] =
    useState<Record<string, string>>({});

  const player = game.players[game.current_player_index];

  const selectedIndustry = industryData.industries.find(
    industry => industry.id === selectedIndustryId
  );

  const selectedSpace = industryData.spaces.find(
    space => space.id === selectedSpaceId
  );

  const availableIndustries = industryData.industries.filter(
    industry =>
      industry.remaining > 0 &&
      !industry.already_owned
  );

  const requiredPayments = Object.entries(
    selectedIndustry?.build_cost ?? {}
  ).flatMap(([good, amount]) =>
    Array.from({ length: amount }, (_, index) => ({
      key: `${good}:${index}`,
      good,
    }))
  );

  const paymentsComplete = requiredPayments.every(
    item => Boolean(paymentSources[item.key])
  );

  const selectedProductionSources = requiredPayments
    .map(item => paymentSources[item.key])
    .filter(source => source?.startsWith("produce:"));

  const duplicateProduction =
    new Set(selectedProductionSources).size !==
    selectedProductionSources.length;

  const canBuild =
    Boolean(selectedIndustry) &&
    Boolean(selectedSpace) &&
    selectedIndustry?.remaining !== 0 &&
    selectedIndustry?.already_owned === false &&
    selectedSpace?.occupied === false &&
    ["land", "coast"].includes(selectedSpace?.type ?? "") &&
    !game.main_action_used &&
    !game.game_over &&
    !actionLoading &&
    paymentsComplete &&
    !duplicateProduction;

  function chooseIndustry(id: string) {
    setSelectedIndustryId(id);
    setPaymentSources({});
  }

  function buildPayments(): ConstructionPayment[] {
    return requiredPayments.map(({ key, good }) => {
      const value = paymentSources[key];
      const [source, indexText] = value.split(":");
      const index = Number(indexText);

      if (!Number.isInteger(index) || index < 0) {
        throw new Error("Invalid resource source");
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

      throw new Error("Invalid payment source");
    });
  }

  
    async function handleConstruct() {
    if (!canBuild || !selectedSpaceId || !selectedIndustryId) {
        return;
    }

    try {
        await onBuild(
        selectedIndustryId,
        selectedSpaceId,
        buildPayments()
        );
    } catch {
        // App.tsx already displays the error via setNotice().
    }
    }


  return (
    <div className="visual-construction">
      <div className="visual-construction-heading">
        <span className="game-overline">
          INDUSTRIAL DEVELOPMENT
        </span>
        <h3>Build an Industry</h3>
        <p>
          Choose a building, then select an empty island tile.
        </p>
      </div>

      <div className="construction-palette">
        {availableIndustries.map(industry => (
          <button
            key={industry.id}
            type="button"
            className={[
              "construction-card",
              selectedIndustryId === industry.id
                ? "construction-card--selected"
                : "",
            ].join(" ")}
            onClick={() => chooseIndustry(industry.id)}
            disabled={
              actionLoading ||
              game.main_action_used ||
              game.game_over
            }
          >
            <span className="construction-card-icon">
              ⚒
            </span>

            <strong>{industry.name}</strong>

            <small>
              {pretty(industry.good)}
            </small>

            <span className="construction-card-stock">
              {industry.remaining} available
            </span>
          </button>
        ))}

        {availableIndustries.length === 0 && (
          <p className="game-empty">
            No new industries available.
          </p>
        )}
      </div>

      {selectedIndustry && (
        <div className="construction-details">
          <span className="game-overline">
            SELECTED BUILDING
          </span>

          <h4>{selectedIndustry.name}</h4>

          <p>
            Produces {pretty(selectedIndustry.good)}
            {" · "}
            Worker: {pretty(selectedIndustry.worker_type)}
          </p>

          <div className="construction-cost">
            {requiredPayments.length === 0 ? (
              <span>Construction cost: Free</span>
            ) : (
              <span>
                Cost:{" "}
                {Object.entries(selectedIndustry.build_cost)
                  .map(
                    ([good, amount]) =>
                      `${amount}× ${pretty(good)}`
                  )
                  .join(", ")}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="construction-location">
        <span className="game-overline">
          CONSTRUCTION LOCATION
        </span>

        {selectedSpace ? (
          <p>
            <strong>{selectedSpace.id}</strong>
            {" · "}
            {pretty(selectedSpace.type)}
            {" · "}
            {selectedSpace.occupied
              ? "Occupied"
              : "Available"}
          </p>
        ) : (
          <p>Select a tile on the island board.</p>
        )}
      </div>

      {selectedIndustry && requiredPayments.length > 0 && (
        <div className="construction-resource-payment">
          <span className="game-overline">
            RESOURCE PAYMENT
          </span>

          {requiredPayments.map(({ key, good }) => (
            <label key={key}>
              <span>{pretty(good)}</span>

              <select
                value={paymentSources[key] ?? ""}
                onChange={event =>
                  setPaymentSources(previous => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
                disabled={
                  actionLoading ||
                  game.main_action_used ||
                  game.game_over
                }
              >
                <option value="">Select source</option>

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

                {game.players.map((partner, index) => {
                  if (index === game.current_player_index) {
                    return null;
                  }

                  if (
                    !partner.industries.some(
                      industry => industry.good === good
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
          ))}

          {duplicateProduction && (
            <p className="construction-error">
              The same industry cannot produce twice.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className="game-primary-button"
        disabled={!canBuild}
        onClick={() => void handleConstruct()}
      >
        {actionLoading
          ? "Constructing..."
          : selectedIndustry
            ? `Build ${selectedIndustry.name}`
            : "Choose an Industry"}
      </button>

      <p className="construction-footnote">
        Construction consumes your main action.
        Placement and payment rules are checked by the game engine.
      </p>
    </div>
  );
}
