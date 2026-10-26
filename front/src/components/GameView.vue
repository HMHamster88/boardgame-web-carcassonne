<template>
    <div class="carcassonne-game">
        <div class="toolbar">
            <span class="status">{{ status }}</span>
            <span class="tiles-remaining">{{ t('tilesRemaining', { count: gameState.tilesRemaining }) }}</span>
            <span v-if="playerPrivateState" class="supply">
                {{ t('followersInSupply', { count: followersInSupply }) }}
            </span>
        </div>

        <div v-if="canPlace && gameState.currentTile" class="current-tile-panel">
            <span class="current-tile-title">{{ t('currentTile') }}</span>
            <svg class="preview" :viewBox="`0 0 ${previewSize} ${previewSize}`"
                xmlns="http://www.w3.org/2000/svg">
                <TileGraphic :template-id="gameState.currentTile" :rotation="rotation" :size="previewSize"
                    :show-features="playerGameSettings.showFeatures" />
            </svg>
            <div class="rotation-controls">
                <o-button size="small" @click="rotateLeft">⟲</o-button>
                <span class="rotation-value">{{ rotation * 90 }}°</span>
                <o-button size="small" @click="rotateRight">⟳</o-button>
            </div>
            <span v-if="placeableCells.size === 0 && placeableCellsAnyRotation.size > 0" class="hint">
                {{ t('rotateToPlaceHint') }}
            </span>
        </div>

        <div v-if="isLocalTurn && gameState.pendingTileId" class="deploy-panel">
            <span class="deploy-title">{{ t('deployOrEnd', { player: activePlayerName }) }}</span>
            <svg v-if="pendingTile && pendingTileTemplate" class="deploy-preview"
                :viewBox="`0 0 ${deployPreviewSize} ${deployPreviewSize}`" xmlns="http://www.w3.org/2000/svg">
                <TileGraphic :template-id="pendingTile.templateId" :rotation="pendingTile.rotation"
                    :size="deployPreviewSize" :show-features="playerGameSettings.showFeatures" />
                <g :transform="`rotate(${pendingTile.rotation * 90} ${deployPreviewSize / 2} ${deployPreviewSize / 2})`">
                    <g v-for="option in deploymentOptions" :key="`marker-${option.key}`" class="deploy-marker"
                        :class="{ disabled: option.disabled }" @click="deployFollower(option)">
                        <title>{{ option.label }}</title>
                        <g
                            :transform="`translate(${option.anchor.x * deployPreviewSize} ${option.anchor.y * deployPreviewSize})`">
                            <g :transform="`rotate(${-pendingTile.rotation * 90})`">
                                <circle cx="0" cy="0" :r="deployMarkerRadius" />
                                <text x="0" y="3" text-anchor="middle">{{ option.index }}</text>
                            </g>
                        </g>
                    </g>
                </g>
            </svg>
            <div class="deploy-options">
                <o-button v-for="option in deploymentOptions" :key="option.key" size="small"
                    :disabled="option.disabled" @click="deployFollower(option)">
                    {{ option.index }}. {{ option.label }}
                </o-button>
            </div>
            <span v-if="deploymentOptions.length > 0 && followersInSupply > 0" class="hint">
                {{ t('deployHint') }}
            </span>
            <span v-if="deploymentOptions.length > 0 && deploymentOptions.every(option => option.occupied)" class="hint">
                {{ t('allFeaturesOccupied') }}
            </span>
            <span v-if="followersInSupply <= 0" class="hint">{{ t('noFollowers') }}</span>
            <o-button @click="endTurn">{{ t('endTurn') }}</o-button>
        </div>

        <svg class="board" :viewBox="viewBox" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
            <g v-for="cell in emptyCells" :key="`empty-${cell.x}-${cell.y}`" :transform="cellTransform(cell)">
                <rect class="empty-cell" :class="emptyCellClass(cell)" :width="tileSize" :height="tileSize"
                    @click="placeTile(cell)" />
            </g>

            <g v-for="tile in gameState.board" :key="tile.id" :transform="cellTransform(tile)">
                <TileGraphic :template-id="tile.templateId" :rotation="tile.rotation" :size="tileSize" :x="tile.x"
                    :y="tile.y" :followers="followersOnTile(tile.id)" :players="game.players"
                    :show-features="playerGameSettings.showFeatures"
                    :show-coordinates="playerGameSettings.showCoordinates" />
                <rect v-if="tile.id === gameState.pendingTileId" class="pending-outline" :width="tileSize"
                    :height="tileSize" rx="4" />
            </g>
        </svg>

        <div class="legend">
            <span v-for="item in legendItems" :key="item.type" class="legend-item">
                <span class="legend-color" :class="`legend-${item.type}`"></span>{{ item.label }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { GameStatusEnum, type Game, type GameAction } from 'boardgame-web-common';
import {
    buildFeatureGraph,
    canPlaceTile,
    featureNodeKey,
    followerNodeKey,
    followerTypeByFeature,
    getEmptyAdjacentCells,
    getFeatureGroupsForTemplate,
    getTileTemplate,
    positionKey,
    type CarcassonneDeployFollowerAction,
    type CarcassonneEndTurnAction,
    type CarcassonneFeatureType,
    type CarcassonneFollowerType,
    type CarcassonneGameSettings,
    type CarcassonnePlaceLandTileAction,
    type CarcassonnePlayerPrivateState,
    type CarcassonnePublicGameState,
    type CarcassonneTileTemplate
} from 'carcassonne-back';
import { OButton } from '@oruga-ui/oruga-next';
import { computed, ref, watch, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import TileGraphic from './TileGraphic.vue';
import { getFeatureAnchor, type TilePoint } from './tileGeometry';
import type { CarcassonnePlayerGameInstanceSettings, CarcassonnePlayerGameSettings } from './types';

const tileSize = 64;
const previewSize = 96;
const deployPreviewSize = 96;
const deployMarkerRadius = deployPreviewSize * 0.1;

const { t } = useI18n({
    locale: 'en',
    messages: {
        en: {
            placeTile: '{player} places a tile',
            deployOrEnd: '{player} deploys a follower or ends the turn',
            deployFollower: 'Deploy follower',
            deployHint: 'Click a numbered feature on the tile to deploy there, or use the buttons below',
            endTurn: 'End turn',
            gameFinished: 'Game finished',
            followersInSupply: 'Followers in supply: {count}',
            tilesRemaining: 'Tiles remaining: {count}',
            currentTile: 'Current tile',
            rotateToPlace: '{player} must rotate the tile to place it',
            rotateToPlaceHint: 'Rotate the tile to place it',
            featureSegment: '{feature} {index}',
            noFollowers: 'All followers are already on the board',
            allFeaturesOccupied: 'Every feature on this tile already has a follower',
            features: {
                city: 'City',
                road: 'Road',
                field: 'Field',
                cloister: 'Cloister'
            },
            followerTypes: {
                knight: 'Knight',
                thief: 'Thief',
                farmer: 'Farmer',
                monk: 'Monk'
            }
        },
        ru: {
            placeTile: '{player} выкладывает плитку',
            deployOrEnd: '{player} выставляет подданного или завершает ход',
            deployFollower: 'Выставить подданного',
            deployHint: 'Нажмите на пронумерованную область плитки, чтобы выставить подданного, или используйте кнопки ниже',
            endTurn: 'Завершить ход',
            gameFinished: 'Игра завершена',
            followersInSupply: 'Подданных в запасе: {count}',
            tilesRemaining: 'Осталось плиток: {count}',
            currentTile: 'Текущая плитка',
            rotateToPlace: '{player} должен повернуть плитку, чтобы выложить её',
            rotateToPlaceHint: 'Поверните плитку, чтобы выложить её',
            featureSegment: '{feature} {index}',
            noFollowers: 'Все подданные уже на поле',
            allFeaturesOccupied: 'На каждой области этой плитки уже есть подданный',
            features: {
                city: 'Город',
                road: 'Дорога',
                field: 'Поле',
                cloister: 'Монастырь'
            },
            followerTypes: {
                knight: 'Рыцарь',
                thief: 'Разбойник',
                farmer: 'Фермер',
                monk: 'Монах'
            }
        }
    }
});

interface DeploymentOption {
    key: string;
    index: number;
    featureType: CarcassonneFeatureType;
    segmentIndex: number;
    followerType: CarcassonneFollowerType;
    label: string;
    anchor: TilePoint;
    occupied: boolean;
    disabled: boolean;
}

const rotation = ref(0);

const isLocalTurn = computed(() => {
    return props.localPlayerIndex !== undefined && props.localPlayerIndex === props.gameState.activePlayerIndex;
});

const activePlayerName = computed(() => {
    return props.game.players[props.gameState.activePlayerIndex]?.name ?? '';
});

const canPlace = computed(() => {
    return isLocalTurn.value && !props.gameState.pendingTileId && Boolean(props.gameState.currentTile);
});

const pendingTile = computed(() => {
    return props.gameState.board.find(tile => tile.id === props.gameState.pendingTileId);
});

const pendingTileTemplate = computed<CarcassonneTileTemplate | undefined>(() => {
    return pendingTile.value ? getTileTemplate(pendingTile.value.templateId) : undefined;
});

const followersInSupply = computed(() => {
    return props.playerPrivateState?.followersInSupply ?? 0;
});

const emptyCells = computed(() => getEmptyAdjacentCells(props.gameState.board));

const placeableCells = computed(() => {
    const templateId = props.gameState.currentTile;
    if (!templateId) {
        return new Set<string>();
    }
    return new Set(
        emptyCells.value
            .filter(cell => canPlaceTile(props.gameState.board, templateId, cell.x, cell.y, rotation.value))
            .map(cell => positionKey(cell.x, cell.y))
    );
});

const placeableCellsAnyRotation = computed(() => {
    const templateId = props.gameState.currentTile;
    if (!templateId) {
        return new Set<string>();
    }
    return new Set(
        emptyCells.value
            .filter(cell => [0, 1, 2, 3].some(candidateRotation =>
                canPlaceTile(props.gameState.board, templateId, cell.x, cell.y, candidateRotation)
            ))
            .map(cell => positionKey(cell.x, cell.y))
    );
});

const featureGraph = computed(() => buildFeatureGraph(props.gameState.board));

const followerNodeKeys = computed(() => new Set(props.gameState.followers.map(followerNodeKey)));

const deploymentOptions = computed<DeploymentOption[]>(() => {
    const tile = pendingTile.value;
    const template = pendingTileTemplate.value;
    if (!tile || !template) {
        return [];
    }

    const featureTypes: CarcassonneFeatureType[] = ['city', 'road', 'field', 'cloister'];
    const options: DeploymentOption[] = [];

    for (const featureType of featureTypes) {
        const groups = getFeatureGroupsForTemplate(template, featureType);
        for (let segmentIndex = 0; segmentIndex < groups.length; segmentIndex++) {
            const group = groups[segmentIndex];
            if (!group || group.length === 0) {
                continue;
            }

            const occupied = isSegmentOccupied(featureType, segmentIndex);
            const followerType = followerTypeByFeature[featureType];
            const featureLabel = featureType === 'cloister' || groups.length === 1
                ? t(`features.${featureType}`)
                : t('featureSegment', { feature: t(`features.${featureType}`), index: segmentIndex + 1 });

            options.push({
                key: `${featureType}-${segmentIndex}`,
                index: options.length + 1,
                featureType,
                segmentIndex,
                followerType,
                label: `${featureLabel} · ${t(`followerTypes.${followerType}`)}`,
                anchor: getFeatureAnchor(template, featureType, segmentIndex),
                occupied,
                disabled: occupied || followersInSupply.value <= 0
            });
        }
    }

    return options;
});

const legendItems = computed(() => {
    const types: CarcassonneFeatureType[] = ['city', 'road', 'field', 'cloister'];
    return types.map(type => ({ type, label: t(`features.${type}`) }));
});

const viewBox = computed(() => {
    if (props.gameState.board.length === 0) {
        return `0 0 ${tileSize * 3} ${tileSize * 3}`;
    }
    const xs = props.gameState.board.map(tile => tile.x);
    const ys = props.gameState.board.map(tile => tile.y);
    const minX = Math.min(...xs) - 1;
    const maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1;
    const maxY = Math.max(...ys) + 1;
    return `${minX * tileSize} ${minY * tileSize} ${(maxX - minX + 1) * tileSize} ${(maxY - minY + 1) * tileSize}`;
});

const status = computed(() => {
    if (props.game.status === GameStatusEnum.FINISHED) {
        return t('gameFinished');
    }
    if (props.gameState.pendingTileId) {
        return t('deployOrEnd', { player: activePlayerName.value });
    }
    if (props.gameState.currentTile && placeableCells.value.size === 0) {
        return t('rotateToPlace', { player: activePlayerName.value });
    }
    return t('placeTile', { player: activePlayerName.value });
});

watch(
    () => [props.gameState.currentTile, props.gameState.pendingTileId],
    () => {
        rotation.value = 0;
    }
);

function isSegmentOccupied(featureType: CarcassonneFeatureType, segmentIndex: number): boolean {
    const tile = pendingTile.value;
    if (!tile) {
        return false;
    }
    const nodeKey = featureNodeKey(tile.id, featureType, segmentIndex);
    const root = featureGraph.value.nodeToFeature.get(nodeKey);
    const feature = root ? featureGraph.value.features.get(root) : undefined;
    return feature?.nodes.some(node => followerNodeKeys.value.has(node.key)) ?? false;
}

function cellTransform(cell: { x: number, y: number }) {
    return `translate(${cell.x * tileSize}, ${cell.y * tileSize})`;
}

function emptyCellClass(cell: { x: number, y: number }) {
    const key = positionKey(cell.x, cell.y);
    return {
        'can-place': canPlace.value && placeableCells.value.has(key),
        'needs-rotation': canPlace.value && !placeableCells.value.has(key) && placeableCellsAnyRotation.value.has(key)
    };
}

function followersOnTile(tileId: string) {
    return props.gameState.followers.filter(follower => follower.tileId === tileId);
}

function rotateLeft() {
    rotation.value = (rotation.value + 3) % 4;
}

function rotateRight() {
    rotation.value = (rotation.value + 1) % 4;
}

function createTileId(x: number, y: number) {
    const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    return `tile-${x}-${y}-${randomPart}`;
}

function placeTile(cell: { x: number, y: number }) {
    if (!canPlace.value || !placeableCells.value.has(positionKey(cell.x, cell.y))) {
        return;
    }
    const action: CarcassonnePlaceLandTileAction = {
        type: 'PlaceLandTileAction',
        tileId: createTileId(cell.x, cell.y),
        x: cell.x,
        y: cell.y,
        rotation: rotation.value
    };
    performAction(action);
}

function deployFollower(option: DeploymentOption) {
    const tile = pendingTile.value;
    if (!tile || option.disabled) {
        return;
    }
    const action: CarcassonneDeployFollowerAction = {
        type: 'DeployFollowerAction',
        tileId: tile.id,
        featureType: option.featureType,
        segmentIndex: option.segmentIndex,
        followerType: option.followerType
    };
    performAction(action);
}

function endTurn() {
    const action: CarcassonneEndTurnAction = {
        type: 'EndTurnAction'
    };
    performAction(action);
}

function performAction<T extends GameAction>(action: T) {
    emit('performAction', action);
}

type PerformActionWithResponse = (action: GameAction) => Promise<any>;

const emit = defineEmits<{
    (e: 'performAction', action: GameAction): void,
}>();

const props = defineProps({
    game: {
        type: Object as PropType<Game>,
        required: true
    },
    gameSettings: {
        type: Object as PropType<CarcassonneGameSettings>,
        required: true
    },
    gameState: {
        type: Object as PropType<CarcassonnePublicGameState>,
        required: true
    },
    playerPrivateState: {
        type: Object as PropType<CarcassonnePlayerPrivateState>,
        required: false
    },
    localPlayerIndex: {
        type: Number,
        required: false
    },
    performActionWithResponse: {
        type: Function as PropType<PerformActionWithResponse>,
        required: true
    },
    playerGameSettings: {
        type: Object as PropType<CarcassonnePlayerGameSettings>,
        required: true
    },
    playerGameInstaceSettings: {
        type: Object as PropType<CarcassonnePlayerGameInstanceSettings>,
        required: true
    },
    debug: {
        type: Boolean,
        required: false
    }
});
</script>

<style scoped>
.carcassonne-game {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
}

.toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
}

.status {
    font-weight: bold;
}

.supply,
.tiles-remaining {
    text-align: center;
}

.current-tile-panel,
.deploy-panel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.5rem;
    background-color: #f3ead7;
    border-radius: 0.5rem;
}

