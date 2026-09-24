from anno1800.models.cards import PopulationCard, CardEffect, CardEffectType
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType
from anno1800.models.deck import PopulationCardDeck

from copy import deepcopy

# ENGINE TEST FIXTURES: invented combinations, not official printed cards.
# Match the rulebook's 46 Farmer/Worker and 32 advanced cards.
_FARMER_WORKER_GOODS = [
    (Good.BREAD,), (Good.CLOTHING,), (Good.GRAIN,), (Good.WOOL,),
    (Good.BEER,), (Good.BRICK,), (Good.COAL,),
    (Good.BREAD, Good.CLOTHING), (Good.BEER, Good.BREAD),
    (Good.CLOTHING, Good.WOOL), (Good.GRAIN, Good.BEER),
    (Good.BRICK, Good.BREAD), (Good.COAL, Good.CLOTHING),
    (Good.BEER, Good.BRICK), (Good.GRAIN, Good.WOOL),
]
_ADVANCED_GOODS = [
    (Good.STEEL,), (Good.WINDOWS,), (Good.SEWING_MACHINE,),
    (Good.BICYCLE,), (Good.GRAMOPHONE,), (Good.BEER, Good.STEEL),
    (Good.WINDOWS, Good.BRICK), (Good.SEWING_MACHINE, Good.CLOTHING),
    (Good.BICYCLE, Good.STEEL), (Good.GRAMOPHONE, Good.WINDOWS),
    (Good.STEEL, Good.COAL),
]

def _fixture_cards() -> list[PopulationCard]:
    result: list[PopulationCard] = []
    for i in range(46):
        population_type = PopulationType.FARMER if i % 2 == 0 else PopulationType.WORKER
        goods = _FARMER_WORKER_GOODS[i % len(_FARMER_WORKER_GOODS)]
        effect = (
            (CardEffect(CardEffectType.GAIN_GOLD, amount=1 + i % 3),)
            if i % 4 == 0 else
            (CardEffect(CardEffectType.GAIN_TRADE_CAPACITY, amount=1),)
            if i % 4 == 1 else ()
        )
        result.append(PopulationCard(
            id=f"fixture-fw-{i+1:03d}", population_type=population_type,
            requirements={good: 1 for good in goods}, victory_points=3,
            effects=effect,
        ))
    for i in range(32):
        population_type = (PopulationType.ARTISAN, PopulationType.ENGINEER,
                           PopulationType.INVESTOR)[i % 3]
        goods = _ADVANCED_GOODS[i % len(_ADVANCED_GOODS)]
        effect = (
            (CardEffect(CardEffectType.GAIN_GOLD, amount=2),)
            if i % 4 == 0 else
            (CardEffect(CardEffectType.GAIN_EXPLORATION_CAPACITY, amount=1),)
            if i % 4 == 1 else
            (CardEffect(CardEffectType.GAIN_POPULATION,
                        population_type=PopulationType.WORKER, amount=1),)
            if i % 4 == 2 else ()
        )
        result.append(PopulationCard(
            id=f"fixture-advanced-{i+1:03d}", population_type=population_type,
            requirements={good: 1 for good in goods}, victory_points=8,
            effects=effect,
        ))
    return result

POPULATION_CARD_TEMPLATES = _fixture_cards()

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
