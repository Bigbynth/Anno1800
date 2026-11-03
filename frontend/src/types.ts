export type PopulationTier = 'farmer' | 'worker' | 'artisan' | 'engineer' | 'investor' | 'new_world';
export type Goods = Record<string, number>;
export interface CardEffect { type: string; amount?: number; population_type?: string; }
export interface PopulationCard {
  id: string;
  category: PopulationTier;
  requirements: Goods;
  victory_points: number;
  effects: CardEffect[];
  quantity: number;
  verification: string;
}
export interface ExpeditionCard {
  id: string;
  animal: { name: string; population_type: string; victory_points: number };
  artifact: { name: string; population_type: string; victory_points: number };
  verification: string;
}
export interface ObjectiveCard {
  id: string;
  name: string;
  objective_type: string;
  rule: Record<string, unknown>;
  verification: string;
}
export type AnyCard = PopulationCard | ExpeditionCard | ObjectiveCard;
export type DeckName = 'population' | 'new_world' | 'expedition' | 'objectives';
export const pretty = (value: string) => value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
export type Catalogue = Record<DeckName, AnyCard[]>;

export interface IndustrySnapshot {
  index: number;
  name: string;
  good: string;
  worker_type: string;
  occupied: boolean;
  can_produce: boolean;
}

export interface GamePlayerSnapshot {
  name: string;
  gold: number;
  victory_points: number;
  hand: string[];
  population: Record<string, number>;
  industries: IndustrySnapshot[];
}


export interface GameSnapshot {
  round: number;
  current_player_index: number;
  phase: string;
  game_over: boolean;
  main_action_used: boolean;
  players: GamePlayerSnapshot[];
}


export interface IndustryDefinitionSnapshot {
  id: string;
  name: string;
  good: string;
  worker_type: string;
  build_cost: Record<string, number>;
  remaining: number;
  already_owned: boolean;
}

export interface IslandSpaceSnapshot {
  id: string;
  type: string;
  occupied: boolean;
  construction: string | null;
}

export interface IndustryCatalogueSnapshot {
  industries: IndustryDefinitionSnapshot[];
  spaces: IslandSpaceSnapshot[];
}
