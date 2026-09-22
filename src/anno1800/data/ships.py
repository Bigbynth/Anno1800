from anno1800.models.ship import Ship, ShipType
from anno1800.models.goods import Good

SMALL_TRADE_SHIP = Ship(
    name="Small Trade Ship",
    ship_type=ShipType.TRADE,
    strength=1,
    trade_token=2,
    build_cost={Good.BRICK: 1, Good.STEEL: 1}
)

LARGE_TRADE_SHIP = Ship(
    name="Large Trade Ship",
    ship_type=ShipType.TRADE,
    strength=3,
    trade_token=3,
    build_cost={Good.STEEL: 2}
)

EXPLORATION_SHIP = Ship(
    name="Exploration Ship",
    ship_type=ShipType.EXPLORATION,
    strength=2,
    exploration_tokens=2,
    build_cost={Good.STEEL: 1, Good.WINDOWS: 1}
)

def create_starting_ships() -> list[Ship]:
    return [
        Ship(
            name="Starting Trade Ship",
            ship_type=ShipType.TRADE,
            strength=1,
            trade_token=1,
            build_cost={},
            requires_shipyard=False
        ),
        Ship(
            name="Starting Trade Ship",
            ship_type=ShipType.TRADE,
            strength=1,
            trade_token=1,
            build_cost={},
            requires_shipyard=False
        ),
        Ship(
            name="Starting Exploration Ship",
            ship_type=ShipType.EXPLORATION,
            strength=1,
            exploration_tokens=1,
            build_cost={},
            requires_shipyard=False
        )
    ]