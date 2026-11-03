"""Step 47: strict, gameplay-only Farmer/Worker catalogue ingestion.

Never label a card verified without a source identifying its printed data.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from anno1800.models.cards import CardEffect, CardEffectType, PopulationCard
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

BASIC_DATA = Path(__file__).with_name("population_basic.json")
BASIC_TYPES = {PopulationType.FARMER, PopulationType.WORKER}


@dataclass(frozen=True)
class VerifiedCardRecord:
    card: PopulationCard
    quantity: int
    source: str


def load_basic_cards(path: Path = BASIC_DATA) -> list[VerifiedCardRecord]:
    """Load verified basic card definitions, not individual deck copies."""
    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise ValueError("Basic population catalogue must be a JSON array")

    result: list[VerifiedCardRecord] = []
    seen: set[str] = set()
    for item in records:
        if not isinstance(item, dict):
            raise ValueError("Every card entry must be a JSON object")
        card_id = item["id"]
        if not isinstance(card_id, str) or not card_id.strip() or card_id in seen:
            raise ValueError(f"Empty or duplicate card ID: {card_id!r}")
        seen.add(card_id)
        if item.get("verification") != "verified":
            raise ValueError(f"{card_id}: official deck accepts only verified entries")
        source = item.get("source")
        if not isinstance(source, str) or not source.strip():
            raise ValueError(f"{card_id}: missing source reference")
        quantity = item["quantity"]
        if type(quantity) is not int or quantity <= 0:
            raise ValueError(f"{card_id}: quantity must be a positive integer")
        population_type = PopulationType(item["category"])
        if population_type not in BASIC_TYPES:
            raise ValueError(f"{card_id}: expected Farmer or Worker")
        points = item["victory_points"]
        if type(points) is not int or points < 0:
            raise ValueError(f"{card_id}: invalid victory points")
        raw_requirements = item["requirements"]
        if not isinstance(raw_requirements, dict) or not raw_requirements:
            raise ValueError(f"{card_id}: missing goods requirements")
        requirements: dict[Good, int] = {}
        for key, amount in raw_requirements.items():
            good = Good(key)
            if type(amount) is not int or amount <= 0:
                raise ValueError(f"{card_id}: invalid amount for {key}")
            requirements[good] = amount
        effects = []
        for effect in item.get("effects", []):
            effect_type = CardEffectType(effect["type"])
            population = effect.get("population_type")
            effects.append(CardEffect(
                effect_type=effect_type,
                amount=effect.get("amount", 1),
                population_type=PopulationType(population) if population else None,
            ))
        result.append(VerifiedCardRecord(
            card=PopulationCard(
                id=card_id,
                population_type=population_type,
                requirements=requirements,
                victory_points=points,
                effects=tuple(effects),
            ),
            quantity=quantity,
            source=source,
        ))
    return result


def basic_catalogue_report(path: Path = BASIC_DATA) -> dict[str, int]:
    records = load_basic_cards(path)
    return {
        "verified_definitions": len(records),
        "verified_physical_cards": sum(record.quantity for record in records),
        "remaining_physical_cards": max(0, 46 - sum(record.quantity for record in records)),
    }


# Homebrew catalogue: deliberately separate from load_basic_cards(), which
# only accepts independently verified transcriptions of physical cards.
CUSTOM_DATA = Path(__file__).with_name("population.json")


def load_custom_population_deck(path: Path = CUSTOM_DATA):
    """Load the complete, explicitly invented Old World deck from population.json.

    Returns PopulationCardDeck. Never claims the records are official cards.
    """
    from anno1800.models.deck import PopulationCardDeck

    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Custom population catalogue must be a JSON array")
    basic: list[PopulationCard] = []
    advanced: list[PopulationCard] = []
    seen_ids: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("Each custom card must be a JSON object")
        card_id = item["id"]
        if not isinstance(card_id, str) or not card_id or card_id in seen_ids:
            raise ValueError(f"Missing or duplicate custom card ID: {card_id!r}")
        seen_ids.add(card_id)
        if item.get("verification") != "invented":
            raise ValueError(f"{card_id}: custom loader accepts only invented cards")
        if item.get("source") != "custom_balanced_v1":
            raise ValueError(f"{card_id}: unexpected custom source")
        category = PopulationType(item["category"])
        expected_deck = (
            "farmer_worker" if category in BASIC_TYPES else "advanced"
        )
        if item.get("deck") != expected_deck:
            raise ValueError(f"{card_id}: deck/category mismatch")
        points = item["victory_points"]
        if type(points) is not int or points != (3 if expected_deck == "farmer_worker" else 8):
            raise ValueError(f"{card_id}: invalid victory points")
        quantity = item["quantity"]
        if type(quantity) is not int or quantity < 1:
            raise ValueError(f"{card_id}: invalid quantity")
        raw_requirements = item["requirements"]
        if not isinstance(raw_requirements, dict) or not raw_requirements:
            raise ValueError(f"{card_id}: missing requirements")
        requirements: dict[Good, int] = {}
        for name, amount in raw_requirements.items():
            if type(amount) is not int or amount < 1:
                raise ValueError(f"{card_id}: invalid requirement {name}")
            requirements[Good(name)] = amount
        effects = []
        if not isinstance(item["effects"], list):
            raise ValueError(f"{card_id}: effects must be a list")
        for e in item["effects"]:
            effect_type = CardEffectType(e["type"])
            population_type = (
                PopulationType(e["population_type"])
                if e.get("population_type") else None
            )
            effects.append(CardEffect(
                effect_type=effect_type,
                amount=e.get("amount", 1),
                population_type=population_type,
            ))
        destination = basic if expected_deck == "farmer_worker" else advanced
        for copy_index in range(quantity):
            physical_id = card_id if quantity == 1 else f"{card_id}-copy-{copy_index + 1}"
            destination.append(PopulationCard(
                id=physical_id,
                population_type=category,
                requirements=requirements.copy(),
                victory_points=points,
                effects=tuple(effects),
            ))
    if len(basic) != 46 or len(advanced) != 32:
        raise ValueError(
            f"Custom Old World deck must contain 46 basic and 32 advanced cards; "
            f"found {len(basic)} and {len(advanced)}"
        )
    return PopulationCardDeck(farmer_worker_cards=basic, advanced_cards=advanced)
