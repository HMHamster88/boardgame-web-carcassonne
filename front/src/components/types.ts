import type { PlayerGameInstanceSettings, PlayerGameSettings } from "boardgame-web-common/front";

export interface CarcassonnePlayerGameSettings extends PlayerGameSettings {
    showCoordinates: boolean
    showFeatures: boolean
}

export interface CarcassonnePlayerGameInstanceSettings extends PlayerGameInstanceSettings {
}
