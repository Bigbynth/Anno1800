from anno1800.models.island import (
    Island,
    IslandSpace,
    IslandSpaceType,
)


def create_test_home_island() -> Island:

    return Island(
        name="Home Island",
        spaces=[
            IslandSpace(
                id="L1",
                space_type=(
                    IslandSpaceType.LAND
                ),
            ),
            IslandSpace(
                id="L2",
                space_type=(
                    IslandSpaceType.LAND
                ),
            ),
            IslandSpace(
                id="C1",
                space_type=(
                    IslandSpaceType.COAST
                ),
            ),
            IslandSpace(
                id="C2",
                space_type=(
                    IslandSpaceType.COAST
                ),
            ),
            IslandSpace(
                id="S1",
                space_type=(
                    IslandSpaceType.SEA
                ),
            ),
            IslandSpace(
                id="S2",
                space_type=(
                    IslandSpaceType.SEA
                ),
            ),
        ],
    )