from anno1800.models.objective import ObjectiveCard

OBBJECTIVE_CARDS: tuple[ObjectiveCard, ...] = (

)

def create_objective_deck() -> list[ObjectiveCard]:
    return list(ObjectiveCard)