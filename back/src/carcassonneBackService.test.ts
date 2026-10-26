import { GameStatusEnum, type Game, type GameContext, type GameState } from 'boardgame-web-common/back';
import { describe, expect, it } from 'vitest';
import { CarcassonneGameBackService } from './carcassonneBackService';
import {
    canPlaceTile,
    followerTypeByFeature,
    getEmptyAdjacentCells,
    getFeatureGroupsForTemplate,
    getTileTemplate
} from './tiles';
import type {
    CarcassonneFeatureType,
    CarcassonnePrivateGameState,
    CarcassonnePublicGameState
} from './types/types';
import type {
    CarcassonneDeployFollowerAction,
    CarcassonneEndTurnAction,
    CarcassonnePlaceLandTileAction
} from './types/actions';

function createGame(): Game {
    return {
        id: 'game-1',
        owner: 'p1',
        name: 'Test game',
        type: 'CARCASSONNE',
        players: [
            { userId: 'p1', name: 'Player 1', color: '#ff0000', online: true, isBot: false },
            { userId: 'p2', name: 'Player 2', color: '#0000ff', online: true, isBot: false }
        ],
        status: GameStatusEnum.CREATED,
        created: new Date()
    };
}

function createContext(game: Game, gameState: GameState): GameContext {
    return { game, gameState } as unknown as GameContext;
}

function findPlacement(publicState: CarcassonnePublicGameState, templateId: string) {
    for (const cell of getEmptyAdjacentCells(publicState.board)) {
        for (let rotation = 0; rotation < 4; rotation++) {
            if (canPlaceTile(publicState.board, templateId, cell.x, cell.y, rotation)) {
                return { x: cell.x, y: cell.y, rotation };
            }
        }
    }
    throw new Error(`No legal placement for ${templateId}`);
}

let nextTileId = 0;

async function placeCurrentTile(service: CarcassonneGameBackService, context: GameContext, playerId: string) {
    const publicState = context.gameState!.publicState as CarcassonnePublicGameState;
    if (!publicState.currentTile) {
        throw new Error('No current tile');
    }
    const placement = findPlacement(publicState, publicState.currentTile);
    const action: CarcassonnePlaceLandTileAction = {
        type: 'PlaceLandTileAction',
        tileId: `tile-${nextTileId++}`,
        ...placement
    };
    return service.performAction(context, action, playerId);
}

