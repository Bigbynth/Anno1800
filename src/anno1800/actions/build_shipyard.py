from dataclasses import dataclass, field

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext

from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.models.ship import Shipyard

from anno1800.services.production import ProductionResolver

@dataclass
class BuildShipyardAction(GameAction):
    shipyard: Shipyard
    production_plan: list[OwnedIndustry] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        self._validate_industries(player)

        population_snapshot = (player.population.snapshot())
        island_snapshot = (player.island.snapshot())
        shipyards_snapshot = (player.shipyards.copy())
        resolver = (player.start_production())

        try:
            for industry in self.production_plan:
                resolver.produce(industry)

            if not resolver.can_pay(self.shipyard.build_cost):
                raise InvalidActionError(self._missing_goods_message(resolver))

            resolver.pay(self.shipyard.build_cost)
            player.add_shipyard(self.shipyard)

            return ActionResult(
                message=(
                    f"{player.name} built f{self.shipyard.name}"
                )
            )

        except Exception:
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            player.shipyards = (shipyards_snapshot)

            raise

        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate_industries(self, player: PlayerState) -> None:
        for industry in self.production_plan:
            if industry not in player.island.industries:
                raise InvalidActionError(f"{player.name} does not own {industry.industry.name}")

    def _missing_goods_message(self, resolver: ProductionResolver) -> str:
        missing: list[str] = []

        for good, required in self.shipyard.build_cost.items():
            available = resolver.goods.count(good)

            if available < required:
                missing.append(f"{good.value}: {available}/{required}")

        return (
            f"Cannot build {self.shipyard.name}"
            f"Missing {', '.join(missing)}"
        )