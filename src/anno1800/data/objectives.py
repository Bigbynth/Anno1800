from anno1800.models.objective import ObjectiveCard, ObjectiveType, IndustryObjectiveRule, PopulationObjectiveRule, ResourceObjectiveRule, StartingGoldEffectRule
from copy import deepcopy
from pathlib import Path
import json
from anno1800.data.industries import INDUSTRY_CATALOGUE

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
    ObjectiveCard(
        id="objective-test-007", name="Bread Production",
        objective_type=ObjectiveType.END_GAME,
        rule=ResourceObjectiveRule(resource="bread", minimum=2, points=4),
    ),
    ObjectiveCard(
        id="objective-test-008", name="Coal Production",
        objective_type=ObjectiveType.END_GAME,
        rule=ResourceObjectiveRule(resource="coal", minimum=3, points=5),
    ),
    ObjectiveCard(
        id="objective-test-009", name="Starting Treasury",
        objective_type=ObjectiveType.EFFECT,
        rule=StartingGoldEffectRule(amount=2),
    ),
)

def validate_objective_catalogue() -> None:
    ids = [card.id for card in OBJECTIVE_CATALOGUE]

    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate objective card IDs")

def create_objective_cards(use_custom: bool = False) -> list[ObjectiveCard]:
    if use_custom:
        return load_custom_objectives()
    validate_objective_catalogue()
    return deepcopy(list(OBJECTIVE_CATALOGUE))


CUSTOM_OBJECTIVES_DATA = Path(__file__).parent / "official" / "objectives.json"


def load_custom_objectives(path: Path = CUSTOM_OBJECTIVES_DATA) -> list[ObjectiveCard]:
    """Load 20 invented homebrew objectives; never represent them as official cards."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Custom objectives must be a JSON array")
    cards: list[ObjectiveCard] = []
    seen: set[str] = set()
    industry_ids = {definition.id for definition in INDUSTRY_CATALOGUE}
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("Every objective must be a JSON object")
        card_id = item.get("id")
        if not isinstance(card_id, str) or not card_id.strip() or card_id in seen:
            raise ValueError(f"Missing or duplicate objective ID: {card_id!r}")
        seen.add(card_id)
        if (item.get("record_type") != "custom_game_card"
                or item.get("deck") != "objectives"
                or item.get("verification") != "invented"
                or item.get("source") != "custom_balanced_v1"):
            raise ValueError(f"{card_id}: invalid custom objective provenance")
        quantity = item.get("quantity")
        if type(quantity) is not int or quantity != 1:
            raise ValueError(f"{card_id}: each custom objective must have quantity 1")
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"{card_id}: missing name")
        objective_type = ObjectiveType(item["objective_type"])
        spec = item["rule"]
        if not isinstance(spec, dict):
            raise ValueError(f"{card_id}: invalid rule")
        rule_type = spec["type"]
        if rule_type == "industry":
            ids = spec["industries"]
            if (not isinstance(ids, list) or not ids or len(set(ids)) != len(ids)
                    or not set(ids) <= industry_ids):
                raise ValueError(f"{card_id}: unknown or duplicate industry")
            points = spec["points_per_industry"]
            if type(points) is not int or points <= 0:
                raise ValueError(f"{card_id}: invalid points_per_industry")
            rule = IndustryObjectiveRule(tuple(ids), points)
        elif rule_type == "population":
            from anno1800.models.population import PopulationType
            population = PopulationType(spec["population_type"])
            minimum, points = spec["minimum"], spec["points"]
            if any(type(n) is not int or n <= 0 for n in (minimum, points)):
                raise ValueError(f"{card_id}: invalid population threshold or points")
            rule = PopulationObjectiveRule(population.value, minimum, points)
        elif rule_type == "resource":
            from anno1800.models.goods import Good
            good = Good(spec["resource"])
            minimum, points = spec["minimum"], spec["points"]
            if any(type(n) is not int or n <= 0 for n in (minimum, points)):
                raise ValueError(f"{card_id}: invalid resource threshold or points")
            rule = ResourceObjectiveRule(good.value, minimum, points)
        elif rule_type == "starting_gold":
            amount = spec["amount"]
            if type(amount) is not int or not 0 < amount <= 2:
                raise ValueError(f"{card_id}: invalid starting gold")
            rule = StartingGoldEffectRule(amount)
        else:
            raise ValueError(f"{card_id}: unsupported objective rule {rule_type!r}")
        if (objective_type == ObjectiveType.EFFECT) != isinstance(rule, StartingGoldEffectRule):
            raise ValueError(f"{card_id}: objective type and rule mismatch")
        cards.append(ObjectiveCard(card_id, name, objective_type, rule))
    if len(cards) != 20:
        raise ValueError(f"Expected 20 custom objectives, found {len(cards)}")
    if sum(c.objective_type == ObjectiveType.EFFECT for c in cards) != 2:
        raise ValueError("Expected exactly two custom effect objectives")
    return cards
