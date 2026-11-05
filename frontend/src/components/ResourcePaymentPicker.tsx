
import { pretty } from "../types";
import type { GameSnapshot } from "../types";
import type { ConstructionPayment } from "../api";

export type ResourceRequirement = {
  key: string;
  good: string;
};

type Props = {
  game: GameSnapshot;
  requirements: ResourceRequirement[];
  paymentSources: Record<string, string>;
  onChange: (sources: Record<string, string>) => void;
  disabled?: boolean;
};

const goodIcons: Record<string, string> = {
  grain: "🌾",
  wool: "🐑",
  bread: "🍞",
  clothing: "🧥",
  coal: "⚫",
  brick: "🧱",
  beer: "🍺",
  steel: "⚙️",
  windows: "🪟",
  sewing_machine: "🪡",
  bicycle: "🚲",
  gramophone: "🎵",
  sugar_cane: "🌿",
  tobacco: "🍃",
  cotton: "☁️",
  coffee: "☕",
  rubber: "🌳",
  cocoa: "🍫",
};

export function getResourceIcon(good: string): string {
  return goodIcons[good] ?? "📦";
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

export function ResourcePaymentPicker({
  game,
  requirements,
  paymentSources,
  onChange,
  disabled = false,
}: Props) {
  const currentPlayer = game.players[game.current_player_index];

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

  function selectSource(key: string, value: string) {
    if (disabled) return;

    onChange({
      ...paymentSources,
      [key]: paymentSources[key] === value ? "" : value,
    });
  }

  if (requirements.length === 0) {
    return (
      <div className="resource-payment-picker">
        <span className="game-overline">RESOURCE PAYMENT</span>
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

      <div className="resource-requirement-list">
        {requirements.map(({ key, good }) => {
          const selected = paymentSources[key] ?? "";

          const productionOptions =
            currentPlayer?.industries
              .filter(industry =>
                industry.good === good &&
                industry.can_produce
              )
              .map(industry => ({
                value: `produce:${industry.index}`,
                label: industry.name,
                kind: "produce" as const,
              })) ?? [];

          const tradeOptions = game.players.flatMap(
            (partner, index) => {
              if (index === game.current_player_index) {
                return [];
              }

              if (
                !partner.industries.some(
                  industry => industry.good === good
                )
              ) {
                return [];
              }

              return [{
                value: `trade:${index}`,
                label: partner.name,
                kind: "trade" as const,
              }];
            }
          );

          const options = [
            ...productionOptions,
            ...tradeOptions,
          ];

          return (
            <div
              key={key}
              className={
                "resource-requirement" +
                (selected ? " resource-requirement--assigned" : "")
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
                {options.map(option => {
                  const isSelected = selected === option.value;

                  const isUsedElsewhere =
                    option.kind === "produce" &&
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
                        {option.kind === "produce" ? "⚙" : "⚓"}
                      </span>

                      <span className="resource-source-name">
                        <strong>
                          {option.kind === "produce"
                            ? "Produce"
                            : "Trade"}
                        </strong>
                        <small>{option.label}</small>
                      </span>

                      <span className="resource-source-check">
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}

                {options.length === 0 && (
                  <p className="resource-source-empty">
                    No available source for {pretty(good)}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
