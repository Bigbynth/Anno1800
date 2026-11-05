

import { useEffect, useMemo, useRef, useState } from "react";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { IndustryCatalogueSnapshot } from "../types";

type IslandSpace =
  IndustryCatalogueSnapshot["spaces"][number];

type Props = {
  spaces: IndustryCatalogueSnapshot["spaces"];
  selectedSpaceId: string | null;
  onSelectSpace: (id: string) => void;
  constructionMode?: boolean;
  candidateSpaceIds?: string[];
};

type Position = {
  space: IslandSpace;
  x: number;
  y: number;
};

type Camera = {
  x: number;
  y: number;
  scale: number;
};

type BoardPoint = {
  x: number;
  y: number;
};

const BOARD_WIDTH = 1100;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_FACTOR = 1.2;

const INITIAL_CAMERA: Camera = {
  x: 0,
  y: 0,
  scale: 1,
};

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}

function clampCamera(
  camera: Camera,
  boardHeight: number
): Camera {
  const scale = clamp(
    camera.scale,
    MIN_ZOOM,
    MAX_ZOOM
  );

  return {
    scale,
    x: clamp(
      camera.x,
      BOARD_WIDTH * (1 - scale),
      0
    ),
    y: clamp(
      camera.y,
      boardHeight * (1 - scale),
      0
    ),
  };
}

function zoomCamera(
  camera: Camera,
  nextScale: number,
  anchor: BoardPoint,
  boardHeight: number
): Camera {
  const scale = clamp(
    nextScale,
    MIN_ZOOM,
    MAX_ZOOM
  );

  const ratio = scale / camera.scale;

  return clampCamera(
    {
      scale,
      x: anchor.x - (anchor.x - camera.x) * ratio,
      y: anchor.y - (anchor.y - camera.y) * ratio,
    },
    boardHeight
  );
}

const REGION_LABELS = {
  land: "INDUSTRIAL DISTRICT",
  coast: "COASTAL DISTRICT",
  sea: "HARBOR WATERS",
} as const;

const REGION_WIDTH = 3;
const TILE_GAP_X = 146;
const TILE_GAP_Y = 118;

function formatConstruction(value: string | null | undefined) {
  if (!value) return "Empty";
  return value.replace(/[_-]/g, " ");
}

function getSpaceSymbol(space: IslandSpace): string {
  if (space.occupied) {
    if (space.type === "sea") return "⛵";
    if (space.type === "coast") return "⚓";
    return "⚙";
  }

  if (space.type === "sea") return "≈";
  if (space.type === "coast") return "⚓";
  return "+";
}

function createPositions(
  spaces: IslandSpace[],
  startY: number
): Position[] {
  return spaces.map((space, index) => ({
    space,
    x: 340 + (index % REGION_WIDTH) * TILE_GAP_X,
    y: startY + Math.floor(index / REGION_WIDTH) * TILE_GAP_Y,
  }));
}

