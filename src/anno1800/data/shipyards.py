from anno1800.models.goods import Good
from anno1800.models.ship import Shipyard

from dataclasses import dataclass

SHIPYARD_I = Shipyard(
    name="Shipyard I",
    strength=1,
    build_cost={}
)

SHIPYARD_II = Shipyard(
    name="Shipyard II",
    strength=2,
    build_cost={Good.BRICK: 1, Good.STEEL: 1}
)

SHIPYARD_III = Shipyard(
    name="Shipyard III",
    strength=3,
    build_cost={Good.STEEL: 1, Good.WINDOWS: 1}
)

def create_starting_shipyard() -> Shipyard:
    return Shipyard(
        name=SHIPYARD_I.name,
        strength=SHIPYARD_I.strength,
        build_cost=SHIPYARD_I.build_cost.copy()
    )

SHIPYARD_SUPPLY = {1:4, 2:6, 3:4}

@dataclass(frozen=True)
class ShipyardDefinition:
    id: str
    shipyard: Shipyard
    supply: int


SHIPYARD_CATALOGUE: tuple[ShipyardDefinition, ...] = (
    ShipyardDefinition(
        id="shipyard-i",
        shipyard=SHIPYARD_I,
        supply=SHIPYARD_SUPPLY[1],
    ),
    ShipyardDefinition(
        id="shipyard-ii",
        shipyard=SHIPYARD_II,
        supply=SHIPYARD_SUPPLY[2],
    ),
    ShipyardDefinition(
        id="shipyard-iii",
        shipyard=SHIPYARD_III,
        supply=SHIPYARD_SUPPLY[3],
    ),
)

def create_shipyard_supply() -> dict[str, int]:
    return {definition.id: definition.supply for definition in SHIPYARD_CATALOGUE}

def get_shipyard_definition(shipyard: Shipyard) -> ShipyardDefinition:
    for definition in SHIPYARD_CATALOGUE:
        if definition.shipyard is shipyard or definition.shipyard == shipyard:
            return definition

    raise ValueError(f"Unknown shipyard: {shipyard.name}")