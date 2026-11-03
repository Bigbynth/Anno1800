import population from './population.json';
import newWorld from './new_world.json';
import expedition from './expedition.json';
import objectives from './objectives.json';
import type { DeckName, PopulationCard, ExpeditionCard, ObjectiveCard } from '../types';

export const catalogue: {
  population: PopulationCard[];
  new_world: PopulationCard[];
  expedition: ExpeditionCard[];
  objectives: ObjectiveCard[];
} = {
  population: population as PopulationCard[],
  new_world: newWorld as PopulationCard[],
  expedition: expedition as ExpeditionCard[],
  objectives: objectives as ObjectiveCard[],
};
export const deckLabels: Record<DeckName, string> = {
  population: 'Old World', new_world: 'New World', expedition: 'Expeditions', objectives: 'Objectives'
};
