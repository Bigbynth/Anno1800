import { useState } from "react";

import type { ConstructionPayment, PopulationCardPayment } from "../api";
import { getResourceIcon } from "../resource-icons";
import { pretty } from "../types";

import type { GameSnapshot } from "../types";

import { TradeHarbor } from "./TradeHarbor";
import { NavalCapacityDisplay } from "./NavalCapacityDisplay";

export type ResourceRequirement = {
  key: string;
  good: string;
};

type Props = {
  game: GameSnapshot;
  allowNewWorld?: boolean;
  tradeCapacity?: number | null;
  requirements: ResourceRequirement[];
  paymentSources: Record<string, string>;
  onChange: (sources: Record<string, string>) => void;
  disabled?: boolean;
};


/**
 * Assign available local producers to unpaid requirements.
 *
 * This prepares frontend selections only.
 * It does not perform production or change game state.
 */
export function autoAssignLocalPayments(
  game: GameSnapshot,
  requirements: ResourceRequirement[],
  existing: Record<string, string>
): Record<string, string> {
  const next = { ...existing };

  const player = game.players[game.current_player_index];

  if (!player) return next;

  // Reserve producers already assigned to any requirement.
  const usedProducers = new Set(
    requirements
      .map(item => next[item.key])
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.startsWith("produce:")
      )
  );

  for (const requirement of requirements) {
    // Preserve existing local and trade assignments.
    if (next[requirement.key]) continue;

    const producer = player.industries.find(
      industry =>
        industry.good === requirement.good &&
        industry.can_produce &&
        !usedProducers.has(`produce:${industry.index}`)
    );

    if (!producer) continue;

    const source = `produce:${producer.index}`;

    next[requirement.key] = source;
    usedProducers.add(source);
  }

  return next;
}



export function hasDuplicateProductionSources(
  sources: Record<string, string>,
  requirements: ResourceRequirement[]
): boolean {
  const productionSources = requirements
    .map(item => sources[item.key])
    .filter(value => value?.startsWith("produce:"));

  return (
    new Set(productionSources).size !==
    productionSources.length
  );
}

