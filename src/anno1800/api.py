from __future__ import annotations

from anno1800.actions.explore_new_world import (
    ExploreNewWorldAction,
)
import json
from pathlib import Path
from threading import RLock
from pydantic import BaseModel, Field
from collections import Counter

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from anno1800.game import Game
import random

from anno1800.services.game_persistence import (
    SAVE_VERSION,
    SaveError,
    save_game,
    load_game,
    list_saves,
)

from anno1800.actions.base import InvalidActionError
from anno1800.actions.festival import FestivalAction
from anno1800.actions.produce import ProduceAction

from anno1800.actions.fulfill_population_card import (
    FulfillPopulationCardAction,
    ProduceForCardStep,
    TradeForCardStep,
    NewWorldForCardStep,
)

from anno1800.models.new_world import NewWorldProductionRequest
from anno1800.actions.expand import (
    ExpandAction,
    BuildIndustryStep,
    RemoveConstructionStep,
    BuildShipStep,
    BuildShipyardStep
)

from anno1800.data.industries import INDUSTRY_CATALOGUE
from anno1800.data.ships import SHIP_CATALOGUE
from anno1800.data.shipyards import SHIPYARD_CATALOGUE

from anno1800.models.industry import OwnedIndustry
from anno1800.models.ship import Ship, Shipyard, NavalTokenType
from anno1800.models.population import PopulationType

from anno1800.models.objective import (
    IndustryObjectiveRule,
    PopulationObjectiveRule,
    ResourceObjectiveRule,
)
from anno1800.services.objective_scoring import score_objective
from anno1800.scoring import ScoringEngine


from typing import Literal

from anno1800.actions.expand import (
    ProduceStep,
    TradeStep,
)
from anno1800.models.goods import Good
from anno1800.models.trade import TradeRequest



app = FastAPI(title="Anno 1800 Board Game API", version="0.2.0")

app.add_middleware(CORSMiddleware, allow_origins= ["http://localhost:5173","http://127.0.0.1:5173",],
                   allow_methods=["GET", "POST"], allow_headers=["*"])

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

# STEP 95 — SERVER-SIDE ACTION HISTORY
#
# History belongs to the current in-memory game session.
# Keep a bounded record of successful actions only.

_action_history: list[dict] = []
_next_action_event_id = 1
_MAX_ACTION_HISTORY = 500


def record_game_action(
    game: Game,
    action_type: str,
    message: str,
    actor_index: int | None = None,
    round_number: int | None = None,
) -> None:
    """Record a successfully completed game action.

    Call while holding _game_lock, after the engine succeeds.
    """
    global _next_action_event_id

    if actor_index is None:
        actor_index = game.state.current_player_index

    if round_number is None:
        round_number = game.state.turn_number

    actor = game.state.players[actor_index]

    event = {
        "id": _next_action_event_id,
        "round": round_number,
        "player_index": actor_index,
        "player_name": actor.name,
        "action_type": action_type,
        "message": message,
    }

    _action_history.append(event)
    _next_action_event_id += 1

    # Prevent unlimited memory growth.
    if len(_action_history) > _MAX_ACTION_HISTORY:
        del _action_history[:-_MAX_ACTION_HISTORY]



class BuildIndustryRequest(BaseModel):
    industry_id: str = Field(min_length=1)
    space_id: str = Field(min_length=1)


class ConstructionPaymentStep(BaseModel):
    source: Literal["produce", "trade"]
    good: Good
    industry_index: int | None = Field(default=None, ge=0)
    partner_index: int | None = Field(default=None, ge=0)


class PopulationCardPaymentStep(BaseModel):
    source: Literal["produce", "trade", "new_world"]
    good: Good
    industry_index: int | None = Field(default=None, ge=0)
    partner_index: int | None = Field(default=None, ge=0)
    island_id: str | None = None


class GameSetupSettings(BaseModel):
    use_custom_population: bool = True
    use_custom_new_world: bool = True
    use_custom_expeditions: bool = True
    use_custom_objectives: bool = True


class NewGameRequest(BaseModel):
    player_names: list[str]
    settings: GameSetupSettings = Field(
        default_factory=GameSetupSettings
    )


