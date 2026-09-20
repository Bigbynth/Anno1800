from dataclasses import dataclass, field
from collections import Counter

from anno1800.models.goods import Good
from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext
from anno1800.models.industry import OwnedIndustry
from anno1800.models.ship import Ship, Shipyard
from anno1800.services.production import ProductionResolver
from anno1800.models.player import PlayerState

@dataclass(frozen=True)
class ShipBuild:
    shipyard: Shipyard
    ship: Ship

@dataclass
class BuildShipAction(GameAction):
    builds: list[ShipBuild]

    production_plan: list[OwnedIndustry] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        self._validate_builds(player)

        self._validate_industries(player)

        population_snapshot = (player.population.snapshot())
        island_snapshot = (player.island.snapshot())
        ships_snapshot = (player.ships.copy())
        naval_tokens_snapshot = (player.naval_tokens.copy())
        resolver = (player.start_production())

        try:
            for industry in self.production_plan:
                resolver.produce(industry)

            total_cost = self._total_Cost

            if not resolver.can_pay(total_cost):
                raise InvalidActionError(self._missing_goods_message(resolver, total_cost))

            resolver.pay(total_cost)
            for build in self.builds:
                player.add_ship(build.ship)

            ship_names = ", ".join(build.ship.name for build in self.builds)


            return ActionResult(
                message=(
                    f"{player.name} built {ship_names}"
                )
            )
        except Exception:
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.ships = (ships_snapshot)
            player.naval_tokens = (naval_tokens_snapshot)
            raise

        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate_industries(self, player) -> None:
        for industry in self.production_plan:
            if industry not in player.island.industries:
                raise InvalidActionError(
                    f"{player.name} does not own {industry.industry.name}"
                )

    def _validate_builds(self, player: PlayerState) -> None:
        if not self.builds:
            raise InvalidActionError("At least one ship must be built")

        used_shipyards: set[int] = set()

        for build in self.builds:
            if not player.has_shipyard(build.shipyard):
                raise InvalidActionError(f"{player.name} does not own {build.shipyard.name}")

            shipyard_id = id(build.shipyard)
            if shipyard_id in used_shipyards:
                raise InvalidActionError("A shipyard can only build one ship during an expand action")

            used_shipyards.add(shipyard_id)

            if not build.shipyard.can_build(build.ship):
                raise InvalidActionError(f"{build.shipyard.name} cannot build strength-{build.ship.strength} {build.ship.name}")

    def _missing_goods_message(self, resolver: ProductionResolver, cost: dict[Good, int]) -> str:
        missing: list[str] = []

        for good, required in cost.items():
            available = (resolver.goods.count(good))

            if available < required:
                missing.append(
                    f"{good.value}: {available}/{required}"
                )

        return (f"Cannot build ships"
                f"Missing "
                f"{', '.join(missing)}")

    def _total_Cost(self) -> dict[Good, int]:

        total: Counter[Good] = Counter()

        for build in self.builds:
            total.update(build.ship.build_cost)

        return dict(total)