export function toConstructionPayments(
  requirements: ResourceRequirement[],
  sources: Record<string, string>
): ConstructionPayment[] {
  return requirements.map(({ key, good }) => {
    const selected = sources[key];

    if (!selected) {
      throw new Error(`Missing payment for ${good}`);
    }

    const [source, indexText] = selected.split(":");
    const index = Number(indexText);

    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid payment for ${good}`);
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

    throw new Error(`Unknown payment source: ${source}`);
  });
}

export function toPopulationCardPayments(
  requirements: ResourceRequirement[],
  sources: Record<string, string>
): PopulationCardPayment[] {
  return requirements.map(({ key, good }) => {
    const selected = sources[key];

    if (!selected) {
      throw new Error(`Missing payment for ${good}`);
    }

    if (selected.startsWith("new_world:")) {
      const islandId = selected.slice("new_world:".length);

      if (!islandId) {
        throw new Error("Missing New World island ID");
      }

      return {
        source: "new_world",
        good,
        island_id: islandId,
      };
    }

    // Reuse the original construction-compatible
    // conversion for production and trading.
    return toConstructionPayments(
      [{ key, good }],
      sources
    )[0];
  });
}


export function ResourcePaymentPicker({
  game,
  allowNewWorld = false,
  tradeCapacity = null,
  requirements,
  paymentSources,
  onChange,
  disabled = false,
}: Props) {
  const currentPlayer = game.players[game.current_player_index];
  const [harborRequirement, setHarborRequirement] =
    useState<ResourceRequirement | null>(null);

  const selectedProduction = requirements
    .map(item => paymentSources[item.key])
    .filter(value => value?.startsWith("produce:"));

  const duplicates = hasDuplicateProductionSources(
    paymentSources,
    requirements
  );

  const completed = requirements.filter(
    item => Boolean(paymentSources[item.key])
  ).length;

  
  const selectedNewWorldCount = requirements.filter(
    item =>
      paymentSources[item.key]?.startsWith("new_world:")
  ).length;


  function selectSource(key: string, value: string) {
    if (disabled) return;

    onChange({
      ...paymentSources,
      [key]: paymentSources[key] === value ? "" : value,
    });
  }

  
  function handleAutoAssign() {
    if (disabled) return;

    onChange(
      autoAssignLocalPayments(
        game,
        requirements,
        paymentSources
      )
    );
  }

  function handleClearAssignments() {
    if (disabled) return;

    const next = { ...paymentSources };

    for (const requirement of requirements) {
      delete next[requirement.key];
    }

    onChange(next);
  }


  if (requirements.length === 0) {
    return (
      <div className="resource-payment-picker">
        <span className="game-overline">
          RESOURCE PAYMENT
        </span>

        <p className="resource-payment-free">
          No resources required.
        </p>
      </div>
    );
  }

  return (
    <div className="resource-payment-picker">
      <div className="resource-payment-header">
        <span className="game-overline">
          REQUIRED RESOURCES
        </span>

        <span className="resource-payment-progress">
          {completed}/{requirements.length} assigned
        </span>
      </div>
      
      {/* STEP 83 — QUICK PAYMENT ACTIONS */}
      <div className="resource-payment-quick-actions">
        <button
          type="button"
          className="resource-payment-auto"
          onClick={handleAutoAssign}
          disabled={disabled || completed === requirements.length}
          title="Assign unused available local producers"
        >
          <span aria-hidden="true">⚙</span>
          Auto-assign Local
        </button>

        <button
          type="button"
          className="resource-payment-clear"
          onClick={handleClearAssignments}
          disabled={disabled || completed === 0}
          title="Clear resource assignments"
        >
          Clear Assignments
        </button>
      </div>

      <div className="resource-requirement-list">
        {requirements.map(({ key, good }) => {
          const selected = paymentSources[key] ?? "";
          const productionOptions =
            currentPlayer?.industries
              .filter(
                industry =>
                  industry.good === good &&
                  industry.can_produce
              )
              .map(industry => ({
                value: `produce:${industry.index}`,
                label: industry.name,
              })) ?? [];

          
          const newWorldOptions = allowNewWorld
            ? (currentPlayer?.new_world_islands ?? [])
                .filter(island => island.resources.includes(good))
                .map(island => ({
                  value: `new_world:${island.id}`,
                  label: island.name,
                }))
            : [];


          return (
            <div
              key={key}
              className={
                "resource-requirement" +
                (selected
                  ? " resource-requirement--assigned"
                  : "")
              }
            >
              <div className="resource-requirement-title">
                <span className="resource-good-icon">
                  {getResourceIcon(good)}
                </span>

                <div>
                  <strong>{pretty(good)}</strong>
                  <small>
                    {selected
                      ? "Source selected"
                      : "Choose how to obtain this good"}
                  </small>
                </div>

                <span className="resource-requirement-check">
                  {selected ? "✓" : "○"}
                </span>
              </div>

              <div className="resource-source-list">
                {productionOptions.map(option => {
                  const isSelected =
                    selected === option.value;
                  const isUsedElsewhere =
                    selectedProduction.includes(option.value) &&
                    !isSelected;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={[
                        "resource-source",
                        isSelected
                          ? "resource-source--selected"
                          : "",
                      ].join(" ")}
                      disabled={disabled || isUsedElsewhere}
                      aria-pressed={isSelected}
                      onClick={() =>
                        selectSource(key, option.value)
                      }
                    >
                      <span className="resource-source-icon">
                        ⚙
                      </span>

                      <span className="resource-source-name">
                        <strong>Produce</strong>
                        <small>{option.label}</small>
                      </span>

                      <span className="resource-source-check">
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}

                
                {/* STEP 90 — NEW WORLD RESOURCE SOURCES */}
                {newWorldOptions.map(option => {
                  const isSelected = selected === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={[
                        "resource-source",
                        isSelected ? "resource-source--selected" : "",
                      ].join(" ")}
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() => selectSource(key, option.value)}
                    >
                      <span className="resource-source-icon">
                        ◈
                      </span>

                      <span className="resource-source-name">
                        <strong>New World</strong>
                        <small>{option.label}</small>
                      </span>

                      <span className="resource-source-check">
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}


                
                {productionOptions.length === 0 &&
                  newWorldOptions.length === 0 && (
                    <p className="resource-source-empty">
                      No local or New World producer available.
                      Check the Trading Harbor for other sources.
                    </p>
                  )}
              </div>

              <div className="resource-harbor-row">
                <button
                  type="button"
                  className="resource-open-harbor"
                  disabled={disabled}
                  onClick={() =>
                    setHarborRequirement({ key, good })
                  }
                >
                  <span aria-hidden="true">⚓</span>
                  Open Trading Harbor
                </button>

                {selected.startsWith("trade:") && (
                  <span className="resource-trade-assignment">
                    Assigned:{" "}
                    {game.players[
                      Number(selected.split(":")[1])
                    ]?.name ?? "Trading partner"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
        
      {/* STEP 83 — ASSIGNMENT SUMMARY */}
      <div
        className="resource-payment-assignment-summary"
        aria-label="Selected resource payment sources"
      >
        <strong>Payment Summary</strong>

        {requirements.map(({ key, good }) => {
          const value = paymentSources[key] ?? "";

          let sourceLabel = "Not assigned";

          if (value.startsWith("produce:")) {
            const industryIndex = Number(value.split(":")[1]);

            const industry = currentPlayer?.industries.find(
              item => item.index === industryIndex
            );

            sourceLabel = industry
              ? `Produce — ${industry.name}`
              : "Unknown local producer";
          }

          if (value.startsWith("trade:")) {
            const partnerIndex = Number(value.split(":")[1]);

            const partner = game.players[partnerIndex];

            sourceLabel = partner
              ? `Trade — ${partner.name}`
              : "Unknown trading partner";
          }

          if (value.startsWith("new_world:")) {
            const islandId = value.slice("new_world:".length);

            const island = currentPlayer?.new_world_islands?.find(
              item => item.id === islandId
            );

            sourceLabel = island
              ? `New World — ${island.name}`
              : "Unknown New World island";
          }

          return (
            <div
              key={key}
              className="resource-payment-summary-row"
            >
              <span>
                {getResourceIcon(good)} {pretty(good)}
              </span>

              <span
                className={
                  value
                    ? "resource-payment-source-assigned"
                    : "resource-payment-source-missing"
                }
              >
                {sourceLabel}
              </span>
            </div>
          );
        })}
      </div>
        
      {/* STEP 91 — NAVAL SHIPPING CAPACITY */}
      {allowNewWorld && (
        <NavalCapacityDisplay
          tradeCapacity={tradeCapacity}
          requiredTrade={selectedNewWorldCount}
          compact
        />
      )}
        
      {allowNewWorld && selectedNewWorldCount > 0 && (
        <p className="resource-payment-new-world-note">
          New World shipping selected:{" "}
          <strong>{selectedNewWorldCount}</strong>
          {" "}Trade token(s) required.

          The backend validates the available capacity
          when fulfilling the card.
        </p>
      )}

      {duplicates && (
        <p className="resource-payment-warning">
          The same industry cannot produce twice.
        </p>
      )}

      {completed === requirements.length && !duplicates && (
        <p className="resource-payment-success">
          All resources assigned. The game engine will
          validate the payment before completing the action.
        </p>
      )}

      {harborRequirement && (
        <TradeHarbor
          game={game}
          requiredGood={harborRequirement.good}
          onAssign={(partnerIndex, good) => {
            if (good !== harborRequirement.good) return;

            onChange({
              ...paymentSources,
              [harborRequirement.key]: `trade:${partnerIndex}`,
            });
          }}
          onClose={() => setHarborRequirement(null)}
        />
      )}
    </div>
  );
}
