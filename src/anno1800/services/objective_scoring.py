from anno1800.data.industries import get_industry_definition

from anno1800.models.objective import (
    IndustryObjectiveRule,
    ObjectiveCard,
    ObjectiveType,
    PopulationObjectiveRule,
    ResourceObjectiveRule
)
from anno1800.models.player import PlayerState
from anno1800.models.population import PopulationType

def score_objective(card: ObjectiveCard, player: PlayerState) -> int:
    if card.objective_type != ObjectiveType.END_GAME:
        raise NotImplementedError(f"Unsupported objective type: {card.objective_type}")

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
        raise NotImplementedError("Resource objective scoring is not define yet")

    raise TypeError(f"Unsupported objective rules: {type(rule).__name__}")

def score_objectives(cards: list[ObjectiveCard], player: PlayerState) -> int:
    return sum(score_objective(card, player) for card in cards)