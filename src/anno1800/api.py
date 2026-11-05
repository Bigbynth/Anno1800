from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from pydantic import BaseModel, Field
from collections import Counter

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from anno1800.game import Game

from anno1800.actions.base import InvalidActionError
from anno1800.actions.festival import FestivalAction
from anno1800.actions.produce import ProduceAction
from anno1800.actions.fulfill_population_card import (
    FulfillPopulationCardAction,
    ProduceForCardStep,
    TradeForCardStep,
)
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


from typing import Literal

from anno1800.actions.expand import (
    ProduceStep,
    TradeStep,
)
from anno1800.models.goods import Good
from anno1800.models.trade import TradeRequest



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


class ConstructionPaymentStep(BaseModel):
    source: Literal["produce", "trade"]
    good: Good
    industry_index: int | None = Field(default=None, ge=0)
    partner_index: int | None = Field(default=None, ge=0)


class FulfillPopulationCardRequest(BaseModel):
    card_id: str = Field(min_length=1)
    payments: list[ConstructionPaymentStep] = Field(
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

        return {
            "message": (
                f"{player.name} demolished "
                f"{construction_name} at {request.space_id}"
            ),
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

        return {
            "message": result.message,
            "game": serialize_game(game),
        }


