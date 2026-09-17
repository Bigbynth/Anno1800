from anno1800.models.cards import PopulationCard
from anno1800.models.goods import Good
from anno1800.models.new_world import NewWorldIsland

NEW_WORLD_ISLANDS = [
    NewWorldIsland(
        id="nw-island-01",
        name="New World Island 1",
        resources=(
            Good.SUGAR_CANE,
            Good.TOBACCO,
            Good.COTTON
        )
    ),
    NewWorldIsland(
        id="nw-island-02",
        name="New World Island 2",
        resources=(
            Good.COFFEE,
            Good.RUBBER,
            Good.COCOA
        )
    ),

    NewWorldIsland(
        id="nw-island-03",
        name="New World Island 3",
        resources=(
            Good.SUGAR_CANE,
            Good.COFFEE,
            Good.RUBBER
        )
    ),

    NewWorldIsland(
        id="nw-island-04",
        name="New World Island 4",
        resources=(
            Good.TOBACCO,
            Good.COTTON,
            Good.COCOA
        )
    )
]

NEW_WORLD_CARDS = [
    PopulationCard(id="new-world-001", population_type=None, requirements={Good.COTTON: 1}, victory_points=5, is_new_world=True),
    PopulationCard(id="new-world-002", population_type=None, requirements={Good.COFFEE: 1}, victory_points=5, is_new_world=True),
    PopulationCard(id="new-world-003", population_type=None, requirements={Good.TOBACCO: 1}, victory_points=5, is_new_world=True),
    PopulationCard(id="new-world-004", population_type=None, requirements={Good.SUGAR_CANE: 1}, victory_points=5, is_new_world=True),
    PopulationCard(id="new-world-005", population_type=None, requirements={Good.COCOA: 1}, victory_points=5, is_new_world=True),
    PopulationCard(id="new-world-006", population_type=None, requirements={Good.RUBBER: 1}, victory_points=5, is_new_world=True)


    
]