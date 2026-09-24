
from anno1800.data.cards import POPULATION_CARD_TEMPLATES
from anno1800.data.new_world import NEW_WORLD_CARDS
from anno1800.data.objectives import OBJECTIVE_CATALOGUE
from anno1800.data.industries import INDUSTRY_CATALOGUE
from anno1800.data.ships import SHIP_CATALOGUE
from anno1800.data.shipyards import SHIPYARD_CATALOGUE

from anno1800.models.cards import CardEffectType
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType
from anno1800.models.objective import (
    ObjectiveType,
    IndustryObjectiveRule,
    PopulationObjectiveRule,
    ResourceObjectiveRule,
    StartingGoldEffectRule,
)


def require_unique_ids(items, catalogue_name: str) -> None:
    ids = [item.id for item in items]

    if any(not item_id for item_id in ids):
        raise ValueError(f"{catalogue_name} contains an empty ID")

    if len(ids) != len(set(ids)):
        raise ValueError(f"{catalogue_name} contains duplicate IDs")


def validate_population_cards() -> None:
    cards = [*POPULATION_CARD_TEMPLATES, *NEW_WORLD_CARDS]

    require_unique_ids(cards, "Population cards")

    for card in cards:
        if card.victory_points < 0:
            raise ValueError(f"{card.id}: negative victory points")

        if not card.is_new_world and not isinstance(
            card.population_type, PopulationType
        ):
            raise ValueError(
                f"{card.id}: invalid population type"
            )

        if not card.requirements:
            raise ValueError(
                f"{card.id}: missing goods requirements"
            )

        for good, amount in card.requirements.items():
            if not isinstance(good, Good) or amount <= 0:
                raise ValueError(
                    f"{card.id}: invalid goods requirement"
                )

        for effect in card.effects:
            if not isinstance(effect.effect_type, CardEffectType):
                raise ValueError(
                    f"{card.id}: unknown card effect"
                )

            if effect.amount <= 0:
                raise ValueError(
                    f"{card.id}: invalid effect amount"
                )

            if (
                effect.effect_type == CardEffectType.GAIN_POPULATION
                and not isinstance(
                    effect.population_type, PopulationType
                )
            ):
                raise ValueError(
                    f"{card.id}: missing population type"
                )


def validate_objectives() -> None:
    require_unique_ids(OBJECTIVE_CATALOGUE, "Objectives")

    industry_ids = {
        definition.id for definition in INDUSTRY_CATALOGUE
    }

    for card in OBJECTIVE_CATALOGUE:
        rule = card.rule

        if card.objective_type == ObjectiveType.END_GAME:
            if isinstance(rule, IndustryObjectiveRule):
                unknown = set(rule.industries) - industry_ids
                if unknown:
                    raise ValueError(
                        f"{card.id}: unknown industries {unknown}"
                    )

            elif isinstance(rule, PopulationObjectiveRule):
                PopulationType(rule.population_type)

            elif isinstance(rule, ResourceObjectiveRule):
                Good(rule.resource)

            else:
                raise ValueError(
                    f"{card.id}: unsupported scoring rule"
                )

        elif card.objective_type == ObjectiveType.EFFECT:
            if not isinstance(rule, StartingGoldEffectRule):
                raise ValueError(
                    f"{card.id}: unsupported EFFECT rule"
                )

        else:
            raise ValueError(
                f"{card.id}: unknown objective type"
            )


def validate_constructions() -> None:
    catalogues = {
        "Industries": INDUSTRY_CATALOGUE,
        "Ships": SHIP_CATALOGUE,
        "Shipyards": SHIPYARD_CATALOGUE,
    }

    for name, definitions in catalogues.items():
        require_unique_ids(definitions, name)

        for definition in definitions:
            if definition.supply < 0:
                raise ValueError(
                    f"{name}: negative supply for {definition.id}"
                )

            construction = (
                definition.industry
                if name == "Industries"
                else definition.ship
                if name == "Ships"
                else definition.shipyard
            )

            for good, amount in construction.build_cost.items():
                if not isinstance(good, Good) or amount <= 0:
                    raise ValueError(
                        f"{definition.id}: invalid build cost"
                    )


def validate_catalogues() -> None:
    validate_population_cards()
    validate_objectives()
    validate_constructions()