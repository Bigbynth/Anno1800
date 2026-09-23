from copy import deepcopy

from anno1800.models.expedition import ExpeditionCard
from anno1800.models.deck import ExpeditionDeck

EXPEDITION_CARDS: tuple[ExpeditionCard, ...] = (

)

def create_expedition_deck() -> ExpeditionDeck:
    return ExpeditionDeck(
        cards=list(deepcopy(EXPEDITION_CARDS))
    )