describe('CarcassonneGameBackService', () => {
    it('starts a game with a starting tile, a shuffled deck and the first tile in hand', () => {
        const service = new CarcassonneGameBackService();
        const game = createGame();
        const gameState = service.startGame(game, service.getDefaultSettings());
        const publicState = gameState.publicState as CarcassonnePublicGameState;
        const privateState = gameState.privateState as CarcassonnePrivateGameState;

        expect(game.status).toBe(GameStatusEnum.STARTED);
        expect(publicState.board).toHaveLength(1);
        expect(publicState.board[0]?.templateId).toBe('starting-tile');
        expect(publicState.currentTile).toBeDefined();
        expect(publicState.tilesRemaining).toBe(71);
        expect(publicState.followers).toEqual([]);
        expect(privateState.deck).toHaveLength(70);
        expect(privateState.playersStates.map(state => state.followersInSupply)).toEqual([7, 7]);
    });

    it('rejects placements from a player who is not active', async () => {
        const service = new CarcassonneGameBackService();
        const game = createGame();
        const gameState = service.startGame(game, service.getDefaultSettings());
        const context = createContext(game, gameState);
        const publicState = gameState.publicState as CarcassonnePublicGameState;
        const placement = findPlacement(publicState, publicState.currentTile!);

        const result = await service.performAction(context, {
            type: 'PlaceLandTileAction',
            tileId: 'wrong-player',
            ...placement
        } as CarcassonnePlaceLandTileAction, 'p2');

        expect(result).toBe(false);
        expect(publicState.board).toHaveLength(1);
    });

    it('places the current tile and exposes a pending tile for follower deployment', async () => {
        const service = new CarcassonneGameBackService();
        const game = createGame();
        const gameState = service.startGame(game, service.getDefaultSettings());
        const context = createContext(game, gameState);
        const publicState = gameState.publicState as CarcassonnePublicGameState;

        const result = await placeCurrentTile(service, context, 'p1');

        expect(result).toBe(true);
        expect(publicState.board).toHaveLength(2);
        expect(publicState.currentTile).toBeUndefined();
        expect(publicState.pendingTileId).toBeDefined();
        expect(publicState.tilesRemaining).toBe(70);
    });

    it('deploys a follower, advances the turn and keeps the follower total at seven', async () => {
        const service = new CarcassonneGameBackService();
        const game = createGame();
        const gameState = service.startGame(game, service.getDefaultSettings());
        const context = createContext(game, gameState);
        const publicState = gameState.publicState as CarcassonnePublicGameState;
        const privateState = gameState.privateState as CarcassonnePrivateGameState;

        await placeCurrentTile(service, context, 'p1');

        const pendingTile = publicState.board.find(tile => tile.id === publicState.pendingTileId)!;
        const template = getTileTemplate(pendingTile.templateId)!;
        const featureTypes: CarcassonneFeatureType[] = ['field', 'city', 'road'];
        let featureType: CarcassonneFeatureType | undefined;
        let segmentIndex = 0;

        for (const candidate of featureTypes) {
            if (getFeatureGroupsForTemplate(template, candidate).length > 0) {
                featureType = candidate;
                break;
            }
        }
        if (!featureType) {
            featureType = 'cloister';
            segmentIndex = 0;
        }

        const action: CarcassonneDeployFollowerAction = {
            type: 'DeployFollowerAction',
            tileId: pendingTile.id,
            featureType,
            segmentIndex,
            followerType: followerTypeByFeature[featureType]
        };

        const result = await service.performAction(context, action, 'p1');

        expect(result).toBe(true);
        expect(publicState.pendingTileId).toBeUndefined();
        expect(publicState.currentTile).toBeDefined();
        expect(publicState.activePlayerIndex).toBe(1);
        expect(publicState.statistics.turnCount).toBe(1);

        const playerState = privateState.playersStates.find(state => state.playerId === 'p1')!;
        expect(playerState.followersInSupply + publicState.followers.length).toBe(7);
    });

    it('ends a turn without deploying a follower', async () => {
        const service = new CarcassonneGameBackService();
        const game = createGame();
        const gameState = service.startGame(game, service.getDefaultSettings());
        const context = createContext(game, gameState);
        const publicState = gameState.publicState as CarcassonnePublicGameState;

        await placeCurrentTile(service, context, 'p1');
        await service.performAction(context, { type: 'EndTurnAction' } as CarcassonneEndTurnAction, 'p1');

        expect(publicState.pendingTileId).toBeUndefined();
        expect(publicState.currentTile).toBeDefined();
        expect(publicState.activePlayerIndex).toBe(1);
        expect(publicState.statistics.turnCount).toBe(1);

        await placeCurrentTile(service, context, 'p2');
        await service.performAction(context, { type: 'EndTurnAction' } as CarcassonneEndTurnAction, 'p2');

        expect(publicState.activePlayerIndex).toBe(0);
        expect(publicState.statistics.turnCount).toBe(2);
    });

    it('plays through the deck and finishes the game', async () => {
        const service = new CarcassonneGameBackService();
        const game = createGame();
        const gameState = service.startGame(game, service.getDefaultSettings());
        const context = createContext(game, gameState);
        const publicState = gameState.publicState as CarcassonnePublicGameState;

        let guard = 0;
        while (game.status !== GameStatusEnum.FINISHED && guard < 200) {
            const playerId = game.players[publicState.activePlayerIndex]!.userId;
            if (publicState.pendingTileId) {
                await service.performAction(context, { type: 'EndTurnAction' } as CarcassonneEndTurnAction, playerId);
            } else {
                await placeCurrentTile(service, context, playerId);
            }
            guard++;
        }

        expect(game.status).toBe(GameStatusEnum.FINISHED);
        expect(publicState.pendingTileId).toBeUndefined();
        expect(publicState.currentTile).toBeUndefined();
        expect(publicState.tilesRemaining).toBe(0);
        expect(publicState.winnersIds.length).toBeGreaterThan(0);
        expect(guard).toBeLessThan(200);
    });
});
