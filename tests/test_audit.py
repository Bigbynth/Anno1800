import pytest
from anno1800.game_setup import GameSetup
from anno1800.game_state import GameState
from anno1800.data.objectives import create_objective_cards
from anno1800.models.player import PlayerState
from anno1800.models.population import PopulationType
from anno1800.services.objective_scoring import score_objective
from anno1800.actions.take_expedition_cards import TakeExpeditionCardsAction
from anno1800.actions.context import ActionContext
from anno1800.models.ship import NavalTokenType

@pytest.mark.parametrize('n',[2,3,4])
def test_setup(n):
 s=GameSetup().create_game([f'P{i}' for i in range(n)])
 assert len(s.players)==n

def test_independent_decks():
 a,b=GameState(),GameState()
 assert a.objective_deck[0] is not b.objective_deck[0]
 assert a.expedition_deck.cards[0] is not b.expedition_deck.cards[0]

@pytest.mark.parametrize('card',create_objective_cards())
def test_objective_empty_player(card):
 assert score_objective(card,PlayerState(name='P'))==0

def test_expedition_rollback(monkeypatch):
 s=GameState();p=PlayerState(name='P');p.add_naval_tokens(NavalTokenType.EXPLORATION,2)
 before=[x.available for x in p.naval_tokens];before_cards=s.expedition_deck.cards.copy()
 def fail(_):raise RuntimeError('injected failure')
 monkeypatch.setattr(p,'add_expedition_cards',fail)
 with pytest.raises(RuntimeError,match='injected failure'):
  TakeExpeditionCardsAction().execute(ActionContext(state=s,player=p))
 assert [x.available for x in p.naval_tokens]==before
 assert s.expedition_deck.cards==before_cards
 assert p.expedition_cards==[]
