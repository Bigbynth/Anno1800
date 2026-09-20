from dataclasses import dataclass, field
from typing import TypeAlias

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.data.population import UPGRADE_COST
from anno1800.models.population import PopulationCube
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.actions.context import ActionContext
from anno1800.services.production import ProductionResolver

MAX_UPGRADES_PER_ACTION = 3


@dataclass(frozen=True)
class PopulationUpgradeStep:
    cube: PopulationCube



@dataclass(frozen=True)
class ProduceForUpgradeStep:
    industry: OwnedIndustry


UpgradeActionStep: TypeAlias = (
    ProduceForUpgradeStep
    | PopulationUpgradeStep
)

@dataclass
class UpgradePopulationAction(GameAction):
    steps: list[UpgradeActionStep] = field(default_factory=list)

    def execute(self, context: ActionContext) -> ActionResult:

        upgrade_count = sum(isinstance(step, PopulationUpgradeStep) for step in self.steps)

        if upgrade_count == 0:
            raise InvalidActionError("Upgrade action requires at least one upgrade")

        if upgrade_count > MAX_UPGRADES_PER_ACTION:
            raise InvalidActionError("Upgrade action allows at most 3 upgrades")
        
        player = context.player

        population_snapshot = player.population.snapshot()
        island_snapshot = player.island.snapshot()

        resolver = player.start_production()

        production_snapshot = resolver.snapshot()

        try:
            for step in self.steps:
                if isinstance(step, ProduceForUpgradeStep):
                    if not any(owned is step.industry for owned in player.island.industries):
                        raise InvalidActionError("Player does not own this industry")

                    resolver.produce(step.industry)

                elif isinstance(step, PopulationUpgradeStep):
                    self._upgrade(player, resolver, step)

                else:
                    raise TypeError("Unsupported upgrade step: "
                                    f"{type(step).__name__}")

            return ActionResult(
                message=(
                    f"{player.name} completed {upgrade_count} population upgrade {'s' if upgrade_count != 1 else ''}"
                )
            )

        except Exception:
            resolver.rollback(production_snapshot)
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            raise

        finally:
            if not resolver.finished:
                resolver.finish()


    def _upgrade(self, player: PlayerState, resolver: ProductionResolver, step: PopulationUpgradeStep) -> None:
        cube = step.cube

        if not player.population.can_upgrade_cube(cube):
            raise InvalidActionError("Population cube cannot be upgraded")

        cost = UPGRADE_COST[cube.population_type]

        if not resolver.can_pay(cost):
            raise InvalidActionError(f"Not enough resources to upgrade {cube.population_type.value}")

        resolver.pay(cost)
        player.population.upgrade_cube(cube)
