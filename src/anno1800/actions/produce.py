from dataclasses import dataclass

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError

from anno1800.models.industry import OwnedIndustry
from anno1800.actions.context import ActionContext

@dataclass
class ProduceAction(GameAction):
    industry: OwnedIndustry

def execute(self, context: ActionContext) -> ActionResult:
    player = context.player

    # Validate ownership by object identity.
    # Also supports industries on Old World islands.
    if not any(
        owned is self.industry
        for owned in player.get_all_industries()
    ):
        raise InvalidActionError(
            "Player does not own this industry"
        )

    # Check workplace availability and workforce.
    if not self.industry.can_produce(player.population):
        raise InvalidActionError(
            f"Cannot activate {self.industry.industry.name}"
        )

    resolver = player.start_production()

    try:
        good = resolver.produce(self.industry)
    finally:
        resolver.finish()

    player.record_production(good)

    return ActionResult(
        message=(
            f"{player.name} produced {good.value} using "
            f"{self.industry.industry.name}"
        )
    )