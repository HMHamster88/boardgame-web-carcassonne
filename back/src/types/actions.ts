import { type GameAction } from "boardgame-web-common/back";
import type { CarcassonneFeatureType, CarcassonneFollowerType } from "./types";

export interface CarcassonnePlaceLandTileAction extends GameAction {
    type: 'PlaceLandTileAction';
    tileId: string;
    x: number;
    y: number;
    rotation: number;
}

export interface CarcassonneDeployFollowerAction extends GameAction {
    type: 'DeployFollowerAction';
    tileId: string;
    featureType: CarcassonneFeatureType;
    segmentIndex: number;
    followerType: CarcassonneFollowerType;
}

export interface CarcassonneEndTurnAction extends GameAction {
    type: 'EndTurnAction';
}
