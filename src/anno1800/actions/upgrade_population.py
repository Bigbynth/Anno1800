from collections import Counter
from dataclasses import dataclass, field

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.data.population import UPGRADE_COST
from anno1800.models.goods import Good
from anno1800.models.industry import OwnedIndustry
from anno1800.models.player import PlayerState
from anno1800.models.population_upgrade import PopulationUpgrade

MAX_UPGRADES_PER_ACTION = 3

@dataclass
class UpgradePopulationAction(GameAction):
    upgrades: list[PopulationUpgrade]

    production_plan: list[OwnedIndustry] = field(default_factory=list)

    def execute(self, player: PlayerState) -> ActionResult:
        self._validate_upgrade_count()
        self._validate_industries(player)

        population_snapshot = player.population.snapshot()
        island_snapshot = player.island.snapshot()

        resolver = player.start_production()

        try:
            for industry in self.production_plan:
                resolver.produce(industry)

            total_cost = self._calculate_cost()

            if not resolver.can_pay(total_cost):
                raise InvalidActionError(
                    "Not enough goods"
                    "for population upgrade"
                )

            resolver.pay(total_cost)

            self._apply_upgrades(player)

            return ActionResult(
                message=self._result_message(player)
            )

        except Exception:
            player.population.restore(population_snapshot)
            player.island.restore(island_snapshot)
            raise

        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate_upgrade_count(self) -> None:
        if not self.upgrades:
            raise InvalidActionError(
                "At leaste one upgrade "
                "is required"
            )

        if len(self.upgrades) > MAX_UPGRADES_PER_ACTION:
            raise InvalidActionError(
                "A maximum of 3 upgrades"
                "can be performed"
                "in one action"
            )

    def _validate_industries(self, player: PlayerState) -> None:
        for industry in self.production_plan:
            if industry not in player.island.industries:
                raise InvalidActionError(
                    f"{player.name} does not"
                    f"own"
                    f"{industry.industry.name}"
                )

    def _calculate_cost(self) -> dict[Good, int]:
        total: Counter[Good] = Counter()

        for upgrade in self.upgrades:
            cost = UPGRADE_COST[upgrade.from_type]
            total.update(cost)

        return dict(total)

    def _apply_upgrades(self, player: PlayerState) -> None:

        for upgrade in self.upgrades:

            player.population.upgrade_available(upgrade.from_type)

    def _result_message(self, player: PlayerState) -> str:
        description = [
            (
                f"{upgrade.from_type.value}"
                "- >"
                f"{upgrade.to_type.value}"
            )
            for upgrade in self.upgrades
        ]

        return (
            f"{player.name} upgraded:"
            + ", ".join(description)
            + "."
        )