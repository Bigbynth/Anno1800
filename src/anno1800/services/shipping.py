from anno1800.models.player import PlayerState
from anno1800.models.ship import NavalTokenType

class NotEnoughShipCapacityError(Exception):
    pass

class ShippingService:

    @staticmethod
    def can_use_capacity(player: PlayerState, token_type: NavalTokenType, amount: int) -> bool:
        if amount <= 0:
            return False

        return player.available_ship_capacity(token_type) >= amount

    @staticmethod
    def use_capacity(player: PlayerState, token_type: NavalTokenType, amount: int) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        if not ShippingService.can_use_capacity(player, token_type, amount):
            raise NotEnoughShipCapacityError(
                f"Not enough {token_type.value} ship capacity"
            )

        remaining = amount

        for token in player.naval_tokens:
            if remaining == 0:
                break

            if token.token_type == token_type and token.available:
                token.use()
                remaining -= 1
        