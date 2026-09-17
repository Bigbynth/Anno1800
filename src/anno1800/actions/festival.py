from anno1800.actions.base import ActionResult, GameAction

from anno1800.models.player import PlayerState

class FestivalAction(GameAction):
    def execute(self, player: PlayerState) -> ActionResult:
        player.refresh_population()

        return ActionResult(
            message=(
                f"{player.name} held a festival."
                f"population is available again"
            )
        )

    