def validate_new_game_request(
    request: NewGameRequest,
) -> list[str]:
    """Validate and normalize a new-game request."""

    names = [
        name.strip()
        for name in request.player_names
    ]

    if not 2 <= len(names) <= 4:
        raise HTTPException(
            status_code=400,
            detail="A game must have 2 to 4 companies.",
        )

    if any(not name for name in names):
        raise HTTPException(
            status_code=400,
            detail="Company names cannot be empty.",
        )

    if any(len(name) > 40 for name in names):
        raise HTTPException(
            status_code=400,
            detail="Company names must be at most 40 characters.",
        )

    if len({name.casefold() for name in names}) != len(names):
        raise HTTPException(
            status_code=400,
            detail="Company names must be unique.",
        )

    return names


class FulfillPopulationCardRequest(BaseModel):
    card_id: str = Field(min_length=1)
    payments: list[PopulationCardPaymentStep] = Field(
        default_factory=list,
        max_length=30,
    )

class AdvancedBuildRequest(BaseModel):
    industry_id: str = Field(min_length=1)
    space_id: str = Field(min_length=1)
    build_over: bool = False
    payments: list[ConstructionPaymentStep] = Field(
        default_factory=list,
        max_length=20,
    )


class NavalBuildRequest(BaseModel):
    construction_type: Literal["shipyard", "ship"]
    definition_id: str = Field(min_length=1)
    space_id: str = Field(min_length=1)
    shipyard_index: int | None = Field(default=None, ge=0)
    payments: list[ConstructionPaymentStep] = Field(
        default_factory=list,
        max_length=20,
    )


class RemoveConstructionRequest(BaseModel):
    space_id: str = Field(min_length=1)

class ProduceRequest(BaseModel):
    industry_index: int = Field(ge=0)



def create_new_game(
    player_names: list[str],
    settings: GameSetupSettings | None = None,
) -> Game:
    """Create a fresh game using selected engine options."""

    if settings is None:
        settings = GameSetupSettings()

    return Game.from_names(
        player_names,
        use_custom_population=settings.use_custom_population,
        use_custom_new_world=settings.use_custom_new_world,
        use_custom_expeditions=settings.use_custom_expeditions,
        use_custom_objectives=settings.use_custom_objectives,
    )



def get_demo_game() -> Game:
    """Return the current game, initializing it if necessary."""
    global _demo_game

    if _demo_game is None:
        _demo_game = create_new_game(
            ["Your Company", "Rival Company"]
        )

    return _demo_game

@app.get("/api/action-history")
def get_action_history() -> dict:
    with _game_lock:
        return {
            "events": list(reversed(_action_history)),
            "total_recorded": _next_action_event_id - 1,
            "retained": len(_action_history),
        }


# STEP 96 — SAVE / LOAD GAME


@app.get("/api/saves")
def get_save_slots() -> dict:
    with _game_lock:
        return {
            "save_format_version": SAVE_VERSION,
            "slots": list_saves(),
        }

@app.post("/api/saves/{slot}")
def save_current_game(slot: str) -> dict:
    with _game_lock:
        game = get_demo_game()

        try:
            metadata = save_game(
                slot=slot,
                game=game,
                history=_action_history,
                next_event_id=_next_action_event_id,
            )
        except SaveError as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

        return {
            "message": f"Game saved to {slot}.",
            "metadata": metadata,
        }


@app.post("/api/saves/{slot}/load")
def load_saved_game(slot: str) -> dict:
    global _demo_game
    global _action_history
    global _next_action_event_id

    with _game_lock:
        try:
            data = load_game(slot)
        except SaveError as exc:
            raise HTTPException(
                status_code=400,
                detail=str(exc),
            ) from exc

        restored_game = data["game"]

        # Verify basic consistency before replacing the
        # running game.
        state = restored_game.state

        if not state.players:
            raise HTTPException(
                status_code=400,
                detail="Save has no players.",
            )

        if not (
            0 <= state.current_player_index
            < len(state.players)
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid saved player index.",
            )

        # Validate RNG state before replacing the game.
        try:
            rng = random.Random()
            rng.setstate(data["random_state"])
        except (TypeError, ValueError, KeyError) as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid saved random state.",
            ) from exc
        restored_snapshot = serialize_game(restored_game)
        # Only now replace the active session.
        _demo_game = restored_game
        _action_history = data["history"]
        _next_action_event_id = data["next_event_id"]
        random.setstate(data["random_state"])

        return {
            "message": f"Game loaded from {slot}.",
            "game": restored_snapshot,
        }


