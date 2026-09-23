from anno1800.models.cards import PopulationCard, CardEffect, CardEffectType
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType
from anno1800.models.deck import PopulationCardDeck

from copy import deepcopy

POPULATION_CARD_TEMPLATES = [
    PopulationCard(id="farmer-001", population_type=PopulationType.FARMER, requirements={Good.BREAD: 1}, victory_points=2, effects=(CardEffect(effect_type=(CardEffectType.GAIN_GOLD), amount=2,))),
    PopulationCard(id="farmer-002", population_type=PopulationType.FARMER, requirements={Good.CLOTHING: 1}, victory_points=3),
    PopulationCard(id="worker-001", population_type=PopulationType.WORKER, requirements={Good.BEER: 1}, victory_points=3, effects=(CardEffect(effect_type=(CardEffectType.GAIN_TRADE_CAPACITY), amount=1,))),
    PopulationCard(id="worker-002", population_type=PopulationType.WORKER, requirements={Good.BREAD: 1, Good.CLOTHING: 1}, victory_points=4),
    PopulationCard(id="artisan-001", population_type=PopulationType.ARTISAN, requirements={Good.SEWING_MACHINE: 1}, victory_points=5, effects=(CardEffect(effect_type=(CardEffectType.GAIN_POPULATION), population_type=(PopulationType.WORKER), amount=1,))),
    PopulationCard(id="engineer-001", population_type=PopulationType.ENGINEER, requirements={Good.BICYCLE: 1}, victory_points=6),
    PopulationCard(id="investor-001", population_type=PopulationType.INVESTOR, requirements={Good.GRAMOPHONE: 1}, victory_points=8)
]

def create_population_deck() -> PopulationCardDeck:
    farmer_worker_cards: list[PopulationCard] = []

    advanced_cards: list[PopulationCard] = []
    new_world_cards: list[PopulationCard] = []
    for template in POPULATION_CARD_TEMPLATES:
        card = deepcopy(template)

        if card.is_new_world:
            new_world_cards.append(card)

        elif card.population_type in (PopulationType.FARMER, PopulationType.WORKER):
            farmer_worker_cards.append(card)
        else:
            advanced_cards.append(card)

    return PopulationCardDeck(farmer_worker_cards=farmer_worker_cards, advanced_cards=advanced_cards, new_world_cards=new_world_cards)
