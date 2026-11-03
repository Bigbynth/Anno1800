from anno1800.data.industries import get_industry_definition

from anno1800.models.objective import (
    IndustryObjectiveRule,
    ObjectiveCard,
    ObjectiveType,
    PopulationObjectiveRule,
    ResourceObjectiveRule,
    StartingGoldEffectRule,
)
from anno1800.models.player import PlayerState
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType

def score_objective(card: ObjectiveCard, player: PlayerState) -> int:
    if card.objective_type == ObjectiveType.EFFECT:
        if isinstance(card.rule, StartingGoldEffectRule):
            return 0  # Applied at setup, never scored again.
        raise TypeError(f"Unsupported EFFECT rule: {type(card.rule).__name__}")
    if card.objective_type != ObjectiveType.END_GAME:
        raise ValueError(f"Unknown objective type: {card.objective_type}")

    rule = card.rule

    if isinstance(rule, IndustryObjectiveRule):
        owned_ids = [
            get_industry_definition(owned.industry).id 
            for owned in player.get_all_industries()
        ]

        count = sum(industry_id in rule.industries for industry_id in owned_ids)

        return count * rule.points_per_industry

    if isinstance(rule, PopulationObjectiveRule):
        population_type = PopulationType(rule.population_type)

        amount = player.population.total(population_type)

        return rule.points if amount >= rule.minimum else 0

    if isinstance(rule, ResourceObjectiveRule):
        resource = Good(rule.resource)
        return (
            rule.points
            if player.goods_produced.get(resource, 0) >= rule.minimum
            else 0
        )

    raise TypeError(f"Unsupported objective rules: {type(rule).__name__}")

def score_objectives(cards: list[ObjectiveCard], player: PlayerState) -> int:
    return sum(score_objective(card, player) for card in cards)


def apply_starting_objective_effects(
    cards: list[ObjectiveCard],
    players: list[PlayerState],
) -> None:
    """Apply selected test EFFECT cards once during game creation."""
    for card in cards:
        if card.objective_type != ObjectiveType.EFFECT:
            continue
        if not isinstance(card.rule, StartingGoldEffectRule):
            raise TypeError(f"Unsupported EFFECT rule: {type(card.rule).__name__}")
        for player in players:
            player.add_gold(card.rule.amount)
