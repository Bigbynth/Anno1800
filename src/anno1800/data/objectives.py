from anno1800.models.objective import ObjectiveCard
from copy import deepcopy

# Add verified objective definitions here.
OBJECTIVE_CATALOGUE: tuple[ObjectiveCard, ...] = ()

def validate_objective_catalogue() -> None:
    ids = [card.id for card in OBJECTIVE_CATALOGUE]

    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate objective card IDs")

def create_objective_cards() -> list[ObjectiveCard]:
    validate_objective_catalogue()

    return deepcopy(list(OBJECTIVE_CATALOGUE))