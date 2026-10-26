import { type GamePrivateState, type GamePublicState, type GameSettings, type GameStatistics, type PlayerPrivateState, type PlayerPublicState } from "boardgame-web-common/back";

export type CarcassonneGameMode = 'base' | 'river';

export type CarcassonneEdgeType = 'city' | 'road' | 'field';

export type CarcassonneFeatureType = CarcassonneEdgeType | 'cloister';

export type CarcassonneFieldSide = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CarcassonneFollowerType = 'knight' | 'thief' | 'farmer' | 'monk';

export interface CarcassonneGameSettings extends GameSettings {
    mode: CarcassonneGameMode;
}

export interface CarcassonnePlayerPublicState extends PlayerPublicState {
    points: number;
}

export interface CarcassonnePlayerPrivateState extends PlayerPrivateState {
    followersInSupply: number;
}

export interface CarcassonneGameStatistics extends GameStatistics {
}

export interface CarcassonnePublicGameState extends GamePublicState {
    mode: CarcassonneGameMode;
    board: CarcassonneTile[];
    followers: CarcassonneFollower[];
    currentTile?: string;
    pendingTileId?: string;
    tilesRemaining: number;
}

export interface CarcassonnePrivateGameState extends GamePrivateState {
    deck: string[];
    playersStates: CarcassonnePlayerPrivateState[];
}

export interface CarcassonneTileTemplate {
    id: string;
    edges: [CarcassonneEdgeType, CarcassonneEdgeType, CarcassonneEdgeType, CarcassonneEdgeType];
    cityGroups: number[][];
    cityPennants?: number[];
    roadGroups: number[][];
    fieldSides: CarcassonneFieldSide[][];
    cloister?: boolean;
    count: number;
    starting?: boolean;
}

export interface CarcassonneTile {
    id: string;
    templateId: string;
    x: number;
    y: number;
    rotation: number;
}

export interface CarcassonneFollower {
    playerId: string;
    type: CarcassonneFollowerType;
    tileId: string;
    featureType: CarcassonneFeatureType;
    segmentIndex: number;
}
