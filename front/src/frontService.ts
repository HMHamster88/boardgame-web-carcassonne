import type { GameFrontService, PlayerGameInstanceSettings, PlayerGameSettings } from "boardgame-web-common/front";
import type { Component } from "vue";

import GameView from "./components/GameView.vue";
import PlayerComponent from "./components/PlayerComponent.vue";
import Settings from "./components/Settings.vue";
import StatisticsComponent from "./components/StatisticsComponent.vue";
import { createOrMigrateObject, type ObjectMigration } from "boardgame-web-common";
import type { CarcassonnePlayerGameInstanceSettings, CarcassonnePlayerGameSettings } from "./components/types.ts";
import PlayerGameSettingsComponent from './components/PlayerGameSettingsComponent.vue'

export const carcassonneGameType = "CARCASSONNE"

const playerSettngsMigrations: ObjectMigration<CarcassonnePlayerGameSettings>[] = []
const playerGameInstanceSettingsMigrations: ObjectMigration<CarcassonnePlayerGameInstanceSettings>[] = []

export class CarcassonneFrontService implements GameFrontService {

    playerSettingsComponent: Component | undefined = PlayerGameSettingsComponent
    createOrMigratePlayerGameSettings: ((settings: PlayerGameSettings | undefined) => PlayerGameSettings) | undefined =
        (settings: PlayerGameSettings | undefined) => {
            return createOrMigrateObject(settings as CarcassonnePlayerGameSettings, playerSettngsMigrations, () => {
                const newSettings: CarcassonnePlayerGameSettings = {
                    version: 0,
                    showCoordinates: true,
                    showFeatures: true
                }
                return newSettings
            })
        }
    createOrMigratePlayerGameInstanceSettings: ((settings: PlayerGameInstanceSettings | undefined) => PlayerGameInstanceSettings) | undefined =
        (settings: PlayerGameInstanceSettings | undefined) => {
            return createOrMigrateObject(settings as CarcassonnePlayerGameInstanceSettings, playerGameInstanceSettingsMigrations, () => {
                const newSettings: CarcassonnePlayerGameInstanceSettings = {
                    version: 0
                }
                return newSettings
            })
        }
    canAddBot: boolean = false
    type: string = carcassonneGameType
    settingsComponent: Component = Settings
    gameViewComponent: Component = GameView
    playerComponent: Component = PlayerComponent
    statisticsComponent: Component | undefined = StatisticsComponent
    localization: any = {
        en: {
            CARCASSONNE: 'Carcassonne'
        },
        ru: {
            CARCASSONNE: 'Каркассон'
        }
    }
    gameStaticSettings = {
        minPlayers: 2,
        maxPlayers: 5
    }

}
