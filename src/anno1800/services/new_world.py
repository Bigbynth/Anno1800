from anno1800.actions.base import InvalidActionError
from anno1800.models.goods import Good
from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType
from anno1800.services.shipping import ShippingService

class NewWorldResolver:
    def __init__(self, player: PlayerState):
        self.player = player

    def can_produce(self, good: Good) -> bool:
        return (self.player.has_new_world_resource(good)) \
                and ShippingService.can_use_capacity(self.player, NavalTokenType.TRADE, 1)

    def produce(self, good: Good) -> Good:
        if not self.player.has_new_world_resource(good):
            raise InvalidActionError(
                f"{self.player.name} does not have access to {good.value}"
            )

        if not ShippingService.can_use_capacity(self.player, NavalTokenType.TRADE, 1):
            raise InvalidActionError("Not enough trade capacity for New World production")

        ShippingService.use_capacity(self.player, NavalTokenType.TRADE, 1)

        return good 