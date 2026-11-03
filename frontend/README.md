# Step 51 — Harbor UI foundation

An interactive React + TypeScript + Vite **frontend prototype** for the custom Anno 1800 Python board-game engine. The app uses a CSS/SVG illustrated island and a reusable card component. PixiJS is intentionally deferred until the interactive board and engine API are defined; it is not necessary for this first design-system milestone.

## Run

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). For a production bundle run `npm run build`.

## Included

- Harbor overview with five clickable, illustrative island locations and a details panel.
- Two sample companies, display-only round and resource panels.
- Old World, New World, Expedition and Objective catalogue tabs using **the actual invented JSON files** from `src/anno1800/data/official/` at the time of Step 51.
- Search, Old World population-tier filter, selectable cards and detailed inspector.
- A UI-only starting-hand preview; no game actions or server state changes.
- Responsive styling for desktop and mobile.

## Integration boundary

This milestone **does not connect to the Python engine**. Locations, players and the preview hand are UI fixtures. Do not treat the displayed board or resource values as real game state. The card catalogues are invented homebrew content, not official card transcriptions. If the Python JSON changes, recopy the four JSON files into `frontend/src/data/` until a FastAPI catalogue endpoint is added.

Next milestone: create a FastAPI read-only `/api/catalogue` endpoint and `/api/game-state` contract, then replace UI fixtures with backend state. Add PixiJS when board interactions need camera controls and richer animated sprites.
