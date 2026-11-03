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


# Optional homebrew New World deck; default fixtures remain unchanged.
import json
from pathlib import Path
from anno1800.models.cards import CardEffect, CardEffectType
from anno1800.models.population import PopulationType

CUSTOM_NEW_WORLD_DATA = Path(__file__).parent / "official" / "new_world.json"
NEW_WORLD_GOODS = {
    Good.SUGAR_CANE, Good.TOBACCO, Good.COTTON,
    Good.COFFEE, Good.RUBBER, Good.COCOA,
}

def load_custom_new_world_cards(path: Path = CUSTOM_NEW_WORLD_DATA) -> list[PopulationCard]:
    """Return 24 explicitly invented New World cards from JSON."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("New World catalogue must be a JSON array")
    cards: list[PopulationCard] = []
    seen_ids: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("Every New World card must be a JSON object")
        card_id = item["id"]
        if not isinstance(card_id, str) or not card_id.strip() or card_id in seen_ids:
            raise ValueError(f"Missing or duplicate New World card ID: {card_id!r}")
        seen_ids.add(card_id)
        if (item.get("verification") != "invented"
                or item.get("source") != "custom_balanced_v1"
                or item.get("category") != "new_world"
                or item.get("deck") != "new_world"):
            raise ValueError(f"{card_id}: not a recognized homebrew New World card")
        if type(item.get("victory_points")) is not int or item["victory_points"] != 5:
            raise ValueError(f"{card_id}: expected 5 victory points")
        quantity = item.get("quantity")
        if type(quantity) is not int or quantity < 1:
            raise ValueError(f"{card_id}: invalid quantity")
        raw_requirements = item.get("requirements")
        if not isinstance(raw_requirements, dict) or not raw_requirements:
            raise ValueError(f"{card_id}: missing requirements")
        requirements: dict[Good, int] = {}
        for name, amount in raw_requirements.items():
            good = Good(name)
            if good not in NEW_WORLD_GOODS or type(amount) is not int or amount != 1:
                raise ValueError(f"{card_id}: invalid New World requirement {name}")
            requirements[good] = amount
        raw_effects = item.get("effects")
        if not isinstance(raw_effects, list):
            raise ValueError(f"{card_id}: effects must be a list")
        effects: list[CardEffect] = []
        for effect in raw_effects:
            effect_type = CardEffectType(effect["type"])
            amount = effect.get("amount", 1)
            if type(amount) is not int or amount < 1:
                raise ValueError(f"{card_id}: invalid effect amount")
            population = effect.get("population_type")
            effects.append(CardEffect(
                effect_type=effect_type,
                amount=amount,
                population_type=PopulationType(population) if population else None,
            ))
        for copy_number in range(quantity):
            physical_id = card_id if quantity == 1 else f"{card_id}-copy-{copy_number + 1}"
            cards.append(PopulationCard(
                id=physical_id, population_type=None,
                requirements=requirements.copy(), victory_points=5,
                effects=tuple(effects), is_new_world=True,
            ))
    if len(cards) != 24:
        raise ValueError(f"New World deck must have 24 physical cards; found {len(cards)}")
    return cards
