from anno1800.models.player import PlayerState
from anno1800.models.ship import ShipType

class NotEnoughShipCapacityError(Exception):
    pass

class ShippingService:

    @staticmethod
    def can_use_capacity(player: PlayerState, ship_type: ShipType, amount: int) -> bool:
        if amount <= 0:
            return False

        return player.available_ship_capacity(ship_type) >= amount

    @staticmethod
    def use_capacity(player: PlayerState, ship_type: ShipType, amount: int) -> None:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        if not ShippingService.can_use_capacity(player, ship_type, amount):
            raise NotEnoughShipCapacityError(
                f"Not enough {ship_type.value} ship capacity"
            )

        remaining = amount

        for ship in player.get_ships(ship_type):
            if remaining == 0:
                break

            usable = min(ship.available_capacity, remaining)
            if usable > 0:
                ship.use(usable)

                remaining -= usable
        