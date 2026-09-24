from anno1800.models.objective import ObjectiveCard, ObjectiveType, IndustryObjectiveRule, PopulationObjectiveRule
from copy import deepcopy

# Add verified objective definitions here.
# TEST FIXTURES — not official Anno 1800 Objective cards.
OBJECTIVE_CATALOGUE: tuple[ObjectiveCard, ...] = (
    ObjectiveCard(
        id="objective-test-001",
        name="Agricultural Expansion",
        objective_type=ObjectiveType.END_GAME,
        rule=IndustryObjectiveRule(
            industries=("sheep-farm", "grain-farm"),
            points_per_industry=2,
        ),
    ),
    ObjectiveCard(
        id="objective-test-002",
        name="Industrial Development",
        objective_type=ObjectiveType.END_GAME,
        rule=IndustryObjectiveRule(
            industries=("coal-mine", "bakery", "brickworks"),
            points_per_industry=3,
        ),
    ),
    ObjectiveCard(
        id="objective-test-003",
        name="Growing Workforce",
        objective_type=ObjectiveType.END_GAME,
        rule=PopulationObjectiveRule(
            population_type="worker",
            minimum=5,
            points=4,
        ),
    ),
    ObjectiveCard(
        id="objective-test-004",
        name="Artisan Community",
        objective_type=ObjectiveType.END_GAME,
        rule=PopulationObjectiveRule(
            population_type="artisan",
            minimum=3,
            points=5,
        ),
    ),
    ObjectiveCard(
        id="objective-test-005",
        name="Engineering Society",
        objective_type=ObjectiveType.END_GAME,
        rule=PopulationObjectiveRule(
            population_type="engineer",
            minimum=2,
            points=6,
        ),
    ),
    ObjectiveCard(
        id="objective-test-006",
        name="Investor Class",
        objective_type=ObjectiveType.END_GAME,
        rule=PopulationObjectiveRule(
            population_type="investor",
            minimum=2,
            points=8,
        ),
    ),
)

def validate_objective_catalogue() -> None:
    ids = [card.id for card in OBJECTIVE_CATALOGUE]

    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate objective card IDs")

def create_objective_cards() -> list[ObjectiveCard]:
    validate_objective_catalogue()

    return deepcopy(list(OBJECTIVE_CATALOGUE))