export function IslandCanvas({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  constructionMode = false,
  candidateSpaceIds = [],
}: Props) {
  const [hoveredSpaceId, setHoveredSpaceId] =
    useState<string | null>(null);

  const [camera, setCamera] = useState<Camera>(
    INITIAL_CAMERA
  );
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    previous: BoardPoint;
  } | null>(null);

  const layout = useMemo(() => {
    const land = spaces.filter(space => space.type === "land");
    const coast = spaces.filter(space => space.type === "coast");
    const sea = spaces.filter(space => space.type === "sea");

    const landRows = Math.max(
      1,
      Math.ceil(land.length / REGION_WIDTH)
    );

    const coastRows = Math.max(
      1,
      Math.ceil(coast.length / REGION_WIDTH)
    );

    const seaRows = Math.max(
      1,
      Math.ceil(sea.length / REGION_WIDTH)
    );

    const landY = 195;
    const coastY = landY + landRows * TILE_GAP_Y + 24;
    const seaY = coastY + coastRows * TILE_GAP_Y + 45;

    return {
      land: createPositions(land, landY),
      coast: createPositions(coast, coastY),
      sea: createPositions(sea, seaY),
      landY,
      coastY,
      seaY,
      height: seaY + seaRows * TILE_GAP_Y + 90,
    };
  }, [spaces]);

  const allPositions = [
    ...layout.land,
    ...layout.coast,
    ...layout.sea,
  ];

  const hoveredSpace = spaces.find(
    space => space.id === hoveredSpaceId
  );

  const selectedSpace = spaces.find(
    space => space.id === selectedSpaceId
  );

  function getBoardPoint(
    clientX: number,
    clientY: number
  ): BoardPoint | null {
    const svg = svgRef.current;

    if (!svg) return null;

    const matrix = svg.getScreenCTM();

    if (!matrix) return null;

    const point = svg.createSVGPoint();

    point.x = clientX;
    point.y = clientY;

    const result = point.matrixTransform(matrix.inverse());

    return {
      x: result.x,
      y: result.y,
    };
  }

  function changeZoom(factor: number) {
    setCamera(current =>
      zoomCamera(
        current,
        current.scale * factor,
        {
          x: BOARD_WIDTH / 2,
          y: layout.height / 2,
        },
        layout.height
      )
    );
  }

  function resetCamera() {
    setCamera(INITIAL_CAMERA);
  }

  function focusSelection() {
    if (!selectedSpace) return;

    const target = allPositions.find(
      item => item.space.id === selectedSpace.id
    );

    if (!target) return;

    setCamera(current => {
      const scale = Math.max(current.scale, 1.8);

      return clampCamera(
        {
          scale,
          x: BOARD_WIDTH / 2 - target.x * scale,
          y: layout.height / 2 - target.y * scale,
        },
        layout.height
      );
    });
  }

  function handlePointerDown(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (event.button !== 0) return;

    // Tile clicks must continue selecting spaces.
    // Start camera dragging only on the board background.
    if (
      event.target instanceof Element &&
      event.target.closest(".svg-board-space")
    ) {
      return;
    }

    const point = getBoardPoint(
      event.clientX,
      event.clientY
    );

    if (!point) return;

    dragRef.current = {
      pointerId: event.pointerId,
      previous: point,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const nextPoint = getBoardPoint(
      event.clientX,
      event.clientY
    );

    if (!nextPoint) return;

    const dx = nextPoint.x - drag.previous.x;
    const dy = nextPoint.y - drag.previous.y;

    drag.previous = nextPoint;

    setCamera(current =>
      clampCamera(
        {
          ...current,
          x: current.x + dx,
          y: current.y + dy,
        },
        layout.height
      )
    );
  }

  function handlePointerEnd(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    setIsDragging(false);

    if (
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();

      const point = getBoardPoint(
        event.clientX,
        event.clientY
      );

      if (!point) return;

      const factor =
        event.deltaY < 0
          ? ZOOM_FACTOR
          : 1 / ZOOM_FACTOR;

      setCamera(current =>
        zoomCamera(
          current,
          current.scale * factor,
          point,
          layout.height
        )
      );
    }

    svg.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      svg.removeEventListener("wheel", handleWheel);
    };
  }, [layout.height]);

  function renderSpace({ space, x, y }: Position) {
    const selected = selectedSpaceId === space.id;
    const hovered = hoveredSpaceId === space.id;
    
    const isCandidate =
      constructionMode && candidateSpaceIds.includes(space.id);

    
    const className = [
      "svg-board-space",
      `svg-board-space--${space.type}`,
      space.occupied ? "is-occupied" : "is-empty",
      selected ? "is-selected" : "",
      hovered ? "is-hovered" : "",
      isCandidate ? "is-construction-candidate" : "",
      constructionMode && !isCandidate
        ? "is-construction-inactive"
        : "",
    ].filter(Boolean).join(" ");

    return (
      <g
        key={space.id}
        className={className}
        transform={`translate(${x} ${y})`}
        role="button"
        tabIndex={0}
        aria-label={[
          `Space ${space.id}`,
          space.type,
          space.occupied
            ? `Occupied: ${formatConstruction(space.construction)}`
            : "Empty",
        ].join(", ")}
        aria-pressed={selected}
        onClick={() => onSelectSpace(space.id)}
        onMouseEnter={() => setHoveredSpaceId(space.id)}
        onMouseLeave={() => setHoveredSpaceId(null)}
        onFocus={() => setHoveredSpaceId(space.id)}
        onBlur={() => setHoveredSpaceId(null)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectSpace(space.id);
          }
        }}
      >
        <title>
          {space.id} —{" "}
          {space.occupied
            ? formatConstruction(space.construction)
            : "Empty"}
        </title>

        <ellipse
          className="svg-board-space-shadow"
          cx="0"
          cy="10"
          rx="55"
          ry="43"
        />

        <rect
          className="svg-board-space-base"
          x="-55"
          y="-44"
          width="110"
          height="88"
          rx="14"
        />

        <rect
          className="svg-board-space-inset"
          x="-47"
          y="-36"
          width="94"
          height="72"
          rx="9"
        />

        <text
          className="svg-board-space-icon"
          textAnchor="middle"
          y="0"
        >
          {getSpaceSymbol(space)}
        </text>

        <text
          className="svg-board-space-id"
          textAnchor="middle"
          y="27"
        >
          {space.id}
        </text>
        {isCandidate && !selected && (
          <rect
            className="svg-construction-candidate-ring"
            x="-61"
            y="-50"
            width="122"
            height="100"
            rx="17"
            fill="none"
            pointerEvents="none"
          />
        )}
      </g>
    );
  }

  return (
    <div className="svg-island-canvas">
      <div className="svg-board-heading">
        <span>THE OLD WORLD</span>
        <span>
          {spaces.length} board spaces
        </span>
      </div>

      <svg
        ref={svgRef}
        className={[
          "svg-board",
          isDragging ? "is-dragging" : "",
        ].join(" ")}
        viewBox={`0 0 ${BOARD_WIDTH} ${layout.height}`}
        preserveAspectRatio="xMidYMin meet"
        role="group"
        aria-label="Old World island board"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <defs>
          <linearGradient id="island-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a7282" />
            <stop offset="100%" stopColor="#153849" />
          </linearGradient>

          <linearGradient id="island-grass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9bb184" />
            <stop offset="100%" stopColor="#536e52" />
          </linearGradient>

          <linearGradient id="island-shore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cbbb8b" />
            <stop offset="100%" stopColor="#9d906d" />
          </linearGradient>

          <linearGradient id="island-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f2e4ba" />
            <stop offset="100%" stopColor="#b9a479" />
          </linearGradient>

          <pattern
            id="island-chart-lines"
            width="90"
            height="90"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 90 0 L 0 0 0 90"
              fill="none"
              stroke="#d6e3d9"
              strokeWidth="0.8"
              opacity="0.12"
            />
          </pattern>
        </defs>

        {/* STATIC OCEAN BACKGROUND */}
        <rect
          x="0"
          y="0"
          width={BOARD_WIDTH}
          height={layout.height}
          fill="url(#island-sea)"
        />

        <rect
          x="0"
          y="0"
          width={BOARD_WIDTH}
          height={layout.height}
          fill="url(#island-chart-lines)"
        />

        {/* CAMERA-TRANSFORMED GAME WORLD */}
        <g
          className="svg-board-world"
          transform={`
            translate(${camera.x} ${camera.y})
            scale(${camera.scale})
          `}
        >
          {/* ILLUSTRATED ISLAND */}

        <path
          className="svg-island-shoreline"
          d={`
            M 150 138
            Q 130 78 240 62
            Q 350 25 500 67
            Q 680 25 790 73
            Q 930 78 958 175
            L 960 ${layout.coastY + 52}
            Q 910 ${layout.coastY + 112}
              785 ${layout.coastY + 100}
            Q 600 ${layout.coastY + 140}
              475 ${layout.coastY + 102}
            Q 280 ${layout.coastY + 145}
              158 ${layout.coastY + 75}
            Q 105 ${layout.coastY + 20} 150 138
            Z
          `}
          fill="url(#island-shore)"
        />

        <path
          className="svg-island-landmass"
          d={`
            M 173 148
            Q 157 96 260 83
            Q 365 51 496 88
            Q 677 48 777 93
            Q 900 94 929 180
            L 930 ${layout.coastY + 28}
            Q 880 ${layout.coastY + 88}
              774 ${layout.coastY + 76}
            Q 600 ${layout.coastY + 113}
              474 ${layout.coastY + 77}
            Q 290 ${layout.coastY + 120}
              178 ${layout.coastY + 55}
            Q 135 ${layout.coastY + 10} 173 148
            Z
          `}
          fill="url(#island-grass)"
        />

        {/* DECORATIVE CARTOGRAPHY */}
        <g className="svg-board-contours">
          <path
            d="M 230 125 Q 320 75 425 124"
            fill="none"
          />
          <path
            d="M 640 135 Q 750 82 857 151"
            fill="none"
          />
          <path
            d={`
              M 190 ${layout.coastY - 12}
              Q 400 ${layout.coastY + 30}
                570 ${layout.coastY - 13}
            `}
            fill="none"
          />
        </g>

        {/* REGION LABELS */}
        <text
          className="svg-board-region-label"
          x="55"
          y="125"
        >
          {REGION_LABELS.land}
        </text>

        <text
          className="svg-board-region-label"
          x="55"
          y={layout.coastY - 36}
        >
          {REGION_LABELS.coast}
        </text>

        <text
          className="svg-board-region-label svg-board-region-label--sea"
          x="55"
          y={layout.seaY - 40}
        >
          {REGION_LABELS.sea}
        </text>

        {/* LAND TILES */}
        <g className="svg-board-land-spaces">
          {layout.land.map(renderSpace)}
        </g>

        {/* COAST TILES */}
        <g className="svg-board-coast-spaces">
          {layout.coast.map(renderSpace)}
        </g>

          {/* SEA TILES */}
          <g className="svg-board-sea-spaces">
            {layout.sea.map(renderSpace)}
          </g>
        </g>
        {/* END CAMERA-TRANSFORMED WORLD */}

        {/* COMPASS */}

        <g
          className="svg-board-compass"
          transform="translate(1018 105)"
          aria-hidden="true"
        >
          <circle r="48" />
          <circle r="36" />
          <path d="M 0 -42 L 10 0 L 0 42 L -10 0 Z" />
          <path d="M -42 0 L 0 -10 L 42 0 L 0 10 Z" />
          <text textAnchor="middle" y="-55">N</text>
        </g>

        {/* CHART FOOTER */}
        <text
          className="svg-board-footer-text"
          x="35"
          y={layout.height - 32}
        >
          ANNO 1800 · THE ARCHIPELAGO
        </text>
      </svg>

      {/* NAUTICAL CAMERA CONTROLS */}
      <div
        className="svg-camera-controls"
        aria-label="Board camera controls"
      >
        <button
          type="button"
          onClick={() => changeZoom(ZOOM_FACTOR)}
          disabled={camera.scale >= MAX_ZOOM}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>

        <span className="svg-camera-zoom" aria-live="off">
          {Math.round(camera.scale * 100)}%
        </span>

        <button
          type="button"
          onClick={() => changeZoom(1 / ZOOM_FACTOR)}
          disabled={camera.scale <= MIN_ZOOM}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>

        <div className="svg-camera-divider" />

        <button
          type="button"
          onClick={focusSelection}
          disabled={!selectedSpace}
          aria-label="Focus selected space"
          title="Focus selected space"
        >
          ◎
        </button>

        <button
          type="button"
          onClick={resetCamera}
          aria-label="Reset camera"
          title="Reset camera"
        >
          ⌂
        </button>
      </div>

      <div className="svg-board-status" role="status">

        {hoveredSpace ? (
          <>
            <strong>{hoveredSpace.id}</strong>
            <span>
              {formatConstruction(hoveredSpace.construction)}
            </span>
          </>
        ) : selectedSpace ? (
          <>
            <strong>Selected: {selectedSpace.id}</strong>
            <span>
              {formatConstruction(selectedSpace.construction)}
            </span>
          </>
        ) : (
          <span>
            Select a space to inspect its details.
          </span>
        )}
      </div>
    </div>
  );
}
