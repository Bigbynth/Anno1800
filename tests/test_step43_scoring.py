"""Step 43: score categories, objective rules and all tie-break stages."""
import pytest
from anno1800.game import Game
from anno1800.scoring import ScoringEngine, ScoreBreakdown, PlayerScore
from anno1800.models.population import PopulationType
from anno1800.models.cards import PopulationCard
from anno1800.models.expedition import ExpeditionCard, ExpeditionReward
from anno1800.models.objective import (
    ObjectiveCard, ObjectiveType, PopulationObjectiveRule,
    IndustryObjectiveRule, ResourceObjectiveRule,
)
from anno1800.services.objective_scoring import score_objective

def test_population_cards_all_tiers_and_new_world_priority():
    game=Game.from_names(["Alice","Bob"])
    p=game.state.players[0]
    p.completed_cards=[
        PopulationCard("farmer", PopulationType.FARMER),
        PopulationCard("worker", PopulationType.WORKER),
        PopulationCard("artisan", PopulationType.ARTISAN),
        PopulationCard("engineer", PopulationType.ENGINEER),
        PopulationCard("investor", PopulationType.INVESTOR),
        PopulationCard("new-world", PopulationType.FARMER, is_new_world=True),
    ]
    assert ScoringEngine()._score_population_cards(p)==35

def test_gold_threshold_and_fireworks_identity():
    game=Game.from_names(["Alice","Bob"])
    a,b=game.state.players
    a.gold=8
    game.state.fireworks_holder=a
    scorer=ScoringEngine()
    assert scorer._score_gold(a)==2
    assert scorer._score_fireworks(game.state,a)==7
    assert scorer._score_fireworks(game.state,b)==0

def test_expedition_rewards_cannot_reuse_same_cube():
    game=Game.from_names(["Alice","Bob"])
    p=game.state.players[0]
    # Use a separate player with precisely one advanced cube.
    p.population.cubes.clear()
    p.add_population(PopulationType.ARTISAN,1)
    p.expedition_cards=[
        ExpeditionCard("e1",ExpeditionReward(PopulationType.ARTISAN,7),
                       ExpeditionReward(PopulationType.ARTISAN,4)),
        ExpeditionCard("e2",ExpeditionReward(PopulationType.ARTISAN,6),
                       ExpeditionReward(PopulationType.ARTISAN,3)),
    ]
    assert ScoringEngine()._score_expeditions(p)==7

def test_population_objective_threshold():
    game=Game.from_names(["Alice","Bob"])
    p=game.state.players[0]
    p.population.cubes.clear()
    card=ObjectiveCard("threshold","Threshold",ObjectiveType.END_GAME,
                       PopulationObjectiveRule("engineer",2,6))
    p.add_population(PopulationType.ENGINEER,1)
    assert score_objective(card,p)==0
    p.add_population(PopulationType.ENGINEER,1)
    assert score_objective(card,p)==6

def test_industry_objective_counts_matching_industries():
    game=Game.from_names(["Alice","Bob"])
    p=game.state.players[0]
    from anno1800.data.industries import INDUSTRY_CATALOGUE
    industry=INDUSTRY_CATALOGUE[0]
    card=ObjectiveCard("industry","Industry",ObjectiveType.END_GAME,
                       IndustryObjectiveRule((industry.id,),3))
    # Existing starting industries, if any, contribute to the score.
    expected=sum(owned.industry==industry.industry for owned in p.get_all_industries())*3
    assert score_objective(card,p)==expected

def test_resource_objective_uses_production_ledger():
    game=Game.from_names(["Alice","Bob"])
    card=ObjectiveCard("resource","Resource",ObjectiveType.END_GAME,
                       ResourceObjectiveRule("coffee",2,4))
    player = game.state.players[0]
    from anno1800.models.goods import Good
    assert score_objective(card, player) == 0
    player.record_production(Good.COFFEE)
    assert score_objective(card, player) == 0
    player.record_production(Good.COFFEE)
    assert score_objective(card, player) == 4

def test_score_breakdown_total():
    assert ScoreBreakdown(11,12,2,7,5).total==37

def test_score_before_finish_is_rejected():
    game=Game.from_names(["Alice","Bob"])
    with pytest.raises(RuntimeError):
        ScoringEngine().calculate_result(game.state)

def test_unique_high_score_wins():
    game=Game.from_names(["Alice","Bob"])
    a,b=game.state.players
    a.gold=30
    game.state.game_over=True
    result=ScoringEngine().calculate_result(game.state)
    assert result.winners==(a,)

def test_construction_tiebreaker():
    game=Game.from_names(["Alice","Bob"])
    a,b=game.state.players
    scorer=ScoringEngine()
    # Starting construction counts are equal; add one owned ship to A.
    a.ships.append(a.ships[0])
    entries=[PlayerScore(a,ScoreBreakdown(0,0,0,0)),
             PlayerScore(b,ScoreBreakdown(0,0,0,0))]
    assert scorer._resolve_winners(entries)==(a,)

def test_fewest_hand_cards_tiebreaker():
    game=Game.from_names(["Alice","Bob"])
    a,b=game.state.players
    b.hand.pop()
    entries=[PlayerScore(a,ScoreBreakdown(0,0,0,0)),
             PlayerScore(b,ScoreBreakdown(0,0,0,0))]
    assert ScoringEngine()._resolve_winners(entries)==(b,)

def test_shared_winners_after_all_tiebreakers():
    game=Game.from_names(["Alice","Bob"])
    a,b=game.state.players
    entries=[PlayerScore(a,ScoreBreakdown(0,0,0,0)),
             PlayerScore(b,ScoreBreakdown(0,0,0,0))]
    assert ScoringEngine()._resolve_winners(entries)==(a,b)


def test_score_player_rejects_outsider():
    from anno1800.models.player import PlayerState
    game=Game.from_names(["Alice","Bob"])
    with pytest.raises(ValueError,match="does not belong"):
        ScoringEngine().score_player(game.state,PlayerState(name="Outsider"))

def test_empty_result_rejected():
    game=Game.from_names(["Alice","Bob"])
    game.state.players.clear()
    game.state.game_over=True
    with pytest.raises(ValueError,match="without players"):
        ScoringEngine().calculate_result(game.state)

def test_score_game_matches_calculate_result():
    game=Game.from_names(["Alice","Bob"])
    game.state.game_over=True
    scorer=ScoringEngine()
    result=scorer.calculate_result(game.state)
    assert scorer.score_game(game.state)==[
        (entry.player,entry.score) for entry in result.scores
    ]
