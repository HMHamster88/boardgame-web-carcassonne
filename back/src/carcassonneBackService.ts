import {
    GameStatusEnum,
    getShuffledArray,
    type BotGameContext,
    type Game,
    type GameAction,
    type GameBackService,
    type GameContext,
    type GameSettings,
    type GameState,
    type PlayerPublicState
} from 'boardgame-web-common/back';
import packageInfo from '../../package.json' with { type: 'json' };
import { type CarcassonneDeployFollowerAction, type CarcassonnePlaceLandTileAction } from './types/actions';
import {
    type CarcassonneFeatureType,
    type CarcassonneGameSettings,
    type CarcassonnePrivateGameState,
    type CarcassonnePublicGameState,
    type CarcassonneTileTemplate
} from './types/types';
import {
    canPlaceTile,
    createTileDeck,
    followerTypeByFeature,
    getStartingTileTemplate,
    getTileTemplate,
    hasLegalPlacement
} from './tiles';
import {
    buildFeatureGraph,
    featureNodeKey,
    followerNodeKey,
    getWinnerIds,
    scoreCompletedFeatures,
    scoreFinalFeatures
} from './scoring';

const initialFollowersPerPlayer = 7;

export const CarcassonneStaticSettings = {
    minPlayers: 2,
    maxPlayers: 5
};

export class CarcassonneGameBackService implements GameBackService {
    version = packageInfo.version;
    homepage = packageInfo.homepage;

    type = 'CARCASSONNE';

    localizedName: any = {
        en: {
            CARCASSONNE: 'Carcassonne'
        },
        ru: {
            CARCASSONNE: 'Каркассон'
        }
    };

    gameStaticSettings = CarcassonneStaticSettings;

    getDefaultSettings(): GameSettings {
        const settings: CarcassonneGameSettings = {
            id: '',
            mode: 'base'
        };
        return settings;
    }

    startGame(game: Game, gameSettings: GameSettings): GameState {
        const settings = gameSettings as CarcassonneGameSettings;
        const startingTemplate = getStartingTileTemplate();

        const publicState: CarcassonnePublicGameState = {
            mode: settings.mode,
            board: [{
                id: startingTemplate.id,
                templateId: startingTemplate.id,
                x: 0,
                y: 0,
                rotation: 0
            }],
            followers: [],
            activePlayerIndex: 0,
            playersStates: game.players.map(player => ({
                playerId: player.userId,
                points: 0
            })) as PlayerPublicState[],
            winnersIds: [],
            statistics: {
                turnCount: 0
            },
            tilesRemaining: 0
        };

        const privateState: CarcassonnePrivateGameState = {
            deck: getShuffledArray(createTileDeck()),
            playersStates: game.players.map(player => ({
                playerId: player.userId,
                followersInSupply: initialFollowersPerPlayer
            }))
        };

        const firstTile = this.drawPlayableTile(publicState, privateState);
        publicState.currentTile = firstTile;
        publicState.tilesRemaining = privateState.deck.length + (firstTile ? 1 : 0);

        if (!firstTile) {
            scoreFinalFeatures(publicState);
            publicState.winnersIds = getWinnerIds(publicState);
            game.status = GameStatusEnum.FINISHED;
        } else {
            game.status = GameStatusEnum.STARTED;
        }

        return {
            id: game.id,
            publicState: publicState,
            privateState: privateState
        };
    }

