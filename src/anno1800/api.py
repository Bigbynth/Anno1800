from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from anno1800.game import Game
from anno1800.models.population import PopulationType

app = FastAPI(title="Anno 1800 Board Game API", version="0.2.0")

app.add_middleware(CORSMiddleware, allow_origins= ["http://localhost:5173","http://127.0.0.1:5173",],
                   allow_methods=["GET"], allow_headers=["*"])

DATA_DIR = Path(__file__).parent / "data" / "official"

DECK_FILES  = {
    "population": "population.json",
    "new_world": "new_world.json",
    "expedition": "expedition.json",
    "objectives": "objectives.json"
    }

_demo_game: Game | None = None

def get_demo_game() -> Game:
    global _demo_game

    if _demo_game is None:
        _demo_game = Game.from_names(["Your Company", "Rival Company"], 
                                     use_custom_population=True,
                                     use_custom_new_world=True,
                                     use_custom_expeditions=True,
                                     use_custom_objectives=True)

    return _demo_game


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/catalogue")
def catalogue() -> dict[str, list[dict]]:
    return {
        deck: json.loads(
            (DATA_DIR / filename).read_text(encoding="utf-8")
        ) for deck, filename in DECK_FILES.items()
    }

@app.get("/api/game-state")
def game_state() -> dict:
    game = get_demo_game()
    state = game.state

    return {
        "round": state.turn_number,
        "current_player_index": state.current_player_index,
        "phase": state.end_game_phase.value,
        "game_over": state.game_over,
        "main_action_used": game.turn_state.main_action_used,
        "players": [
            {
                "name": player.name,
                "gold": player.gold,
                "victory_points": player.total_victory_points(),
                "hand": [card.id for card in player.hand],
                "population": {
                    tier.value: player.population.total(tier) for tier in PopulationType
                },
            } for player in state.players
        ],
    }