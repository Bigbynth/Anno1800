from dataclasses import dataclass, field

from anno1800.actions.base import (
    ActionResult,
    GameAction,
    InvalidActionError,
)
from anno1800.models.industry import (
    Industry,
    OwnedIndustry,
)
from anno1800.models.player import PlayerState
from anno1800.services.production import (
    ProductionResolver,
)
from anno1800.actions.context import ActionContext


@dataclass
class BuildAction(GameAction):
    industry: Industry

    production_plan: list[OwnedIndustry] = field(
        default_factory=list
    )

    def execute(
        self,
        context: ActionContext
    ) -> ActionResult:
        player = context.player
        self._validate_production_plan(
            player
        )

        population_snapshot = (
            player.population.snapshot()
        )

        island_snapshot = (
            player.island.snapshot()
        )

        resolver = player.start_production()

        try:
            for owned_industry in (
                self.production_plan
            ):
                resolver.produce(
                    owned_industry
                )

            if not resolver.can_pay(
                self.industry.build_cost
            ):
                raise InvalidActionError(
                    self._missing_goods_message(
                        resolver
                    )
                )

            resolver.pay(
                self.industry.build_cost
            )

            player.add_industry(
                self.industry
            )

            return ActionResult(
                message=(
                    f"{player.name} built "
                    f"{self.industry.name}."
                )
            )

        except Exception:
            player.population.restore(
                population_snapshot
            )

            player.island.restore(
                island_snapshot
            )

            raise

        finally:
            if not resolver.finished:
                resolver.finish()

    def _validate_production_plan(
        self,
        player: PlayerState,
    ) -> None:

        for industry in self.production_plan:

            if industry not in (
                player.island.industries
            ):
                raise InvalidActionError(
                    f"{player.name} does not own "
                    f"{industry.industry.name}."
                )

    def _missing_goods_message(
        self,
        resolver: ProductionResolver,
    ) -> str:

        missing = []

        for good, required in (
            self.industry.build_cost.items()
        ):

            available = (
                resolver.goods.count(good)
            )

            if available < required:
                missing.append(
                    f"{good.value}: "
                    f"{available}/{required}"
                )

        return (
            f"Cannot build "
            f"{self.industry.name}. "
            f"Missing {', '.join(missing)}."
        )