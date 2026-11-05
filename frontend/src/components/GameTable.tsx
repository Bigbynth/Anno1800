
import { useState } from "react";

import { InteractiveIslandBoard } from "./InteractiveIslandBoard";

import type {
  GameSnapshot,
  PopulationCard,
  IndustryCatalogueSnapshot,
} from "../types";

import { pretty } from "../types";

type GameTableProps = {
  islandSpaces: IndustryCatalogueSnapshot["spaces"];
  game: GameSnapshot | null;
  handCards: PopulationCard[];
  actionLoading: boolean;
  notice: string;
  selectedLocation: string | null;
  onSelectLocation: (id: string) => void;
  onFestival: () => void;
  onProduce: (industryIndex: number) => void;
  onEndTurn: () => void;
  onOpenWorkshop: () => void;
  onOpenCards: () => void;
};

export function GameTable({
  game,
  islandSpaces,
  handCards,
  actionLoading,
  notice,
  selectedLocation,
  onSelectLocation,
  onFestival,
  onProduce,
  onEndTurn,
  onOpenWorkshop,
  onOpenCards,
}: GameTableProps) {
  const [selectedIndustryIndex, setSelectedIndustryIndex] =
    useState<number | null>(null);

  const player = game?.players[game.current_player_index];
  const industries = player?.industries ?? [];
  const selectedIndustry = industries.find(
    industry => industry.index === selectedIndustryIndex
  );

  const mainActionAvailable =
    Boolean(game) &&
    !game?.game_over &&
    !game?.main_action_used &&
    !actionLoading;

  return (
    <div className="game-table">
      <header className="game-hud">
        <div className="game-hud-identity">
          <span className="game-overline">
            ANNO 1800 · THE BOARD GAME
          </span>
          <h1>{player?.name ?? "Your Company"}</h1>
          <span className="game-hud-meta">
            Round {game?.round ?? 1}
            {" · "}
            {game?.phase ?? "Preparing game"}
          </span>
        </div>

        <div className="game-hud-resources">
          <div className="game-resource">
            <span>GOLD</span>
            <strong>{player?.gold ?? "—"}</strong>
          </div>
          <div className="game-resource">
            <span>VICTORY POINTS</span>
            <strong>{player?.victory_points ?? "—"}</strong>
          </div>
          <div className="game-resource">
            <span>TURN</span>
            <strong>
              {game?.game_over
                ? "Finished"
                : game?.main_action_used
                  ? "Action used"
                  : "Ready"}
            </strong>
          </div>
        </div>
      </header>

      <div className="game-main-layout">
        <section className="game-world">
          <div className="game-world-heading">
            <div>
              <span className="game-overline">
                THE OLD WORLD
              </span>
              <h2>Home Island</h2>
            </div>
            <button
              className="game-secondary-button"
              onClick={onOpenWorkshop}
            >
              Open Workshop
            </button>
          </div>

          
            <InteractiveIslandBoard
            spaces={islandSpaces}
            selectedSpaceId={selectedLocation}
            onSelectSpace={onSelectLocation}
            />

        </section>

        <aside className="game-action-panel">
          <div className="game-panel-heading">
            <span className="game-overline">
              COMMAND CENTER
            </span>
            <h2>Choose an action</h2>
          </div>

          <div className="game-action-grid">
            <button
              className="game-action-button"
              onClick={onOpenWorkshop}
            >
              <span className="game-action-symbol">⚒</span>
              <strong>Construct</strong>
              <small>Industry, shipyard, ship</small>
            </button>

            <button
              className="game-action-button"
              onClick={() => {
                document.getElementById(
                  "game-production"
                )?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                });
              }}
            >
              <span className="game-action-symbol">⚙</span>
              <strong>Produce</strong>
              <small>Activate your industries</small>
            </button>

            <button
              className="game-action-button"
              onClick={onFestival}
              disabled={!mainActionAvailable}
            >
              <span className="game-action-symbol">✦</span>
              <strong>Festival</strong>
              <small>Refresh your workforce</small>
            </button>

            <button
              className="game-action-button"
              onClick={onOpenCards}
            >
              <span className="game-action-symbol">▤</span>
              <strong>Cards</strong>
              <small>Inspect your collection</small>
            </button>
          </div>

          <div className="game-production" id="game-production">
            <div className="game-section-heading">
              <span className="game-overline">
                YOUR INDUSTRIES
              </span>
              <span>{industries.length} owned</span>
            </div>

            <div className="game-industry-list">
              {industries.map(industry => (
                <button
                  key={industry.index}
                  className={
                    "game-industry" +
                    (selectedIndustryIndex === industry.index
                      ? " selected"
                      : "")
                  }
                  onClick={() =>
                    setSelectedIndustryIndex(industry.index)
                  }
                >
                  <span className="game-industry-symbol">
                    ⚙
                  </span>
                  <span>
                    <strong>{industry.name}</strong>
                    <small>
                      Produces {pretty(industry.good)}
                    </small>
                  </span>
                  <span
                    className={
                      industry.can_produce
                        ? "game-industry-ready"
                        : "game-industry-busy"
                    }
                  >
                    {industry.can_produce
                      ? "Ready"
                      : "Occupied"}
                  </span>
                </button>
              ))}

              {industries.length === 0 && (
                <p className="game-empty">
                  No industries available.
                </p>
              )}
            </div>

            <button
              className="game-primary-button"
              disabled={
                !mainActionAvailable ||
                !selectedIndustry?.can_produce
              }
              onClick={() => {
                if (selectedIndustry) {
                  onProduce(selectedIndustry.index);
                }
              }}
            >
              {selectedIndustry
                ? `Produce ${pretty(selectedIndustry.good)}`
                : "Select an Industry"}
            </button>
          </div>

          <div className="game-turn-controls">
            <p>
              {game?.game_over
                ? "The game has ended."
                : game?.main_action_used
                  ? "Main action complete. End your turn."
                  : "Choose your main action."}
            </p>

            <button
              className="game-end-turn"
              onClick={onEndTurn}
              disabled={
                !game ||
                actionLoading ||
                !game.main_action_used ||
                game.game_over
              }
            >
              END TURN →
            </button>
          </div>
        </aside>
      </div>

      <section className="game-hand">
        <div className="game-section-heading">
          <div>
            <span className="game-overline">
              YOUR COLLECTION
            </span>
            <h2>Population Cards</h2>
          </div>
          <button
            className="game-secondary-button"
            onClick={onOpenCards}
          >
            View Cards
          </button>
        </div>

        <div className="game-card-row">
          {handCards.map((card, index) => (
            <button
              key={`${card.id}-${index}`}
              className={`game-population-card ${card.category}`}
              onClick={onOpenCards}
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

          {handCards.length === 0 && (
            <p className="game-empty">
              Your hand is empty.
            </p>
          )}
        </div>
      </section>

      <div className="game-status" role="status">
        <span>✦</span> {notice}
      </div>
    </div>
  );
}
