from collections import Counter
from dataclasses import dataclass, field

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext

from anno1800.models.goods import Good
from anno1800.models.industry import Industry, OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.models.ship import Ship, Shipyard

from anno1800.services.production import ProductionResolver

@dataclass(frozen=True)
class ShipBuild:
    shipyard: Shipyard
    ship: Ship

@dataclass
class ExpandAction(GameAction):
    industry: Industry | None = None
    shipyard: Shipyard | None = None

    ships: list[ShipBuild] = field(default_factory=list)
    production_plan: list[OwnedIndustry] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        self._validate(player)

        population_snapshot = (player.population.snapshot())
        island_snapshot = (player.island.snapshot())
        shipyards_snapshot = (player.shipyards.copy())
        ships_snapshot = (player.ships.copy())
        naval_tokens_snapshot = (player.naval_tokens.copy())
        resolver = (player.start_production())

        try:
            for owned_industry in self.production_plan:
                resolver.produce(owned_industry)

            total_cost = self._total_cost()

            if not resolver.can_pay(total_cost):
                raise InvalidActionError(self._missing_goods_message(resolver, total_cost))

            resolver.pay(total_cost)

            if self.industry is not None:
                player.add_industry(self.industry)

            if self.shipyard is not None:
                player.add_shipyard(self.shipyard)

            for ship_build in self.ships:
                player.add_ship(ship_build.ship)

            return ActionResult(
                message=(self._result_message(player))
            )
        except Exception:
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.shipyards = (shipyards_snapshot)
            player.ships = (ships_snapshot)
            player.naval_tokens = (naval_tokens_snapshot)
            raise
        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate(self, player: PlayerState) -> None:
        if self.industry is None and self.shipyard is None and not self.ships:
            raise InvalidActionError("Expand action must build at least one construction")

        self._validate_production_plan(player)
        self._validate_industry(player)
        self._validate_ships(player)

    def _validate_production_plan(self, player: PlayerState) -> None:
        for owned_industry in self.production_plan:
            if owned_industry not in player.island.industries:
                raise InvalidActionError(f"{player.name} does not own {owned_industry.industry.name}")

    def _validate_industry(self, player: PlayerState) -> None:
        if self.industry is None:
            return

        if player.has_industry(self.industry):
            raise InvalidActionError(f"{player.name} already owns {self.industry.name}")

    def _validate_ships(self, player: PlayerState) -> None:
        used_shipyards: set[int] = set()

        for ship_build in self.ships:
            shipyard = (ship_build.shipyard)
            ship = ship_build.ship

            if not player.has_shipyard(shipyard):
                raise InvalidActionError(f"{player.name} does not own {shipyard.name}")

            shipyard_id = id(shipyard)
            if shipyard_id in used_shipyards:
                raise InvalidActionError("A shipyard can build only one ship during an expand action")

            used_shipyards.add(shipyard_id)

            if not shipyard.can_build(ship):
                raise InvalidActionError(
                    f"{shipyard.name} cannot build strength-{ship.strength} {ship.name}"
                )

    def _total_cost(self) -> dict[Good, int]:
        total: Counter[Good] = Counter()

        if self.industry is not None:
            total.update(self.industry.build_cost)

        if self.shipyard is not None:
            total.update(self.shipyard.build_cost)

        for ship_build in self.ships:
            total.update(ship_build.ship.build_cost)

        return dict(total)

    def _missing_goods_message(self, resolver: ProductionResolver, cost: dict[Good, int]) -> str:
        missing: list[str] = []

        for good, required in cost.items():
            available = (resolver.goods.count(good))

            if available < required:
                missing.append(f"{good.value}: {available}/{required}")

        return ("Cannot expand. Missing"
                f"{', '.join(missing)}")

    def _result_message(self, player: PlayerState) -> str:
        built: list[str] = []

        if self.industry is not None:
            built.append(self.industry.name)

        if self.shipyard is not None:
            built.append(self.shipyard.name)

        built.extend(ship_build.ship.name for ship_build in self.ships)

        return (
            f"{player.name} expanded: "
            f"{', '.join(built)}"
        )