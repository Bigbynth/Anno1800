from dataclasses import dataclass

from anno1800.actions.base import ActionResult, GameAction, InvalidActionError
from anno1800.actions.context import ActionContext
from anno1800.models.ship import NavalTokenType

EXPLORATION_TOKEN_COST = 2
MAX_EXPEDITION_CARDS = 3

@dataclass
class TakeExpeditionCardsAction(GameAction):
    def execute(self, context: ActionContext) -> ActionResult:
        player = context.player
        deck = context.state.expedition_deck

        available_tokens = (player.available_naval_tokens(NavalTokenType.EXPLORATION))

        if len(available_tokens) < EXPLORATION_TOKEN_COST:
            raise InvalidActionError("Not enough exploration tokens")

        if deck.is_empty():
            raise InvalidActionError("No expedition cards remaining")

        naval_snapshot = (player.naval_token_snapshot())
        deck_snapshot = deck.cards.copy()
        expedition_snapshot = player.expedition_cards.copy()

        try:
            player.use_naval_tokens(NavalTokenType.EXPLORATION, EXPLORATION_TOKEN_COST)
            cards = deck.draw(MAX_EXPEDITION_CARDS)

            player.add_expedition_cards(cards)

            return ActionResult(
                message=(f"{player.name} took {len(cards)} expedition cards")
            )

        except Exception:
            player.restore_naval_tokens(naval_snapshot)
            deck.cards = deck_snapshot
            player.expedition_cards = expedition_snapshot
            raise