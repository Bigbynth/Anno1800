from anno1800.models.cards import PopulationCard
from anno1800.models.goods import Good
from anno1800.models.population import PopulationType
from anno1800.models.deck import PopulationCardDeck

POPULATION_CARDS = [
    PopulationCard(id="farmer-001", population_type=PopulationType.FARMER, requirements={Good.BREAD: 1}, victory_points=2),
    PopulationCard(id="farmer-002", population_type=PopulationType.FARMER, requirements={Good.CLOTHING: 1}, victory_points=3),
    PopulationCard(id="worker-001", population_type=PopulationType.WORKER, requirements={Good.BEER: 1}, victory_points=3),
    PopulationCard(id="worker-002", population_type=PopulationType.WORKER, requirements={Good.BREAD: 1, Good.CLOTHING: 1}, victory_points=4),
    PopulationCard(id="artisan-001", population_type=PopulationType.ARTISAN, requirements={Good.SEWING_MACHINE: 1}, victory_points=5),
    PopulationCard(id="engineer-001", population_type=PopulationType.ENGINEER, requirements={Good.BICYCLE: 1}, victory_points=6),
    PopulationCard(id="investor-001", population_type=PopulationType.INVESTOR, requirements={Good.GRAMOPHONE: 1}, victory_points=8)
]

def create_population_deck() -> PopulationCardDeck:
    cards: dict[PopulationType, list[PopulationCard]] = {population_type: [] for population_type in PopulationType}

    for card in POPULATION_CARDS:
        cards[card.population_type].append(card)

    return PopulationCardDeck(cards=cards)
