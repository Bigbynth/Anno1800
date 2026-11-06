import { useState } from "react";
import type { NewWorldIslandSnapshot } from "../types";
import { NavalCapacityDisplay } from "./NavalCapacityDisplay";
import { ResourceToken } from "./ResourceToken";

type Props = {
  islands: NewWorldIslandSnapshot[];
  playerName: string;
  tradeCapacity?: number | null;
  explorationCapacity?: number | null;
  onClose: () => void;
  onExplore: () => void;
  canExplore: boolean;
};

export function NewWorldAtlas({
  islands,
  playerName,
  tradeCapacity = null,
  explorationCapacity = null,
  onClose,
  onExplore,
  canExplore,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );

  const selectedIsland =
    islands.find(island => island.id === selectedId) ??
    islands[0] ??
    null;

  const handleExplore = () => {
    if (!canExplore) return;
    onClose();
    onExplore();
  };

  return (
    <div
      className="new-world-atlas-backdrop"
      onClick={onClose}
    >
      <section
        className="new-world-atlas"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-world-atlas-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="new-world-atlas-header">
          <div>
            <span className="construction-palette-eyebrow">
              MARITIME CARTOGRAPHY
            </span>

            <h2 id="new-world-atlas-title">
              The New World
            </h2>

            <p>
              Discovered territories of {playerName}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close New World Atlas"
            onClick={onClose}
            className="new-world-atlas-close"
          >
            ×
          </button>
        </header>

        <div className="new-world-atlas-overview">
          <div>
            <small>Discovered islands</small>
            <strong>{islands.length} / 4</strong>
          </div>

          <div>
            <small>Known resource types</small>
            <strong>
              {
                new Set(
                  islands.flatMap(island => island.resources)
                ).size
              }
            </strong>
          </div>
        </div>

        {/* STEP 91 — NAVAL CAPACITY */}
        <NavalCapacityDisplay
          tradeCapacity={tradeCapacity}
          explorationCapacity={explorationCapacity}
          compact
        />

        <div className="new-world-atlas-content">
          <div
            className="new-world-atlas-island-list"
            aria-label="Discovered islands"
          >
            {islands.length === 0 && (
              <div className="new-world-atlas-empty">
                <strong>Uncharted Waters</strong>
                <p>
                  You have not discovered a New World
                  island yet. Launch an expedition
                  to reveal your first island.
                </p>
              </div>
            )}

            {islands.map((island, index) => (
              <button
                key={island.id}
                type="button"
                className={[
                  "new-world-atlas-island",
                  selectedIsland?.id === island.id
                    ? "is-selected"
                    : "",
                ].join(" ")}
                aria-pressed={selectedIsland?.id === island.id}
                onClick={() => setSelectedId(island.id)}
              >
                <span className="new-world-atlas-number">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <span className="new-world-atlas-island-name">
                  <strong>{island.name}</strong>
                  <small>
                    {island.resources.length} resource slots
                  </small>
                </span>

                <span aria-hidden="true">⌖</span>
              </button>
            ))}
          </div>

          <div className="new-world-atlas-details">
            {selectedIsland ? (
              <>
                <div className="new-world-atlas-landscape">
                  <div
                    className="new-world-atlas-landmass"
                    aria-hidden="true"
                  >
                    <span>◆</span>
                  </div>

                  <span className="new-world-atlas-landscape-label">
                    DISCOVERED TERRITORY
                  </span>
                </div>

                <div className="new-world-atlas-island-heading">
                  <span className="construction-palette-eyebrow">
                    ISLAND RECORD
                  </span>

                  <h3>{selectedIsland.name}</h3>

                  <small>ID: {selectedIsland.id}</small>
                </div>

                <div className="new-world-atlas-resources">
                  <strong>Native Resources</strong>

                  <div className="new-world-atlas-resource-list">
                    {selectedIsland.resources.map(
                      (good, index) => (
                        <ResourceToken
                          key={`${good}-${index}`}
                          good={good}
                        />
                      )
                    )}
                  </div>
                </div>

                <p className="new-world-atlas-note">
                  These are the resources associated
                  with the discovered island. They are
                  not stored inventory and are not
                  automatically available as payments.
                </p>
              </>
            ) : (
              <div className="new-world-atlas-empty">
                <strong>No territory selected</strong>
                <p>
                  Explore the New World to discover
                  islands and inspect their resources.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="new-world-atlas-footer">
          <p>
            Your expedition results and island resources
            are read from the Python game engine.
          </p>

          <div className="new-world-atlas-actions">
            <button
              type="button"
              className="new-world-atlas-secondary"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="new-world-atlas-primary"
              onClick={handleExplore}
              disabled={!canExplore}
            >
              Explore New World
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
