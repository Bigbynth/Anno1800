import type { Catalogue, GameSnapshot } from './types';

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