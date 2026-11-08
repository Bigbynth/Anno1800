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

  // STEP 117 — GOODS ALREADY TRADED THIS TURN
  traded_goods_this_turn: string[];

  population: Record<string, number>;
  industries: IndustrySnapshot[];
  new_world_islands: NewWorldIslandSnapshot[];
}


/** An island discovered by the current or another player. */
export interface NewWorldIslandSnapshot {
  id: string;
  name: string;
  resources: string[];
}



export interface GameSnapshot {
  round: number;
  current_player_index: number;
  phase: string;
  game_over: boolean;
  main_action_used: boolean;
  players: GamePlayerSnapshot[];
  objectives: ActiveObjectiveSnapshot[];
  score_preview: ScorePreviewSnapshot[];
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

export interface ShipyardDefinitionSnapshot {
  id: string;
  name: string;
  strength: number;
  build_cost: Record<string, number>;
  remaining: number;
}

export interface ShipDefinitionSnapshot {
  id: string;
  name: string;
  type: string;
  strength: number;
  trade_tokens: number;
  exploration_tokens: number;
  build_cost: Record<string, number>;
  remaining: number;
}

export interface OwnedShipyardSnapshot {
  index: number;
  name: string;
  strength: number;
}

export interface OwnedShipSnapshot {
  name: string;
  type: string;
  strength: number;
}

export interface NavalCatalogueSnapshot {
  shipyards: ShipyardDefinitionSnapshot[];
  ships: ShipDefinitionSnapshot[];
  owned_shipyards: OwnedShipyardSnapshot[];
  owned_ships: OwnedShipSnapshot[];
  naval_capacity: {
    trade: number;
    exploration: number;
  };
  spaces: IslandSpaceSnapshot[];
}


export interface ActiveObjectiveSnapshot {
  id: string;
  name: string;
  objective_type: string;
  rule: {
    type: "industry" | "population" | "resource";
    industries?: string[];
    points_per_industry?: number;
    population_type?: string;
    resource?: string;
    minimum?: number;
    points?: number;
  };
  scores: number[];
}

export interface ScorePreviewSnapshot {
  player_index: number;
  population_cards: number;
  expeditions: number;
  gold: number;
  fireworks: number;
  objectives: number;
  total: number;
}

