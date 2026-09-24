from copy import deepcopy
from dataclasses import dataclass

from anno1800.models.expedition import ExpeditionCard, ExpeditionReward
from anno1800.models.deck import ExpeditionDeck
from anno1800.models.population import PopulationType


@dataclasss(frozen=True)
class ExpeditionRewardDefinition:
    population_type: PopulationType
    victory_points: int

@dataclass(frozen=True)
class ExpeditionCardDefinition:
    id: str
    animal: ExpeditionRewardDefinition
    artifact: ExpeditionRewardDefinition


A = PopulationType.ARTISAN
E = PopulationType.ENGINEER
I = PopulationType.INVESTOR

# Temporary engine fixtures, not official card data.
EXPEDITION_CATALOGUE = (
    ExpeditionCardDefinition(
        "expedition-001",
        ExpeditionRewardDefinition(A, 2),
        ExpeditionRewardDefinition(E, 3),
    ),
    ExpeditionCardDefinition(
        "expedition-002",
        ExpeditionRewardDefinition(E, 3),
        ExpeditionRewardDefinition(I, 4),
    ),
    ExpeditionCardDefinition(
        "expedition-003",
        ExpeditionRewardDefinition(A, 2),
        ExpeditionRewardDefinition(I, 4),
    ),
    ExpeditionCardDefinition(
        "expedition-004",
        ExpeditionRewardDefinition(A, 3),
        ExpeditionRewardDefinition(E, 2),
    ),
    ExpeditionCardDefinition(
        "expedition-005",
        ExpeditionRewardDefinition(E, 4),
        ExpeditionRewardDefinition(I, 3),
    ),
    ExpeditionCardDefinition(
        "expedition-006",
        ExpeditionRewardDefinition(I, 5),
        ExpeditionRewardDefinition(A, 2),
    ),
    ExpeditionCardDefinition(
        "expedition-007",
        ExpeditionRewardDefinition(A, 2),
        ExpeditionRewardDefinition(E, 4),
    ),
    ExpeditionCardDefinition(
        "expedition-008",
        ExpeditionRewardDefinition(E, 3),
        ExpeditionRewardDefinition(I, 5),
    ),
    ExpeditionCardDefinition(
        "expedition-009",
        ExpeditionRewardDefinition(I, 4),
        ExpeditionRewardDefinition(A, 3),
    ),
    ExpeditionCardDefinition(
        "expedition-010",
        ExpeditionRewardDefinition(A, 3),
        ExpeditionRewardDefinition(I, 3),
    ),
    ExpeditionCardDefinition(
        "expedition-011",
        ExpeditionRewardDefinition(E, 2),
        ExpeditionRewardDefinition(A, 4),
    ),
    ExpeditionCardDefinition(
        "expedition-012",
        ExpeditionRewardDefinition(I, 3),
        ExpeditionRewardDefinition(E, 4),
    ),
)

def create_expedition_deck() -> ExpeditionDeck:
    cards = [
        ExpeditionCard(
            id=definition.id,
            animal=ExpeditionReward(
                population_type=definition.animal.population_type,
                victory_points=definition.animal.victory_points,
            ),
            artifact=ExpeditionReward(
                population_type=definition.artifact.population_type,
                victory_points=definition.artifact.victory_points,
            ),
        )
        for definition in EXPEDITION_CATALOGUE
    ]

    return ExpeditionDeck(cards=cards)