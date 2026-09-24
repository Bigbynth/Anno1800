import json 
from pathlib import Path

from anno1800.data.official.schema import CardSource, CardCategory, OfficialPopulationCard, VerificationStatus

DATA_DIRECTORY = Path(__file__).resolve().parent

def load_population_cards(path: Path | None = None) -> list[OfficialPopulationCard]:
    path = path or DATA_DIRECTORY / "population.json"

    with path.open(encoding="utf-8") as file:
        records = json.load(file)

    if not isinstance(records, list):
        raise ValueError("Population catalogue must be a list")

    cards = []
    seen_ids = set()

    for record in records:
        source_data = record.get("source")

        source = (CardSource(**source_data) if source_data is not None else None)

        card = OfficialPopulationCard(
            id=record["id"],
            category=CardCategory(record["category"]),
            requirements=record["requirements"],
            victory_points=record["victory_points"],
            effects=record.get("effects", []),
            title=record.get("title"),
            artwork_path=record.get("artwork_path"),
            source=source,
            verification=VerificationStatus(record.get("verification", "unverified"))
        )

        card.validate()

        if card.id in seen_ids:
            raise ValueError(f"Duplicate official card ID: {card.id}")

        seen_ids.add(card.id)
        cards.append(card)

    return cards

def catalogue_report(cards: list[OfficialPopulationCard]) -> dict[str, int]:
    return {
        "total": len(cards),
        "verified": sum(card.verification == VerificationStatus.VERIFIED for card in cards),
        "transcribed": sum(card.verification == VerificationStatus.TRANSCRIBED for card in cards),
        "unverified": sum(card.verification == VerificationStatus.UNVERIFIED for card in cards)
    }