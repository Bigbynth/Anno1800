from dataclasses import dataclass

from anno1800.models.old_world import OldWorldIsland
from anno1800.models.island import Island, IslandSpace, IslandSpaceType

@dataclass(frozen=True)
class OldWorldIslandDefinition:
    id: str
    name: str
    land_spaces: int
    coast_spaces: int
    sea_spaces: int

# Temporary engine fixtures, not verified official island layouts.
OLD_WORLD_CATALOGUE = (
    OldWorldIslandDefinition(
        id="old-world-test-1",
        name="Old World Test Island 1",
        land_spaces=2,
        coast_spaces=1,
        sea_spaces=0,
    ),
    OldWorldIslandDefinition(
        id="old-world-test-2",
        name="Old World Test Island 2",
        land_spaces=1,
        coast_spaces=2,
        sea_spaces=0,
    ),
)

def create_old_world_island(definition: OldWorldIslandDefinition) -> OldWorldIsland:
    spaces: list[IslandSpace] = []

    for prefix, space_type, count in (
        ("L", IslandSpaceType.LAND, definition.land_spaces),
        ("C", IslandSpaceType.COAST, definition.coast_spaces),
        ("S", IslandSpaceType.SEA, definition.sea_spaces),
    ):
        for number in range(1, count + 1):
            spaces.append(IslandSpace(id=f"{prefix}{number}", space_type=space_type,))


    return OldWorldIsland(id=definition.id, island=Island(name=definition.name, spaces=spaces))

def create_old_world_islands() -> list[OldWorldIsland]:
    return [create_old_world_island(definition) for definition in OLD_WORLD_CATALOGUE]

