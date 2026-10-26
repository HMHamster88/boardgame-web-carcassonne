import { describe, expect, it } from 'vitest';
import { buildFeatureGraph, featureNodeKey, getWinnerIds, scoreCompletedFeatures, scoreFinalFeatures } from './scoring';
import type {
    CarcassonneFeatureType,
    CarcassonneFollower,
    CarcassonneFollowerType,
    CarcassonnePrivateGameState,
    CarcassonnePublicGameState,
    CarcassonneTile
} from './types/types';

function placedTile(id: string, templateId: string, x: number, y: number, rotation = 0): CarcassonneTile {
    return { id, templateId, x, y, rotation };
}

function follower(playerId: string, type: CarcassonneFollowerType, tileId: string, featureType: CarcassonneFeatureType, segmentIndex: number): CarcassonneFollower {
    return { playerId, type, tileId, featureType, segmentIndex };
}

function makePublicState(board: CarcassonneTile[], followers: CarcassonneFollower[] = []): CarcassonnePublicGameState {
    return {
        mode: 'base',
        board,
        followers,
        activePlayerIndex: 0,
        playersStates: [
            { playerId: 'p1', points: 0 },
            { playerId: 'p2', points: 0 }
        ],
        winnersIds: [],
        statistics: { turnCount: 0 },
        tilesRemaining: 0
    };
}

function makePrivateState(): CarcassonnePrivateGameState {
    return {
        deck: [],
        playersStates: [
            { playerId: 'p1', followersInSupply: 7 },
            { playerId: 'p2', followersInSupply: 7 }
        ]
    };
}

function pointsFor(publicState: CarcassonnePublicGameState, playerId: string): number {
    return publicState.playersStates?.find(state => state.playerId === playerId)?.points ?? 0;
}

function supplyFor(privateState: CarcassonnePrivateGameState, playerId: string): number {
    return privateState.playersStates.find(state => state.playerId === playerId)?.followersInSupply ?? 0;
}

describe('scoreCompletedFeatures', () => {
    it('scores a road closed by a cloister and the starting city', () => {
        const board = [
            placedTile('start', 'starting-tile', 0, 0),
            placedTile('cloister-road', 'cloister-road', 0, 1)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'thief', 'cloister-road', 'road', 0)
        ]);
        const privateState = makePrivateState();

        scoreCompletedFeatures(privateState, publicState);

        expect(pointsFor(publicState, 'p1')).toBe(2);
        expect(publicState.followers).toHaveLength(0);
        expect(supplyFor(privateState, 'p1')).toBe(8);
    });

    it('scores a completed city and every pennant in it', () => {
        const board = [
            placedTile('city-a', 'city-cap', 0, 0),
            placedTile('city-b', 'city-cap-road-pennant', 0, -1, 2)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'knight', 'city-b', 'city', 0)
        ]);
        const privateState = makePrivateState();

        scoreCompletedFeatures(privateState, publicState);

        expect(pointsFor(publicState, 'p1')).toBe(6);
        expect(publicState.followers).toHaveLength(0);
        expect(supplyFor(privateState, 'p1')).toBe(8);
    });

    it('awards the full city score to tied players', () => {
        const board = [
            placedTile('city-a', 'city-cap', 0, 0),
            placedTile('city-b', 'city-cap', 0, -1, 2)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'knight', 'city-a', 'city', 0),
            follower('p2', 'knight', 'city-b', 'city', 0)
        ]);
        const privateState = makePrivateState();

        scoreCompletedFeatures(privateState, publicState);

        expect(pointsFor(publicState, 'p1')).toBe(4);
        expect(pointsFor(publicState, 'p2')).toBe(4);
        expect(supplyFor(privateState, 'p1')).toBe(8);
        expect(supplyFor(privateState, 'p2')).toBe(8);
    });

    it('awards all points to the player with the most followers', () => {
        const board = [
            placedTile('city-a', 'city-cap', 0, 0),
            placedTile('city-b', 'city-cap', 0, -1, 2)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'knight', 'city-a', 'city', 0),
            follower('p1', 'knight', 'city-b', 'city', 0),
            follower('p2', 'knight', 'city-b', 'city', 0)
        ]);
        const privateState = makePrivateState();

        scoreCompletedFeatures(privateState, publicState);

        expect(pointsFor(publicState, 'p1')).toBe(4);
        expect(pointsFor(publicState, 'p2')).toBe(0);
        expect(supplyFor(privateState, 'p1')).toBe(9);
        expect(supplyFor(privateState, 'p2')).toBe(8);
    });

    it('scores a completed cloister for nine points and returns the monk', () => {
        const board = [
            placedTile('cloister--1--1', 'cloister', -1, -1),
            placedTile('cloister-0--1', 'cloister', 0, -1),
            placedTile('cloister-1--1', 'cloister', 1, -1),
            placedTile('cloister--1-0', 'cloister', -1, 0),
            placedTile('cloister-0-0', 'cloister', 0, 0),
            placedTile('cloister-1-0', 'cloister', 1, 0),
            placedTile('cloister--1-1', 'cloister', -1, 1),
            placedTile('cloister-0-1', 'cloister', 0, 1),
            placedTile('cloister-1-1', 'cloister', 1, 1)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'monk', 'cloister-0-0', 'cloister', 0)
        ]);
        const privateState = makePrivateState();

        scoreCompletedFeatures(privateState, publicState);

        expect(pointsFor(publicState, 'p1')).toBe(9);
        expect(publicState.followers).toHaveLength(0);
        expect(supplyFor(privateState, 'p1')).toBe(8);
    });
});

