
import { pretty } from "../types";
import type { IndustryCatalogueSnapshot } from "../types";

type IslandSpace = IndustryCatalogueSnapshot["spaces"][number];

type InteractiveIslandBoardProps = {
  spaces: IslandSpace[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
};

type SpaceType = "land" | "coast" | "sea";

const areaOrder: SpaceType[] = ["land", "coast", "sea"];

const areaNames: Record<SpaceType, string> = {
  land: "Island Interior",
  coast: "Coastal District",
  sea: "Harbor Waters",
};

function isSpaceType(value: string): value is SpaceType {
  return areaOrder.some(type => type === value);
}

function getSpaceSymbol(space: IslandSpace): string {
  if (space.occupied) {
    if (space.type === "sea") return "⛵";
    if (space.type === "coast") return "⚓";
    return "⚒";
  }

  if (space.type === "sea") return "≈";
  if (space.type === "coast") return "⚓";
  return "+";
}

function IslandTile({
  space,
  selected,
  onSelect,
}: {
  space: IslandSpace;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "island-tile",
        `island-tile--${space.type}`,
        space.occupied ? "island-tile--occupied" : "island-tile--empty",
        selected ? "island-tile--selected" : "",
      ].join(" ")}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${space.id}, ${space.type}, ${
        space.construction ?? (space.occupied ? "Occupied" : "Empty")
      }`}
    >
      <span className="island-tile-id">{space.id}</span>

      <span className="island-tile-symbol" aria-hidden="true">
        {getSpaceSymbol(space)}
      </span>

      <span className="island-tile-name">
        {space.construction ??
          (space.occupied ? "Occupied" : "Empty")}
      </span>

      <span className="island-tile-state">
        {space.occupied ? "Built" : "Available"}
      </span>
    </button>
  );
}

export function InteractiveIslandBoard({
  spaces,
  selectedSpaceId,
  onSelectSpace,
}: InteractiveIslandBoardProps) {
  const selectedSpace =
    spaces.find(space => space.id === selectedSpaceId) ?? null;

  const occupiedCount = spaces.filter(space => space.occupied).length;

  return (
    <div className="interactive-island">
      <div className="interactive-island-header">
        <div>
          <span className="game-overline">YOUR TERRITORY</span>
          <h3>Home Island</h3>
        </div>

        <span className="interactive-island-count">
          {occupiedCount}/{spaces.length} occupied
        </span>
      </div>

      <div className="interactive-island-world">
        {areaOrder.map(area => {
          const areaSpaces = spaces.filter(
            space => isSpaceType(space.type) && space.type === area
          );

          if (areaSpaces.length === 0) return null;

          return (
            <section
              key={area}
              className={`island-region island-region--${area}`}
              aria-label={areaNames[area]}
            >
              <div className="island-region-heading">
                <span>{areaNames[area]}</span>
                <small>{areaSpaces.length} spaces</small>
              </div>

              <div className="island-tile-grid">
                {areaSpaces.map(space => (
                  <IslandTile
                    key={space.id}
                    space={space}
                    selected={space.id === selectedSpaceId}
                    onSelect={() => onSelectSpace(space.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {spaces.length === 0 && (
          <div className="game-empty">
            No island spaces are available.
          </div>
        )}
      </div>

      <div className="island-selection-panel">
        {selectedSpace ? (
          <>
            <span className="game-overline">SELECTED SPACE</span>

            <div className="island-selection-title">
              <strong>{selectedSpace.id}</strong>
              <span>{pretty(selectedSpace.type)}</span>
            </div>

            <p>
              {selectedSpace.construction ??
                (selectedSpace.occupied
                  ? "Occupied construction"
                  : "Empty construction space")}
            </p>

            <span
              className={
                selectedSpace.occupied
                  ? "island-selection-occupied"
                  : "island-selection-empty"
              }
            >
              {selectedSpace.occupied
                ? "Occupied"
                : "Available"}
            </span>
          </>
        ) : (
          <>
            <span className="game-overline">ISLAND INSPECTOR</span>
            <p>Select a tile to inspect its construction.</p>
          </>
        )}
      </div>
    </div>
  );
}