    async performAction(gameContext: GameContext, gameAction: GameAction, playerId: string): Promise<any> {
        const game = gameContext.game;
        const gameState = gameContext.gameState;

        if (!gameState) {
            return false;
        }

        const publicState = gameState.publicState as CarcassonnePublicGameState;
        const privateState = gameState.privateState as CarcassonnePrivateGameState;
        const activePlayer = game.players[publicState.activePlayerIndex];
        const isActivePlayerAction = playerId == activePlayer?.userId;

        if (gameAction.type === 'PlaceLandTileAction') {
            if (!isActivePlayerAction || publicState.pendingTileId || !publicState.currentTile) {
                return false;
            }

            const action = gameAction as CarcassonnePlaceLandTileAction;
            if (!action.tileId || publicState.board.some(tile => tile.id === action.tileId)) {
                return false;
            }
            if (!canPlaceTile(publicState.board, publicState.currentTile, action.x, action.y, action.rotation)) {
                return false;
            }

            publicState.board.push({
                id: action.tileId,
                templateId: publicState.currentTile,
                x: action.x,
                y: action.y,
                rotation: action.rotation
            });
            publicState.currentTile = undefined;
            publicState.pendingTileId = action.tileId;
            publicState.tilesRemaining = privateState.deck.length;
            return true;
        }

        if (gameAction.type === 'DeployFollowerAction') {
            if (!isActivePlayerAction || !publicState.pendingTileId) {
                return false;
            }

            const action = gameAction as CarcassonneDeployFollowerAction;
            const tile = publicState.board.find(placedTile => placedTile.id === publicState.pendingTileId);
            if (!tile || action.tileId !== tile.id) {
                return false;
            }

            const template = getTileTemplate(tile.templateId);
            if (!template || !this.isValidSegment(template, action.featureType, action.segmentIndex)) {
                return false;
            }
            if (followerTypeByFeature[action.featureType] !== action.followerType) {
                return false;
            }
            if (this.hasFollowerOnFeature(publicState, tile.id, action.featureType, action.segmentIndex)) {
                return false;
            }

            const playerState = privateState.playersStates.find(state => state.playerId === playerId);
            if (!playerState || playerState.followersInSupply <= 0) {
                return false;
            }

            playerState.followersInSupply--;
            publicState.followers.push({
                playerId,
                type: action.followerType,
                tileId: tile.id,
                featureType: action.featureType,
                segmentIndex: action.segmentIndex
            });

            this.finishTurn(gameContext, gameState, privateState, publicState);
            return true;
        }

        if (gameAction.type === 'EndTurnAction') {
            if (!isActivePlayerAction || !publicState.pendingTileId) {
                return false;
            }
            this.finishTurn(gameContext, gameState, privateState, publicState);
            return true;
        }

        return false;
    }

    private isValidSegment(template: CarcassonneTileTemplate, featureType: CarcassonneFeatureType, segmentIndex: number): boolean {
        if (!Number.isInteger(segmentIndex) || segmentIndex < 0) {
            return false;
        }
        if (featureType === 'cloister') {
            return template.cloister === true && segmentIndex === 0;
        }
        if (featureType === 'city') {
            return segmentIndex < template.cityGroups.length;
        }
        if (featureType === 'road') {
            return segmentIndex < template.roadGroups.length;
        }
        if (featureType === 'field') {
            return segmentIndex < template.fieldSides.length;
        }
        return false;
    }

    private hasFollowerOnFeature(publicState: CarcassonnePublicGameState, tileId: string, featureType: CarcassonneFeatureType, segmentIndex: number): boolean {
        const featureGraph = buildFeatureGraph(publicState.board);
        const featureRoot = featureGraph.nodeToFeature.get(featureNodeKey(tileId, featureType, segmentIndex));
        if (!featureRoot) {
            return false;
        }
        const feature = featureGraph.features.get(featureRoot);
        if (!feature) {
            return false;
        }
        const nodeKeys = new Set(feature.nodes.map(node => node.key));
        return publicState.followers.some(follower => nodeKeys.has(followerNodeKey(follower)));
    }

    private drawPlayableTile(publicState: CarcassonnePublicGameState, privateState: CarcassonnePrivateGameState): string | undefined {
        while (privateState.deck.length > 0) {
            const templateId = privateState.deck.shift()!;
            if (hasLegalPlacement(publicState.board, templateId)) {
                return templateId;
            }
        }
        return undefined;
    }

    private finishTurn(gameContext: GameContext, gameState: GameState, privateState: CarcassonnePrivateGameState, publicState: CarcassonnePublicGameState): void {
        scoreCompletedFeatures(privateState, publicState);
        publicState.pendingTileId = undefined;

        const nextTile = this.drawPlayableTile(publicState, privateState);
        if (!nextTile) {
            scoreFinalFeatures(publicState);
            publicState.winnersIds = getWinnerIds(publicState);
            publicState.currentTile = undefined;
            publicState.tilesRemaining = 0;
            gameContext.game.status = GameStatusEnum.FINISHED;
            return;
        }

        publicState.currentTile = nextTile;
        publicState.tilesRemaining = privateState.deck.length + 1;
        this.nextTurn(gameContext, gameState);
    }

    private nextTurn(gameContext: GameContext, gameState: GameState): void {
        const game = gameContext.game;
        const publicState = gameState.publicState as CarcassonnePublicGameState;
        publicState.activePlayerIndex = (publicState.activePlayerIndex + 1) % game.players.length;
        publicState.statistics.turnCount++;
    }

    async runBotsActions(_botGameContext: BotGameContext): Promise<void> {
    }
}
