from anno1800.actions.base import ActionResult, GameAction

from anno1800.actions.context import ActionContext

class FestivalAction(GameAction):
    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player

        player.refresh_population()

        return ActionResult(
            message=(
                f"{player.name} held a festival."
                "Population is available again."
            )
        )

    