@app.post("/api/games/preview")
def preview_new_game(
    request: NewGameRequest,
) -> dict:
    """Validate setup without replacing the active game."""

    names = validate_new_game_request(request)

    with _game_lock:
        # Preserve Python's process-level RNG state so
        # the preview does not advance random draws
        # used by the active game.
        previous_random_state = random.getstate()

        try:
            # Construct an independent temporary game.
            preview_game = create_new_game(
                names,
                settings=request.settings,
            )

            snapshot = serialize_game(preview_game)

        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The engine could not initialize "
                    "this configuration: "
                    f"{exc}"
                ),
            ) from exc

        finally:
            random.setstate(previous_random_state)

        # Report only observable facts from the
        # temporary game's serialized starting state.
        players = snapshot["players"]
        objectives = snapshot.get("objectives")

        settings = request.settings

        return {
            "valid": True,
            "player_count": len(players),
            "players": [
                {
                    "name": player["name"],
                    "starting_hand_count": len(
                        player.get("hand", [])
                    ),
                }
                for player in players
            ],
            "initial_round": snapshot["round"],
            "active_objective_count": (
                len(objectives)
                if objectives is not None
                else None
            ),
            "settings": {
                "use_custom_population":
                    settings.use_custom_population,
                "use_custom_new_world":
                    settings.use_custom_new_world,
                "use_custom_expeditions":
                    settings.use_custom_expeditions,
                "use_custom_objectives":
                    settings.use_custom_objectives,
            },
            "warnings": [
                "Preview counts describe a temporary "
                "starting game. Randomized content may "
                "differ when the actual match is created.",
            ],
        }



@app.post("/api/games/new")
def start_new_game(request: NewGameRequest) -> dict:
    global _demo_game
    global _action_history
    global _next_action_event_id

    names = validate_new_game_request(request)
    if not 2 <= len(names) <= 4:
        raise HTTPException(
            status_code=400,
            detail="A game must have 2 to 4 players.",
        )

    if any(not name for name in names):
        raise HTTPException(
            status_code=400,
            detail="Player names cannot be empty.",
        )

    if any(len(name) > 40 for name in names):
        raise HTTPException(
            status_code=400,
            detail="Player names must be at most 40 characters.",
        )

    if len({name.casefold() for name in names}) != len(names):
        raise HTTPException(
            status_code=400,
            detail="Player names must be unique.",
        )

    with _game_lock:
        try:
            # Construct first. Do not destroy the current
            # session if initialization fails.
            new_game = create_new_game(
                                    names,
                                    settings=request.settings,
                                )

            # Verify it can be shown in the frontend.
            snapshot = serialize_game(new_game)

        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail="Unable to initialize a new game.",
            ) from exc

        # Commit the new session only after successful setup.
        _demo_game = new_game
        _action_history = []
        _next_action_event_id = 1

        return {
            "message": (
                f"New game created for {len(names)} companies."
            ),
            "game": snapshot,
        }

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


def serialize_objective_rule(rule) -> dict:
    if isinstance(rule, IndustryObjectiveRule):
        return {
            "type": "industry",
            "industries": list(rule.industries),
            "points_per_industry": rule.points_per_industry,
        }

    if isinstance(rule, PopulationObjectiveRule):
        return {
            "type": "population",
            "population_type": rule.population_type,
            "minimum": rule.minimum,
            "points": rule.points,
        }

    if isinstance(rule, ResourceObjectiveRule):
        return {
            "type": "resource",
            "resource": rule.resource,
            "minimum": rule.minimum,
            "points": rule.points,
        }

    raise TypeError(
        f"Unsupported scoring objective: {type(rule).__name__}"
    )


