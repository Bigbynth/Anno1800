from typing import TypeAlias
from dataclasses import dataclass, field

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext

from anno1800.models.goods import Good
from anno1800.models.industry import Industry, OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.models.ship import Ship, Shipyard
from anno1800.models.trade import TradeRequest
from anno1800.models.new_world import NewWorldProductionRequest

from anno1800.services.production import ProductionResolver
from anno1800.services.trade import TradeResolver
from anno1800.services.new_world import NewWorldResolver

from anno1800.game_state import GameState


@dataclass(frozen=True)
class ProduceStep:
    industry: OwnedIndustry

@dataclass(frozen=True)
class TradeStep:
    request: TradeRequest

@dataclass(frozen=True)
class NewWorldStep:
    request: NewWorldProductionRequest

@dataclass(frozen=True)
class BuildIndustryStep:
    industry: Industry
    space_id: str
    build_over: bool = False

@dataclass(frozen=True)
class BuildShipyardStep:
    shipyard: Shipyard
    space_id: str
    build_over: bool = False


@dataclass(frozen=True)
class BuildShipStep:
    shipyard: Shipyard
    ship: Ship
    space_id: str
    build_over: bool = False

@dataclass(frozen=True)
class RemoveConstructionStep:
    space_id: str

ExpandStep: TypeAlias = (
    ProduceStep
    | TradeStep
    | NewWorldStep
    | BuildIndustryStep
    | BuildShipyardStep
    | BuildShipStep
    | RemoveConstructionStep
)


@dataclass
class ExpandExecutionState:
    industries_built: int = 0
    shipyards_built: int = 0
    removed_constructions: int = 0

    used_shipyards: set[int] = field(default_factory=set)
    initial_shipyards: set[int] = field(default_factory=set)


