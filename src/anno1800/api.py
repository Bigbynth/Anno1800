from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from pydantic import BaseModel, Field

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from anno1800.game import Game
from anno1800.models.population import PopulationType

from anno1800.actions.base import InvalidActionError
from anno1800.actions.festival import FestivalAction
from anno1800.actions.produce import ProduceAction


from anno1800.actions.expand import (
    ExpandAction,
    BuildIndustryStep,
)
from anno1800.data.industries import INDUSTRY_CATALOGUE
from anno1800.models.industry import OwnedIndustry



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

# Protect the single in-memory game from concurrent requests.
_game_lock = RLock()



class BuildIndustryRequest(BaseModel):
    industry_id: str = Field(min_length=1)
    space_id: str = Field(min_length=1)



class ProduceRequest(BaseModel):
    industry_index: int = Field(ge=0)


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



@app.get("/api/industries")
def get_industries() -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

        return {
            "industries": [
                {
                    "id": definition.id,
                    "name": definition.industry.name,
                    "good": definition.industry.good.value,
                    "worker_type": definition.industry.worker_type.value,
                    "build_cost": {
                        good.value: amount
                        for good, amount
                        in definition.industry.build_cost.items()
                    },
                    "remaining": game.state.industry_remaining(
                        definition.industry
                    ),
                    "already_owned": bool(
                        player.get_industries(
                            definition.industry
                        )
                    ),
                }
                for definition in INDUSTRY_CATALOGUE
            ],
            "spaces": [
                {
                    "id": space.id,
                    "type": space.space_type.value,
                    "occupied": not space.is_empty,
                    "construction": (
                        getattr(
                            getattr(
                                space.construction,
                                "industry",
                                space.construction,
                            ),
                            "name",
                            None,
                        )
                        if not space.is_empty else None
                    ),
                }
                for space in player.island.spaces
            ],
        }


def serialize_game(game: Game) -> dict:
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
                    tier.value: player.population.total(tier)
                    for tier in PopulationType
                },
                "industries": [
                    {
                        "index": index,
                        "name": owned.industry.name,
                        "good": owned.industry.good.value,
                        "worker_type": owned.industry.worker_type.value,
                        "occupied": owned.occupied,
                        "can_produce": owned.can_produce(
                            player.population
                        ),
                    }
                    for index, owned in enumerate(
                        player.get_all_industries()
                    )
                ],
            }
            for player in state.players
        ],
    }


@app.get("/api/game-state")
def game_state() -> dict:
    with _game_lock:
        return serialize_game(get_demo_game())



@app.post("/api/actions/festival")
def perform_festival() -> dict:
    with _game_lock:
        game = get_demo_game()

        try:
            result = game.perform_action(FestivalAction())
        except (InvalidActionError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc
        except RuntimeError as exc:
            raise HTTPException(
                status_code=409,
                detail=str(exc),
            ) from exc

        return {
            "message": result.message,
            "game": serialize_game(game),
        }


@app.post("/api/actions/produce")
def perform_production(request: ProduceRequest) -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

        industries = player.get_all_industries()

        if request.industry_index >= len(industries):
            raise HTTPException(
                status_code=404,
                detail="Industry not found",
            )

        industry = industries[request.industry_index]

        try:
            result = game.perform_action(
                ProduceAction(industry=industry)
            )
        except (InvalidActionError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc
        except RuntimeError as exc:
            raise HTTPException(
                status_code=409,
                detail=str(exc),
            ) from exc

        return {
            "message": result.message,
            "game": serialize_game(game),
        }


@app.post("/api/actions/build-industry")
def build_industry(
    request: BuildIndustryRequest,
) -> dict:
    with _game_lock:
        game = get_demo_game()

        if game.state.game_over:
            raise HTTPException(
                status_code=409,
                detail="The game is already over",
            )

        if game.turn_state.main_action_used:
            raise HTTPException(
                status_code=409,
                detail="Main action has already been used",
            )

        definition = next(
            (
                item
                for item in INDUSTRY_CATALOGUE
                if item.id == request.industry_id
            ),
            None,
        )

        if definition is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown industry",
            )

        player = game.current_player
        industry = definition.industry

        try:
            space = player.island.get_space(
                request.space_id
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=404,
                detail="Unknown island space",
            ) from exc

        if not space.is_empty:
            raise HTTPException(
                status_code=400,
                detail="Space is already occupied",
            )

        if not space.can_place(OwnedIndustry(industry)):
            raise HTTPException(
                status_code=400,
                detail="Industry cannot be built in this space",
            )

        # Step 63 supports construction without resource
        # production/trading steps. Never bypass build costs.
        if industry.build_cost:
            raise HTTPException(
                status_code=400,
                detail=(
                    "This industry requires resources. "
                    "Construction payment will be supported "
                    "in the next step."
                ),
            )

        try:
            result = game.perform_action(
                ExpandAction(
                    steps=[
                        BuildIndustryStep(
                            industry=industry,
                            space_id=request.space_id,
                        )
                    ]
                )
            )
        except (InvalidActionError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc
        except RuntimeError as exc:
            raise HTTPException(
                status_code=409,
                detail=str(exc),
            ) from exc

        return {
            "message": result.message,
            "game": serialize_game(game),
        }

@app.post("/api/actions/end-turn")
def end_current_turn() -> dict:
    with _game_lock:
        game = get_demo_game()
        previous_player = game.current_player.name

        try:
            game.end_turn()
        except (InvalidActionError, ValueError) as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc
        except RuntimeError as exc:
            raise HTTPException(
                status_code=409,
                detail=str(exc),
            ) from exc

        return {
            "message": f"{previous_player} ended their turn.",
            "game": serialize_game(game),
        }