def serialize_game(game: Game) -> dict:
    state = game.state

    # STEP 119 — AUTHORITATIVE END-GAME RESULT
    final_result = (
        game.result()
        if state.game_over
        else None
    )

    return {
        "round": state.turn_number,
        "current_player_index": state.current_player_index,
        "phase": state.end_game_phase.value,
        "game_over": state.game_over,
        "main_action_used": game.turn_state.main_action_used,
        # STEP 119 — FINAL SCORING AND TIE-BREAKS
        "final_result": (
            None
            if final_result is None
            else {
                "winners": [
                    index
                    for index, player in enumerate(state.players)
                    if any(
                        winner is player
                        for winner in final_result.winners
                    )
                ],
                "scores": [
                    {
                        "player_index": index,
                        "population_cards": entry.score.population_cards,
                        "expeditions": entry.score.expeditions,
                        "gold": entry.score.gold,
                        "fireworks": entry.score.fireworks,
                        "objectives": entry.score.objectives,
                        "total": entry.score.total,
                    }
                    for index, entry in enumerate(
                        final_result.scores
                    )
                ],
            }
        ),
                
        # STEP 92 — Shared scoring objectives.
        "objectives": [
            {
                "id": card.id,
                "name": card.name,
                "objective_type": card.objective_type.value,
                "rule": serialize_objective_rule(card.rule),
                "scores": [
                    score_objective(card, player)
                    for player in state.players
                ],
            }
            for card in state.objective_cards
        ],

        # Live score preview; final scoring still belongs
        # to ScoringEngine when the game finishes.
        "score_preview": [
            {
                "player_index": index,
                "population_cards": score.population_cards,
                "expeditions": score.expeditions,
                "gold": score.gold,
                "fireworks": score.fireworks,
                "objectives": score.objectives,
                "total": score.total,
            }
            for index, player in enumerate(state.players)
            for score in [ScoringEngine().score_player(state, player)]
        ],

        "players": [
            {
                "name": player.name,
                "gold": player.gold,
                "victory_points": player.total_victory_points(),
                "hand": [card.id for card in player.hand],
                # STEP 117 — TRADE HISTORY FOR THE ACTIVE TURN
                "traded_goods_this_turn": sorted(
                    good.value
                    for good in player.traded_goods_this_turn
                ),
                "new_world_islands": [
                    {
                        "id": island.id,
                        "name": island.name,
                        "resources": [
                            good.value
                            for good in island.resources
                        ],
                    }
                    for island in player.new_world_islands
                ],
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
                
        record_game_action(
            game,
            action_type="festival",
            message=result.message,
        )

        return {
            "message": result.message,
            "game": serialize_game(game),
        }

@app.post("/api/actions/explore-new-world")
def explore_new_world() -> dict:
    with _game_lock:
        game = get_demo_game()

        try:
            result = game.perform_action(
                ExploreNewWorldAction()
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
  
        record_game_action(
            game,
            action_type="exploration",
            message=result.message,
        )

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
        
        record_game_action(
            game,
            action_type="production",
            message=result.message,
        )

        return {
            "message": result.message,
            "game": serialize_game(game),
        }



@app.post("/api/actions/build-industry")
def build_industry(request: AdvancedBuildRequest) -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

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
                item for item in INDUSTRY_CATALOGUE
                if item.id == request.industry_id
            ),
            None,
        )

        if definition is None:
            raise HTTPException(
                status_code=404,
                detail="Unknown industry",
            )

        industry = definition.industry

        try:
            space = player.island.get_space(request.space_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=404,
                detail="Unknown island space",
            ) from exc
  
        if request.build_over:
            if space.is_empty:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot replace an empty space",
                )
        else:
            if not space.can_place(OwnedIndustry(industry)):
                raise HTTPException(
                    status_code=400,
                    detail="Industry cannot be placed in this space",
                )
        if not space.can_place(OwnedIndustry(industry)):
            raise HTTPException(
                status_code=400,
                detail="Industry cannot be placed in this space",
            )

        # Validate the exact resource requirements.
        required = {
            good: amount
            for good, amount in industry.build_cost.items()
            if amount > 0
        }

        supplied: dict[Good, int] = {}

        for payment in request.payments:
            supplied[payment.good] = (
                supplied.get(payment.good, 0) + 1
            )

        if supplied != required:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Payment goods do not match "
                    "the industry build cost"
                ),
            )

        steps = []

        owned_industries = player.get_all_industries()

        for payment in request.payments:
            if payment.source == "produce":
                index = payment.industry_index

                if index is None or index >= len(owned_industries):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid production industry",
                    )

                owned = owned_industries[index]

                if owned.industry.good != payment.good:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Selected industry does not "
                            "produce the required good"
                        ),
                    )

                steps.append(
                    ProduceStep(industry=owned)
                )

            elif payment.source == "trade":
                index = payment.partner_index

                if (
                    index is None
                    or index >= len(game.state.players)
                    or index == game.state.current_player_index
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid trading partner",
                    )

                partner = game.state.players[index]

                if not any(
                    owned.industry.good == payment.good
                    for owned in partner.get_all_industries()
                ):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Trading partner cannot "
                            "supply the requested good"
                        ),
                    )

                steps.append(
                    TradeStep(
                        request=TradeRequest(
                            partner=partner,
                            good=payment.good,
                        )
                    )
                )

        # Construction must occur after all payments.        
        steps.append(
            BuildIndustryStep(
                industry=industry,
                space_id=request.space_id,
                build_over=request.build_over,
            )
        )

        try:
            result = game.perform_action(
                ExpandAction(steps=steps)
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
        
        record_game_action(
            game,
            action_type="industry_construction",
            message=result.message,
        )

        return {
            "message": result.message,
            "game": serialize_game(game),
        }


@app.post("/api/actions/remove-construction")
def remove_construction(
    request: RemoveConstructionRequest,
) -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

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

        try:
            space = player.island.get_space(
                request.space_id
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=404,
                detail="Unknown island space",
            ) from exc

        if space.is_empty:
            raise HTTPException(
                status_code=400,
                detail="Cannot demolish an empty space",
            )

        construction = space.construction

        construction_name = (
            construction.industry.name
            if isinstance(construction, OwnedIndustry)
            else construction.name
        )

        try:
            game.perform_action(
                ExpandAction(
                    steps=[
                        RemoveConstructionStep(
                            space_id=request.space_id
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

        
        message = (
            f"{player.name} demolished "
            f"{construction_name} at {request.space_id}"
        )

        record_game_action(
            game,
            action_type="demolition",
            message=message,
        )

        return {
            "message": message,
            "game": serialize_game(game),
        }


@app.post("/api/actions/end-turn")
def end_current_turn() -> dict:
    with _game_lock:
        game = get_demo_game()
        previous_player = game.current_player.name
        previous_player_index = game.state.current_player_index
        previous_round = game.state.turn_number

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
   
        message = f"{previous_player} ended their turn."

        record_game_action(
            game,
            action_type="end_turn",
            message=message,
            actor_index=previous_player_index,
            round_number=previous_round,
        )

        return {
            "message": message,
            "game": serialize_game(game),
        }


def make_construction_payment_steps(
    game: Game,
    payments: list[ConstructionPaymentStep],
    required_cost: dict[Good, int],
) -> list:
    player = game.current_player

    required = {
        good: amount
        for good, amount in required_cost.items()
        if amount > 0
    }

    supplied: dict[Good, int] = {}

    for payment in payments:
        supplied[payment.good] = (
            supplied.get(payment.good, 0) + 1
        )

    if supplied != required:
        raise HTTPException(
            status_code=400,
            detail="Payment goods do not match construction cost",
        )

    steps = []
    owned_industries = player.get_all_industries()

    for payment in payments:
        if payment.source == "produce":
            index = payment.industry_index

            if index is None or index >= len(owned_industries):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid production industry",
                )

            owned = owned_industries[index]

            if owned.industry.good != payment.good:
                raise HTTPException(
                    status_code=400,
                    detail="Industry produces the wrong good",
                )

            steps.append(ProduceStep(industry=owned))

        elif payment.source == "trade":
            index = payment.partner_index

            if (
                index is None
                or index >= len(game.state.players)
                or index == game.state.current_player_index
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid trading partner",
                )

            partner = game.state.players[index]

            if not any(
                owned.industry.good == payment.good
                for owned in partner.get_all_industries()
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Trading partner cannot supply this good",
                )

            steps.append(
                TradeStep(
                    request=TradeRequest(
                        partner=partner,
                        good=payment.good,
                    )
                )
            )

    return steps



@app.get("/api/naval-catalogue")
def get_naval_catalogue() -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

        return {
            "shipyards": [
                {
                    "id": definition.id,
                    "name": definition.shipyard.name,
                    "strength": definition.shipyard.strength,
                    "build_cost": {
                        good.value: amount
                        for good, amount
                        in definition.shipyard.build_cost.items()
                    },
                    "remaining": game.state.shipyard_remaining(
                        definition.shipyard
                    ),
                }
                for definition in SHIPYARD_CATALOGUE
            ],
            "ships": [
                {
                    "id": definition.id,
                    "name": definition.ship.name,
                    "type": definition.ship.ship_type.value,
                    "strength": definition.ship.strength,
                    "trade_tokens": definition.ship.trade_token,
                    "exploration_tokens": (
                        definition.ship.exploration_tokens
                    ),
                    "build_cost": {
                        good.value: amount
                        for good, amount
                        in definition.ship.build_cost.items()
                    },
                    "remaining": game.state.ship_remaining(
                        definition.ship
                    ),
                }
                for definition in SHIP_CATALOGUE
            ],
            "owned_shipyards": [
                {
                    "index": index,
                    "name": shipyard.name,
                    "strength": shipyard.strength,
                }
                for index, shipyard in enumerate(player.shipyards)
            ],
            "owned_ships": [
                {
                    "name": ship.name,
                    "type": ship.ship_type.value,
                    "strength": ship.strength,
                }
                for ship in player.ships
            ],
            "naval_capacity": {
                "trade": player.available_ship_capacity(
                    NavalTokenType.TRADE
                ),
                "exploration": player.available_ship_capacity(
                    NavalTokenType.EXPLORATION
                ),
            },
            # STEP 118 — TOTAL NAVAL TOKEN CAPACITY
            "naval_token_totals": {
                "trade": sum(
                    1
                    for token in player.naval_tokens
                    if token.token_type == NavalTokenType.TRADE
                ),
                "exploration": sum(
                    1
                    for token in player.naval_tokens
                    if token.token_type == NavalTokenType.EXPLORATION
                ),
            },

                        "spaces": [
                {
                    "id": space.id,
                    "type": space.space_type.value,
                    "occupied": not space.is_empty,
                }
                for space in player.island.spaces
            ],
        }


@app.post("/api/actions/build-naval")
def build_naval(request: NavalBuildRequest) -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

        if game.state.game_over:
            raise HTTPException(
                status_code=409,
                detail="Game is already finished",
            )

        if game.turn_state.main_action_used:
            raise HTTPException(
                status_code=409,
                detail="Main action already used",
            )

        try:
            space = player.island.get_space(request.space_id)
        except ValueError as exc:
            raise HTTPException(
                status_code=404,
                detail="Unknown island space",
            ) from exc

        if not space.is_empty:
            raise HTTPException(
                status_code=400,
                detail="Construction space is occupied",
            )

        if request.construction_type == "shipyard":
            definition = next(
                (
                    item for item in SHIPYARD_CATALOGUE
                    if item.id == request.definition_id
                ),
                None,
            )

            if definition is None:
                raise HTTPException(
                    status_code=404,
                    detail="Unknown shipyard",
                )

            construction = definition.shipyard

            if not space.can_place(construction):
                raise HTTPException(
                    status_code=400,
                    detail="Shipyard requires a coastal space",
                )

            steps = make_construction_payment_steps(
                game,
                request.payments,
                construction.build_cost,
            )

            steps.append(
                BuildShipyardStep(
                    shipyard=construction,
                    space_id=request.space_id,
                )
            )

        else:
            definition = next(
                (
                    item for item in SHIP_CATALOGUE
                    if item.id == request.definition_id
                ),
                None,
            )

            if definition is None:
                raise HTTPException(
                    status_code=404,
                    detail="Unknown ship",
                )

            construction = definition.ship

            if not space.can_place(construction):
                raise HTTPException(
                    status_code=400,
                    detail="Ship requires a sea space",
                )

            index = request.shipyard_index

            if index is None or index >= len(player.shipyards):
                raise HTTPException(
                    status_code=400,
                    detail="Select a valid owned shipyard",
                )

            shipyard = player.shipyards[index]

            if not shipyard.can_build(construction):
                raise HTTPException(
                    status_code=400,
                    detail="Shipyard strength is insufficient",
                )

            steps = make_construction_payment_steps(
                game,
                request.payments,
                construction.build_cost,
            )

            steps.append(
                BuildShipStep(
                    shipyard=shipyard,
                    ship=construction,
                    space_id=request.space_id,
                )
            )

        try:
            result = game.perform_action(
                ExpandAction(steps=steps)
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

        record_game_action(
            game,
            action_type="naval_construction",
            message=result.message,
        )

        return {
            "message": result.message,
            "game": serialize_game(game),
        }

@app.post("/api/actions/fulfill-population-card")
def fulfill_population_card(
    request: FulfillPopulationCardRequest,
) -> dict:
    with _game_lock:
        game = get_demo_game()
        player = game.current_player

        if game.state.game_over:
            raise HTTPException(
                status_code=409,
                detail="Game is already finished",
            )

        if game.turn_state.main_action_used:
            raise HTTPException(
                status_code=409,
                detail="Main action already used",
            )

        card = next(
            (
                item
                for item in player.hand
                if item.id == request.card_id
            ),
            None,
        )

        if card is None:
            raise HTTPException(
                status_code=404,
                detail="Card is not in the player's hand",
            )

        expected = Counter({
            good: amount
            for good, amount in card.requirements.items()
            if amount > 0
        })

        provided = Counter(
            payment.good for payment in request.payments
        )

        if expected != provided:
            raise HTTPException(
                status_code=400,
                detail="Payment goods do not match card requirements",
            )

        used_industries = set()

        for payment in request.payments:
            if payment.source == "produce":
                index = payment.industry_index

                industries = player.get_all_industries()

                if index is None or index >= len(industries):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid production industry",
                    )

                if index in used_industries:
                    raise HTTPException(
                        status_code=400,
                        detail="Industry selected more than once",
                    )

                owned = industries[index]

                if owned.industry.good != payment.good:
                    raise HTTPException(
                        status_code=400,
                        detail="Industry produces the wrong good",
                    )

                used_industries.add(index)

            elif payment.source == "trade":
                index = payment.partner_index

                if (
                    index is None
                    or index >= len(game.state.players)
                    or index == game.state.current_player_index
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid trading partner",
                    )

                partner = game.state.players[index]

                if not any(
                    owned.industry.good == payment.good
                    for owned in partner.get_all_industries()
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Partner cannot supply this good",
                    )
            
            elif payment.source == "new_world":
                if not payment.island_id:
                    raise HTTPException(
                        status_code=400,
                        detail="New World island ID is required",
                    )

                island = next(
                    (
                        owned
                        for owned in player.new_world_islands
                        if owned.id == payment.island_id
                    ),
                    None,
                )

                if island is None:
                    raise HTTPException(
                        status_code=400,
                        detail="Player does not own this New World island",
                    )

                if payment.good not in island.resources:
                    raise HTTPException(
                        status_code=400,
                        detail="Island cannot supply the requested good",
                    )


            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid payment source",
                )

        # ENGINE INTEGRATION POINT
        #
        # Translate each validated payment into the existing
        # card-specific production/trade step objects.
        #
        # Then call the existing FulfillPopulationCardAction.
        #
        # Example structure only:
        #
        # steps = [...]
        # result = game.perform_action(
        #     FulfillPopulationCardAction(
        #         card=card,
        #         steps=steps,
        #     )
        # )
        #
        # Match the actual action constructor in your source.
        # Do not use ExpandAction here.

        
        new_world_payment_count = sum(
            payment.source == "new_world"
            for payment in request.payments
        )

        available_trade_tokens = player.available_ship_capacity(
            NavalTokenType.TRADE
        )

        if new_world_payment_count > available_trade_tokens:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Not enough Trade tokens for New World "
                    f"production: need {new_world_payment_count}, "
                    f"available {available_trade_tokens}"
                ),
            )

        # Convert API payments into card-specific engine steps.
        steps = []

        owned_industries = player.get_all_industries()

        for payment in request.payments:
            if payment.source == "produce":
                industry = owned_industries[
                    payment.industry_index
                ]

                # FulfillPopulationCardAction currently
                # accepts industries on the player's island.
                if not any(
                    owned is industry
                    for owned in player.island.industries
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Industry is not on the player's island",
                    )

                steps.append(
                    ProduceForCardStep(
                        industry=industry
                    )
                )

            elif payment.source == "trade":
                partner = game.state.players[
                    payment.partner_index
                ]

                steps.append(
                    TradeForCardStep(
                        request=TradeRequest(
                            partner=partner,
                            good=payment.good,
                        )
                    )
                )

                
            elif payment.source == "new_world":
                island = next(
                    (
                        owned
                        for owned in player.new_world_islands
                        if owned.id == payment.island_id
                    ),
                    None,
                )

                if island is None:
                    raise HTTPException(
                        status_code=400,
                        detail="New World island not found",
                    )

                steps.append(
                    NewWorldForCardStep(
                        request=NewWorldProductionRequest(
                            island=island,
                            good=payment.good,
                        )
                    )
                )


        action = FulfillPopulationCardAction(
            card=card,
            steps=steps,
        )

        try:
            result = game.perform_action(action)

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
        
        record_game_action(
            game,
            action_type="population_fulfillment",
            message=result.message,
        )

        return {
            "message": result.message,
            "game": serialize_game(game),
        }


