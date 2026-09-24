from anno1800.models.cards import PopulationCard
from anno1800.models.goods import Good
from anno1800.models.new_world import NewWorldIsland

from dataclasses import dataclass

@dataclass(frozen=True)
class NewWorldIslandDefinition:
    id: str
    name: str
    resources: tuple[Good, Good, Good]

NEW_WORLD_ISLAND_CATALOGUE: tuple[
    NewWorldIslandDefinition, ...
] = (
    NewWorldIslandDefinition(
        id="nw-island-01",
        name="New World Island 1",
        resources=(
            Good.SUGAR_CANE,
            Good.TOBACCO,
            Good.COTTON,
        ),
    ),
    NewWorldIslandDefinition(
        id="nw-island-02",
        name="New World Island 2",
        resources=(
            Good.COFFEE,
            Good.RUBBER,
            Good.COCOA,
        ),
    ),
    NewWorldIslandDefinition(
        id="nw-island-03",
        name="New World Island 3",
        resources=(
            Good.SUGAR_CANE,
            Good.COFFEE,
            Good.RUBBER,
        ),
    ),
    NewWorldIslandDefinition(
        id="nw-island-04",
        name="New World Island 4",
        resources=(
            Good.TOBACCO,
            Good.COTTON,
            Good.COCOA,
        ),
    ),
)

def create_new_world_islands() -> list[NewWorldIsland]:
    return [
        NewWorldIsland(
            id=definition.id,
            name=definition.name,
            resources=definition.resources,
        ) for definition in NEW_WORLD_ISLAND_CATALOGUE
    ]

# ENGINE TEST FIXTURES — 24 unique cards, not official card text.
_NEW_WORLD_REQUIREMENTS = (
    (Good.COTTON,), (Good.COFFEE,), (Good.TOBACCO,),
    (Good.SUGAR_CANE,), (Good.COCOA,), (Good.RUBBER,),
    (Good.COTTON, Good.COFFEE), (Good.TOBACCO, Good.SUGAR_CANE),
    (Good.COCOA, Good.RUBBER), (Good.COTTON, Good.COCOA),
    (Good.COFFEE, Good.SUGAR_CANE), (Good.TOBACCO, Good.RUBBER),
)
NEW_WORLD_CARDS = [
    PopulationCard(
        id=f"fixture-new-world-{i+1:03d}",
        population_type=None,
        requirements={good: 1 for good in _NEW_WORLD_REQUIREMENTS[i % 12]},
        victory_points=5,
        is_new_world=True,
    )
    for i in range(24)
]