describe('scoreFinalFeatures', () => {
    it('scores incomplete roads, cities and cloisters', () => {
        const board = [
            placedTile('road', 'road-straight', 0, 0),
            placedTile('city', 'city-two-opposite', 5, 0),
            placedTile('cloister', 'cloister', 10, 0),
            placedTile('cloister-left', 'cloister', 9, 0),
            placedTile('cloister-right', 'cloister', 11, 0),
            placedTile('cloister-below', 'cloister', 10, 1)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'thief', 'road', 'road', 0),
            follower('p1', 'knight', 'city', 'city', 0),
            follower('p1', 'monk', 'cloister', 'cloister', 0)
        ]);

        scoreFinalFeatures(publicState);

        expect(pointsFor(publicState, 'p1')).toBe(6);
    });

    it('counts every city segment for an incomplete city', () => {
        const board = [
            placedTile('city-a', 'city-two-opposite', 0, 0),
            placedTile('city-b', 'city-cap', 0, -1, 2)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'knight', 'city-a', 'city', 0)
        ]);

        scoreFinalFeatures(publicState);

        expect(pointsFor(publicState, 'p1')).toBe(2);
    });

    it('awards three points for each farm supplying a completed city', () => {
        const board = [
            placedTile('city-a', 'city-cap', 0, 0),
            placedTile('city-b', 'city-cap', 0, -1, 2)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'farmer', 'city-a', 'field', 0),
            follower('p2', 'farmer', 'city-b', 'field', 0)
        ]);

        scoreFinalFeatures(publicState);

        expect(pointsFor(publicState, 'p1')).toBe(3);
        expect(pointsFor(publicState, 'p2')).toBe(3);
    });

    it('awards farm points to the player with the most farmers in a connected field', () => {
        const board = [
            placedTile('city-a', 'city-cap', 0, 0),
            placedTile('city-b', 'city-cap', 0, -1, 2),
            placedTile('field-a', 'cloister', 1, 0),
            placedTile('field-b', 'cloister', 2, 0)
        ];
        const publicState = makePublicState(board, [
            follower('p1', 'farmer', 'city-a', 'field', 0),
            follower('p1', 'farmer', 'field-a', 'field', 0),
            follower('p2', 'farmer', 'field-b', 'field', 0)
        ]);

        scoreFinalFeatures(publicState);

        expect(pointsFor(publicState, 'p1')).toBe(3);
        expect(pointsFor(publicState, 'p2')).toBe(0);
    });
});

describe('field connectivity', () => {
    it('connects fields on the same side of a road across a road edge', () => {
        const board = [
            placedTile('top', 'road-straight', 0, 0),
            placedTile('bottom', 'road-straight', 0, 1)
        ];
        const graph = buildFeatureGraph(board);

        const topEast = graph.nodeToFeature.get(featureNodeKey('top', 'field', 0));
        const topWest = graph.nodeToFeature.get(featureNodeKey('top', 'field', 1));
        const bottomEast = graph.nodeToFeature.get(featureNodeKey('bottom', 'field', 0));
        const bottomWest = graph.nodeToFeature.get(featureNodeKey('bottom', 'field', 1));

        expect(topEast).toBeDefined();
        expect(topWest).toBeDefined();
        expect(bottomEast).toBeDefined();
        expect(bottomWest).toBeDefined();
        expect(topEast).toBe(bottomEast);
        expect(topWest).toBe(bottomWest);
        expect(topEast).not.toBe(topWest);
    });

    it('connects fields correctly when adjacent tiles have different rotations', () => {
        const board = [
            placedTile('bottom', 'road-straight', 0, 0, 0),
            placedTile('top', 'road-straight', 0, -1, 2)
        ];
        const graph = buildFeatureGraph(board);

        const bottomEast = graph.nodeToFeature.get(featureNodeKey('bottom', 'field', 0));
        const bottomWest = graph.nodeToFeature.get(featureNodeKey('bottom', 'field', 1));
        const topEast = graph.nodeToFeature.get(featureNodeKey('top', 'field', 0));
        const topWest = graph.nodeToFeature.get(featureNodeKey('top', 'field', 1));

        expect(bottomEast).toBeDefined();
        expect(bottomWest).toBeDefined();
        expect(topEast).toBeDefined();
        expect(topWest).toBeDefined();
        expect(bottomEast).toBe(topWest);
        expect(bottomWest).toBe(topEast);
        expect(bottomEast).not.toBe(bottomWest);
    });

    it('does not connect fields that only touch at a corner', () => {
        const board = [
            placedTile('first', 'cloister', 0, 0),
            placedTile('second', 'cloister', 1, 1)
        ];
        const graph = buildFeatureGraph(board);

        const firstField = graph.nodeToFeature.get(featureNodeKey('first', 'field', 0));
        const secondField = graph.nodeToFeature.get(featureNodeKey('second', 'field', 0));

        expect(firstField).toBeDefined();
        expect(secondField).toBeDefined();
        expect(firstField).not.toBe(secondField);
    });
});

describe('getWinnerIds', () => {
    it('returns every player tied for the highest score', () => {
        const publicState = makePublicState([]);
        publicState.playersStates = [
            { playerId: 'p1', points: 10 },
            { playerId: 'p2', points: 10 },
            { playerId: 'p3', points: 4 }
        ];

        expect(getWinnerIds(publicState)).toEqual(['p1', 'p2']);
    });
});