.current-tile-title,
.deploy-title {
    font-weight: bold;
}

.preview,
.deploy-preview {
    width: 96px;
    height: 96px;
}

.deploy-marker {
    cursor: pointer;
}

.deploy-marker circle {
    fill: #2f7d32;
    stroke: #ffffff;
    stroke-width: 2px;
}

.deploy-marker text {
    fill: #ffffff;
    font-size: 10px;
    font-weight: bold;
    pointer-events: none;
    user-select: none;
}

.deploy-marker:not(.disabled):hover circle {
    fill: #1f5a22;
}

.deploy-marker.disabled {
    cursor: not-allowed;
}

.deploy-marker.disabled circle {
    fill: #8a8a8a;
}

.rotation-controls {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.rotation-value {
    min-width: 3rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.deploy-options {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
}

.hint {
    font-size: 0.9rem;
    color: #8a4b00;
}

.board {
    width: 100%;
    max-height: 640px;
    background-color: #d9c9a3;
    border-radius: 0.5rem;
}

.pending-outline {
    fill: none;
    stroke: #ffcc00;
    stroke-width: 4px;
    pointer-events: none;
}

.empty-cell {
    fill: transparent;
    stroke: #00000033;
    stroke-width: 2px;
    stroke-dasharray: 6 4;
}

.empty-cell.can-place {
    cursor: pointer;
    stroke: #2f7d32;
    fill: #ffffff33;
}

.empty-cell.can-place:hover {
    fill: #ffffff66;
}

.empty-cell.needs-rotation {
    stroke: #b26a00;
    fill: #ffe08a33;
}

.legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    font-size: 0.9rem;
}

.legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

.legend-color {
    width: 1rem;
    height: 1rem;
    border: 1px solid #3b2f1e;
    border-radius: 0.2rem;
}

.legend-city {
    background-color: #b98b5e;
}

.legend-road {
    background-color: #d9d9d9;
}

.legend-field {
    background-color: #7fb069;
}

.legend-cloister {
    background-color: #9b7ede;
}
</style>
