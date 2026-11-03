from copy import deepcopy
import json
from pathlib import Path
from dataclasses import dataclass

from anno1800.models.expedition import ExpeditionCard, ExpeditionReward
from anno1800.models.deck import ExpeditionDeck
from anno1800.models.population import PopulationType


@dataclass(frozen=True)
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

def create_expedition_deck(use_custom: bool = False) -> ExpeditionDeck:
    if use_custom:
        return load_custom_expedition_deck()

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

# Homebrew cards are deliberately separate from the test-fixture catalogue.
CUSTOM_EXPEDITION_DATA = Path(__file__).parent / "official" / "expedition.json"


def load_custom_expedition_deck(path: Path = CUSTOM_EXPEDITION_DATA) -> ExpeditionDeck:
    """Load the 22 invented cards. Both scoring rewards use existing engine types."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Expedition catalogue must be a JSON array")
    cards: list[ExpeditionCard] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("Every expedition record must be an object")
        card_id = item.get("id")
        if not isinstance(card_id, str) or not card_id or card_id in seen:
            raise ValueError(f"Missing or duplicate expedition card ID: {card_id!r}")
        seen.add(card_id)
        if item.get("record_type") != "custom_game_card" or item.get("deck") != "expedition":
            raise ValueError(f"{card_id}: invalid custom expedition record")
        if item.get("verification") != "invented":
            raise ValueError(f"{card_id}: homebrew records must be marked invented")
        quantity = item.get("quantity")
        if type(quantity) is not int or quantity <= 0:
            raise ValueError(f"{card_id}: quantity must be a positive integer")

        def reward(side: str) -> ExpeditionReward:
            value = item[side]
            if not isinstance(value, dict):
                raise ValueError(f"{card_id}: {side} must be an object")
            population = PopulationType(value["population_type"])
            if population not in {PopulationType.ARTISAN, PopulationType.ENGINEER, PopulationType.INVESTOR}:
                raise ValueError(f"{card_id}: {side} has invalid population type")
            points = value["victory_points"]
            limits = {PopulationType.ARTISAN: (2, 4), PopulationType.ENGINEER: (3, 5), PopulationType.INVESTOR: (4, 6)}
            low, high = limits[population]
            if type(points) is not int or not low <= points <= high:
                raise ValueError(f"{card_id}: {side} victory points out of custom balance range")
            return ExpeditionReward(population_type=population, victory_points=points)

        animal = reward("animal")
        artifact = reward("artifact")
        if animal.population_type == artifact.population_type:
            raise ValueError(f"{card_id}: animal and artifact must use different populations")
        for _ in range(quantity):
            cards.append(ExpeditionCard(id=card_id, animal=animal, artifact=artifact))
    return ExpeditionDeck(cards=cards)
