from anno1800.models.ship import Ship, ShipType
from anno1800.models.goods import Good

from dataclasses import dataclass

SMALL_TRADE_SHIP = Ship(
    name="Small Trade Ship",
    ship_type=ShipType.TRADE,
    strength=1,
    trade_token=1,
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


@dataclass(frozen=True)
class ShipDefinition:
    id: str
    ship: Ship
    supply: int

SHIP_CATALOGUE: tuple[ShipDefinition, ...] = (
    ShipDefinition(
        id="small-trade-ship",
        ship=SMALL_TRADE_SHIP,
        supply=6,
    ),
    ShipDefinition(
        id="large-trade-ship",
        ship=LARGE_TRADE_SHIP,
        supply=6,
    ),
    ShipDefinition(
        id="exploration-ship",
        ship=EXPLORATION_SHIP,
        supply=6,
    ),
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

def create_ship_supply() -> dict[str, int]:
    return {
        definition.id: definition.supply for definition in SHIP_CATALOGUE
    }

def get_ship_definition(ship: Ship) -> ShipDefinition:
    for definition in SHIP_CATALOGUE:
        if definition.ship is ship or definition.ship == ship:
            return definition

    raise ValueError(f"Unknown ship: {ship.name}")

