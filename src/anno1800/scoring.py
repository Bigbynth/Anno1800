from dataclasses import dataclass

from anno1800.game_state import GameState
from anno1800.models.player import PlayerState
from anno1800.models.population import PopulationType

FARMER_WORKER_CARD_POINTS = 3
ADVANCED_CARD_POINTS = 8
NEW_WORLD_CARD_POINTS = 5

FIREWORKS_POINTS = 7
GOLD_PER_POINT = 3

EXPEDITION_POPULATION_TYPES = {
    PopulationType.ARTISAN,
    PopulationType.ENGINEER,
    PopulationType.INVESTOR
}


@dataclass(frozen=True)
class ScoreBreakdown:
    population_cards: int
    expeditions: int
    gold: int
    fireworks: int
    objectives: int = 0

    @property
    def total(self) -> int:
        return (self.population_cards + self.expeditions + self.gold + self.fireworks + self.objectives)
class ScoringEngine:

    def score_game(self, state: GameState) -> list[tuple[PlayerState, ScoreBreakdown]]:
        if not state.game_over:
            raise RuntimeError("Cannot score a game before it has finished")

        return [(player, self.score_player(state, player,),) for player in state.players]

    def score_player(self, state: GameState, player: PlayerState) -> ScoreBreakdown:
            population_cards = (self._score_population_cards(player))

            expeditions = (self._score_expeditions(player))

            gold = self._score_gold(player)

            fireworks = self._score_fireworks(state, player)

            return ScoreBreakdown(population_cards=population_cards, expeditions=expeditions, gold=gold, fireworks=fireworks)
    
    def _score_population_cards(self, player: PlayerState) -> int:
        score = 0

        for card in player.completed_cards:
            if card.is_new_world:
                score += NEW_WORLD_CARD_POINTS
            elif card.population_type in {PopulationType.FARMER, PopulationType.WORKER}:
                score += FARMER_WORKER_CARD_POINTS
            else:
                score += ADVANCED_CARD_POINTS

        return score

    def _score_gold(self, player: PlayerState) -> int:
        return player.gold // GOLD_PER_POINT

    def _score_fireworks(self, state: GameState, player: PlayerState) -> int:
        if state.fireworks_holder is player:
            return FIREWORKS_POINTS

        return 0

    def _score_expeditions(self, player: PlayerState) -> int:
        available = {population_type: player.population.total(population_type) for population_type in PopulationType}

        rewards = []

        for card in player.expedition_cards:
            rewards.extend([card.animal, card.artifact])

        rewards.sort(key=lambda reward: reward.victory_points, reverse=True)

        score=0

        for reward in rewards:
            if reward.population_type not in EXPEDITION_POPULATION_TYPES:
                raise ValueError(f"Invalid expedition population type: {reward.population_type.value}")
            population_type = reward.population_type

            if available[population_type] <= 0:
                continue

            available[population_type] -= 1

            score += reward.victory_points

        return score

    def _construction_count(self, player: PlayerState) -> int:
        return (len(player.get_all_industries()) + len(player.shipyards) + len(player.ships))

    def _resolve_winners(self, scores: list[PlayerScore]) -> tuple[PlayerState, ...]:
        highest_score = max(entry.score.total for entry in scores)
        tied = [entry.player for entry in scores if entry.score.total == highest_score]

        if len(tied) == 1:
            return tuple(tied)

        most_constructions = max(self._construction_count(player) for player in tied)

        tied = [player for player in tied if self._construction_count(player) == most_constructions]

        if len(tied) == 1:
            return tuple(tied)

        fewest_hand_cards = min(len(player.hand) for player in tied)

        tied = [player for player in tied if len(player.hand) == fewest_hand_cards]

        return tuple(tied)

    def calculate_result(self, state: GameState) -> GameResult:
        if not state.game_over:
            raise RuntimeError("Cannot calculate result before the game has finished")

        scores = tuple(PlayerScore(player=player, score=self.score_player(state,player,),) for player in state.players)

        winners = self._resolve_winners(list(scores))

        return GameResult(scores=scores, winners=winners)

            


@dataclass(frozen=True)
class PlayerScore:
    player: PlayerState
    score: ScoreBreakdown

@dataclass(frozen=True)
class GameResult:
    scores: tuple[PlayerScore, ...]
    winners: tuple[PlayerState, ...]



    
    