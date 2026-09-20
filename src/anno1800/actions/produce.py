from dataclasses import dataclass

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError

from anno1800.models.industry import OwnedIndustry
from anno1800.actions.context import ActionContext

@dataclass
class ProduceAction(GameAction):
    industry: OwnedIndustry

    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        if self.industry not in player.island.industries:
            raise InvalidActionError("Player does not own this industry")

        if not self.industry.can_produce(player.population):
            raise InvalidActionError(
                f"cannot activate"
                f"{self.industry.industry.name}"
            )

        resolver = player.start_production()
        try:
            good = resolver.produce(self.industry)
        finally:
            resolver.finish()

        return ActionResult(
            message=(
                f"{player.name} produced"
                f"{good.value} using"
                f"{self.industry.industry.name}"
            )
        )