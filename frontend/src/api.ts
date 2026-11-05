import type { Catalogue, GameSnapshot, IndustryCatalogueSnapshot, NavalCatalogueSnapshot } from './types';



export interface ConstructionPayment {
  source: 'produce' | 'trade';
  good: string;
  industry_index?: number;
  partner_index?: number;
}


export interface PopulationCardPayment {
  source: "produce" | "trade" | "new_world";
  good: string;
  industry_index?: number;
  partner_index?: number;
  island_id?: string;
}



export async function fetchGameData(): Promise<{
    catalogue: Catalogue;
    game: GameSnapshot;
}> {
    const [catalogueResponse, gameResponse] = await Promise.all([
        fetch('/api/catalogue'),
        fetch('/api/game-state/')
    ]);

    if (!catalogueResponse.ok || !gameResponse.ok) {
        throw new Error('Unable to connect to game engine')
    }

    return {
        catalogue: (await catalogueResponse.json()) as Catalogue,
        game: (await gameResponse.json()) as GameSnapshot
    };
}


export interface GameActionResponse {
  message: string;
  game: GameSnapshot;
}

async function postGameAction(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<GameActionResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Action failed (HTTP ${response.status})`;

    try {
      const error = await response.json();
      if (typeof error.detail === 'string') {
        message = error.detail;
      }
    } catch {
      // Keep the HTTP fallback message.
    }

    throw new Error(message);
  }

  return (await response.json()) as GameActionResponse;
}

export async function performFestival(): Promise<GameActionResponse> {
  return postGameAction('/api/actions/festival');
}

export function exploreNewWorld(): Promise<GameActionResponse> {
  return postGameAction('/api/actions/explore-new-world');
}


export function performProduction(
  industryIndex: number
): Promise<GameActionResponse> {
  return postGameAction('/api/actions/produce', {
    industry_index: industryIndex,
  });
}

export function endTurn(): Promise<GameActionResponse> {
  return postGameAction('/api/actions/end-turn');
}


export async function fetchIndustries():
  Promise<IndustryCatalogueSnapshot> {
  const response = await fetch('/api/industries');

  if (!response.ok) {
    throw new Error(
      `Unable to load industries (${response.status})`
    );
  }

  return (await response.json()) as IndustryCatalogueSnapshot;
}



export function buildIndustry(
  industryId: string,
  spaceId: string,
  payments: ConstructionPayment[] = [],
  buildOver: boolean = false
): Promise<GameActionResponse> {
  return postGameAction('/api/actions/build-industry', {
    industry_id: industryId,
    space_id: spaceId,
    payments,
    build_over: buildOver,
  });
}


export function removeConstruction(
  spaceId: string
): Promise<GameActionResponse> {
  return postGameAction('/api/actions/remove-construction', {
    space_id: spaceId,
  });
}


export async function fetchNavalCatalogue():
  Promise<NavalCatalogueSnapshot> {
  const response = await fetch('/api/naval-catalogue');

  if (!response.ok) {
    throw new Error(
      `Unable to load naval catalogue (${response.status})`
    );
  }

  return (await response.json()) as NavalCatalogueSnapshot;
}

export function buildNavalConstruction(
  constructionType: 'shipyard' | 'ship',
  definitionId: string,
  spaceId: string,
  payments: ConstructionPayment[],
  shipyardIndex?: number
): Promise<GameActionResponse> {
  return postGameAction('/api/actions/build-naval', {
    construction_type: constructionType,
    definition_id: definitionId,
    space_id: spaceId,
    payments,
    shipyard_index: shipyardIndex ?? null,
  });
}

export function fulfillPopulationCard(
  cardId: string,
  payments: PopulationCardPayment[]
): Promise<GameActionResponse> {
  return postGameAction(
    "/api/actions/fulfill-population-card",
    {
      card_id: cardId,
      payments,
    }
  );
}
