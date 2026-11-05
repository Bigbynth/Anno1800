
import type { GameSnapshot } from "../types";
import { pretty } from "../types";
import { ResourceToken } from "./ResourceToken";

type Requirement = {
  key: string;
  good: string;
};

type Props = {
  game: GameSnapshot;
  requirements: Requirement[];
  paymentSources: Record<string, string>;
};

export function ResourceDependencyPanel({
  game,
  requirements,
  paymentSources,
}: Props) {
  const currentPlayer =
    game.players[game.current_player_index];

  // Group repeated requirements of the same good.
  const goods = Array.from(
    new Set(requirements.map(item => item.good))
  );

  const completed = requirements.filter(
    item => Boolean(paymentSources[item.key])
  ).length;

  return (
    <section
      className="resource-dependency-panel"
      aria-label="Construction resource sources"
    >
      <div className="resource-dependency-heading">
        <div>
          <span className="construction-palette-eyebrow">
            SUPPLY REQUIREMENTS
          </span>
          <h4>Resource Sources</h4>
        </div>

        <span className="resource-dependency-progress">
          {completed}/{requirements.length} assigned
        </span>
      </div>

      {requirements.length === 0 ? (
        <p className="resource-dependency-empty">
          No resource payment required.
        </p>
      ) : (
        <div className="resource-dependency-list">
          {goods.map(good => {
            const needed = requirements.filter(
              item => item.good === good
            );

            const assigned = needed.filter(
              item => Boolean(paymentSources[item.key])
            ).length;

            const producers =
              currentPlayer?.industries.filter(
                industry => industry.good === good
              ) ?? [];

            const readyProducers = producers.filter(
              industry => industry.can_produce
            );

            // Potential trade partners, not guaranteed
            // legal or affordable trading sources.
            const tradingPartners = game.players
              .map((player, index) => ({
                player,
                index,
              }))
              .filter(({ player, index }) =>
                index !== game.current_player_index &&
                player.industries.some(
                  industry => industry.good === good
                )
              );

            return (
              <div
                key={good}
                className="resource-dependency-good"
              >
                <div className="resource-dependency-good-header">
                  <ResourceToken good={good} size="small" />

                  <span>
                    {assigned}/{needed.length} assigned
                  </span>
                </div>

                <div className="resource-dependency-source">
                  <strong>Local production</strong>

                  {producers.length ? (
                    <div className="resource-dependency-producers">
                      {producers.map(industry => (
                        <div
                          key={industry.index}
                          className="resource-dependency-producer"
                        >
                          <span>{industry.name}</span>

                          <small
                            className={
                              industry.can_produce
                                ? "is-ready"
                                : "is-unavailable"
                            }
                          >
                            {industry.can_produce
                              ? "Ready"
                              : "Unavailable"}
                          </small>
                        </div>
                      ))}

                      <small>
                        {readyProducers.length} ready producer(s)
                      </small>
                    </div>
                  ) : (
                    <small>
                      No owned producer for {pretty(good)}.
                    </small>
                  )}
                </div>

                <div className="resource-dependency-source">
                  <strong>Potential trading partners</strong>

                  {tradingPartners.length ? (
                    <div className="resource-dependency-partners">
                      {tradingPartners.map(({ player, index }) => (
                        <span key={index}>
                          {player.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <small>
                      No other player currently owns
                      an industry producing this good.
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="resource-dependency-note">
        Sources are informational. Assign payments
        below; the Python engine validates the
        final construction action.
      </p>
    </section>
  );
}