@dataclass
class ExpandAction(GameAction):
    steps: list[ExpandStep] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        if not self.steps:
            raise InvalidActionError("Expand action requires at least one step")
        industry_supply_snapshot = context.state.industry_supply.copy()
        ship_supply_snapshot = (context.state.ship_supply.copy())
        shipyard_supply_snapshot = (context.state.shipyard_supply.copy())

        population_snapshot = (player.population.snapshot())
        island_snapshot = (player.island.snapshot())
        shipyards_snapshot = (player.shipyards.copy())
        ships_snapshot = (player.ships.copy())
        naval_tokens_snapshot = (player.naval_token_snapshot())
        resolver = (player.start_production())

        trade = TradeResolver(player=player, production=resolver)

        new_world = NewWorldResolver(player=player, production=resolver)

        production_snapshot = (resolver.snapshot())
        trade_snapshot = trade.snapshot()
        new_world_snapshot = new_world.snapshot()
        execution = ExpandExecutionState(initial_shipyards={id(shipyard) for shipyard in player.shipyards})
        try:
            for step in self.steps:
                if isinstance(step, ProduceStep):
                    resolver.produce(step.industry)

                elif isinstance(step, TradeStep):
                    trade.trade(partner=step.request.partner, good=step.request.good)

                elif isinstance(step, NewWorldStep):
                    new_world.produce(island=step.request.island, good=step.request.good)

                elif isinstance(step, BuildIndustryStep):
                    if context.state.industry_remaining(step.industry) <= 0:
                        raise InvalidActionError(f"No {step.industry.name} remaining")
                    self._build_industry(context.state, player, resolver, execution, step)

                elif isinstance(step, BuildShipyardStep):
                    if context.state.shipyard_remaining(step.shipyard) <= 0:
                        raise InvalidActionError(f"No {step.shipyard.name} remaining")
                    self._build_shipyard(context.state, player, resolver, execution, step)

                elif isinstance(step, BuildShipStep):
                    if context.state.ship_remaining(step.ship) <= 0:
                        raise InvalidActionError(f"No {step.ship.name} remaining")
                    self._build_ship(context.state, player, resolver, execution, step)

                elif isinstance(step, RemoveConstructionStep):
                    self._remove_construction(context.state, player, execution, step)

                else:
                    raise TypeError(f"Unsupported Expand step: {type(step).__name__}")

            return ActionResult(
                message=self._result_message(player)
            ) 
                
        except Exception:
            new_world.rollback(new_world_snapshot)
            trade.rollback(trade_snapshot)
            resolver.rollback(production_snapshot)
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.shipyards = (shipyards_snapshot)
            player.ships = (ships_snapshot)
            context.state.industry_supply = (industry_supply_snapshot)
            context.state.ship_supply = (ship_supply_snapshot)
            context.state.shipyard_supply = (shipyard_supply_snapshot)
            player.restore_naval_tokens(naval_tokens_snapshot)
            raise
        finally:
            if not resolver.finished:
                resolver.finish()


    def _pay_cost(self, production: ProductionResolver, cost: dict[Good, int]) -> None:
        if not production.can_pay(cost):
            raise InvalidActionError("Not enough resources for construction")
        production.pay(cost)

    def _build_industry(self,state: GameState, player: PlayerState, production: ProductionResolver, execution: ExpandExecutionState, step: BuildIndustryStep) -> None:
        if execution.industries_built >= 1:
            raise InvalidActionError("Only one industry may be built per Expand action")

        if player.get_industries(step.industry):
            raise InvalidActionError(f"{player.name} already owns {step.industry.name}")
        owned = OwnedIndustry(step.industry)
        self._validate_build_target(player, step.space_id, owned, step.build_over)
        self._pay_cost(production, step.industry.build_cost)
        previous = player.island.get_space(step.space_id).construction
        state.take_industry(step.industry)
        if step.build_over:
            player.replace_construction(step.space_id, owned)
            self._return_construction_to_supply(state, previous)
        else:
            player.add_industry(step.industry, space_id=step.space_id)

        execution.industries_built += 1


    def _build_shipyard(self, state: GameState, player: PlayerState, production: ProductionResolver, execution: ExpandExecutionState, step: BuildShipyardStep) -> None:
        if execution.shipyards_built >= 1:
            raise InvalidActionError("Only one shipyard may be built per Expand action")

        self._validate_build_target(player, step.space_id, step.shipyard, step.build_over)
        self._pay_cost(production, step.shipyard.build_cost)
        previous = player.island.get_space(step.space_id).construction
        state.take_shipyard(step.shipyard)
        if step.build_over:
            player.replace_construction(step.space_id, step.shipyard)
            self._return_construction_to_supply(state, previous)
        else:
            player.add_shipyard(step.shipyard, space_id=step.space_id)

        execution.shipyards_built += 1


    def _build_ship(self, state: GameState, player: PlayerState, production: ProductionResolver, execution: ExpandExecutionState, step: BuildShipStep) -> None:
        if not any(owned is step.shipyard for owned in player.shipyards):
            raise InvalidActionError("Player does not own this shipyard")

        shipyard_id = id(step.shipyard)
        if shipyard_id not in execution.initial_shipyards:
            raise InvalidActionError("A shipyard built during this Expand cannot build a ship.")
        if shipyard_id in execution.used_shipyards:
            raise InvalidActionError("This shipyard has already built a ship this Expand")

        if not step.shipyard.can_build(step.ship):
            raise InvalidActionError(f"{step.shipyard.name} cannot build {step.ship.name}")

        self._validate_build_target(player, step.space_id, step.ship, step.build_over)
        self._pay_cost(production, step.ship.build_cost)
        previous = player.island.get_space(step.space_id).construction
        state.take_ship(step.ship)
        if step.build_over:
            player.replace_construction(step.space_id, step.ship)
            self._return_construction_to_supply(state, previous)
        else:
            player.add_ship(step.ship, space_id=step.space_id)

        execution.used_shipyards.add(shipyard_id)


    def _remove_construction(self,state: GameState, player: PlayerState, execution: ExpandExecutionState, step: RemoveConstructionStep) -> None:
        if execution.removed_constructions >= 1:
            raise InvalidActionError("Only one construction may be voluntarily removed per Expand action")

        space = player.island.get_space(step.space_id)
        if space.construction is None:
            raise InvalidActionError("Cannot remove from an empty space")

        removed = space.construction
        player.remove_construction(step.space_id)

        if isinstance(removed, OwnedIndustry):
            state.return_industry(removed.industry)

        execution.removed_constructions += 1


    def _validate_build_target(self, player: PlayerState, space_id: str, construction, build_over: bool) -> None:
        try:
            space = player.island.get_space(space_id)
        except ValueError as exc:
            raise InvalidActionError(f"Unknown island space {space_id}") from exc

        if space.is_empty and build_over:
            raise InvalidActionError("Cannot build over an empty space")

        if not space.is_empty and not build_over:
            raise InvalidActionError(f"Space {space_id} is already occupied")

        previous = space.construction

        if build_over:
            space.construction = None

        try:
            if not space.can_place(construction):
                raise InvalidActionError(f"Cannot place construction on space {space_id}")

        finally:
            space.construction = previous

    def _result_message(self, player: PlayerState) -> str:
        built: list[str] = []

        for step in self.steps:
            if isinstance(step, BuildIndustryStep):
                built.append(step.industry.name)

            elif isinstance(step, BuildShipyardStep):
                built.append(step.shipyard.name)

            elif isinstance(step, BuildShipStep):
                built.append(step.ship.name)

        return (
            f"{player.name} expanded: "
            f"{', '.join(built)}"
        )

    def _return_construction_to_supply(self, state: GameState, construction) -> None:
        if isinstance(construction, OwnedIndustry):
            state.return_industry(construction.industry)

        elif isinstance(construction, Shipyard):
            state.return_shipyard(construction)

        elif isinstance(construction, Ship):
            state.return_ship(construction)