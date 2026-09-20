from anno1800.models.goods import Good
from anno1800.models.ship import Shipyard

SHIPYARD_I = Shipyard(
    name="Shipyard I",
    strength=1,
    build_cost={}
)

SHIPYARD_II = Shipyard(
    name="Shipyayd II",
    strength=2,
    build_cost={Good.BRICK: 1, Good.STEEL: 1}
)

SHIPYARD_III = Shipyard(
    name="Shipyard III",
    strength=3,
    build_cost={Good.STEEL: 1, Good.WINDOWS: 1}
)