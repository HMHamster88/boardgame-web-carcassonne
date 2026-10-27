<template>
    <div ref="gameRoot" class="carcassonne-game" :class="{ 'is-sized': gameHeight !== null }"
        :style="gameHeightStyle">
        <div class="toolbar">
            <span class="status">{{ status }}</span>
            <span class="tiles-remaining">{{ t('tilesRemaining', { count: gameState.tilesRemaining }) }}</span>
            <span v-if="playerPrivateState" class="supply">
                {{ t('followersInSupply', { count: followersInSupply }) }}
            </span>
        </div>

        <div v-if="canPlace && gameState.currentTile" class="current-tile-panel">
            <span class="current-tile-title">{{ t('currentTile') }}</span>
            <div class="tile-rotation-row">
                <o-button size="small" @click="rotateLeft">⟲</o-button>
                <div class="tile-rotation-preview">
                    <svg class="preview" :viewBox="`0 0 ${previewSize} ${previewSize}`"
                        xmlns="http://www.w3.org/2000/svg">
                        <TileGraphic :template-id="gameState.currentTile" :rotation="rotation" :size="previewSize"
                            :show-features="playerGameSettings.showFeatures" />
                    </svg>
                </div>
                <o-button size="small" @click="rotateRight">⟳</o-button>
            </div>
            <o-button v-if="selectedCell" size="small" :disabled="!selectedCellIsPlaceable"
                @click="confirmPlacement">
                {{ t('confirmPlacement') }}
            </o-button>
            <span v-if="selectedCell" class="hint">
                {{ selectedCellIsPlaceable ? t('confirmPlacementHint') : t('previewDoesNotFit') }}
            </span>
            <span v-if="placeableCells.size === 0 && placeableCellsAnyRotation.size > 0" class="hint">
                {{ t('rotateToPlaceHint') }}
            </span>
        </div>

        <div v-if="isLocalTurn && gameState.pendingTileId" class="deploy-panel">
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
                            </g>
                        </g>
                    </g>
                </g>
            </svg>
            <span v-if="deploymentOptions.length > 0 && followersInSupply > 0" class="hint">
                {{ t('deployHint') }}
            </span>
            <span v-if="deploymentOptions.length > 0 && deploymentOptions.every(option => option.occupied)" class="hint">
                {{ t('allFeaturesOccupied') }}
            </span>
            <span v-if="followersInSupply <= 0" class="hint">{{ t('noFollowers') }}</span>
            <o-button @click="endTurn">{{ t('endTurn') }}</o-button>
        </div>

        <BoardViewport v-slot="{ box }" :view-box="boardViewBox" :reset-label="t('resetView')">
            <svg class="board" :viewBox="box" preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg">
            <g v-for="cell in emptyCells" :key="`empty-${cell.x}-${cell.y}`" :transform="cellTransform(cell)">
                <rect class="empty-cell" :class="emptyCellClass(cell)" :width="tileSize" :height="tileSize"
                    @click="handleCellClick(cell)" />
                <text v-if="needsRotation(cell)" :x="tileSize / 2" :y="tileSize / 2" class="rotate-icon"
                    text-anchor="middle" dominant-baseline="central" aria-hidden="true">⟳</text>
            </g>

            <g v-for="tile in gameState.board" :key="tile.id" :transform="cellTransform(tile)">
                <TileGraphic :template-id="tile.templateId" :rotation="tile.rotation" :size="tileSize" :x="tile.x"
                    :y="tile.y" :followers="followersOnTile(tile.id)" :players="game.players"
                    :show-features="playerGameSettings.showFeatures"
                    :show-coordinates="playerGameSettings.showCoordinates" />
                <rect v-if="tile.id === gameState.pendingTileId" class="pending-outline" :width="tileSize"
                    :height="tileSize" rx="4" />
            </g>

            <g v-if="selectedCell && canPlace && gameState.currentTile" :transform="cellTransform(selectedCell)"
                class="tile-preview">
                <g class="tile-preview-graphic" :class="{ invalid: !selectedCellIsPlaceable }">
                    <TileGraphic :template-id="gameState.currentTile" :rotation="rotation" :size="tileSize"
                        :x="selectedCell.x" :y="selectedCell.y"
                        :show-features="playerGameSettings.showFeatures"
                        :show-coordinates="playerGameSettings.showCoordinates" />
                </g>
                <rect class="tile-preview-outline" :class="{ invalid: !selectedCellIsPlaceable }"
                    :width="tileSize" :height="tileSize" rx="4" />
            </g>

            <g v-if="isLocalTurn && pendingTile && pendingTileTemplate" :transform="cellTransform(pendingTile)">
                <g :transform="`rotate(${pendingTile.rotation * 90} ${tileSize / 2} ${tileSize / 2})`">
                    <g v-for="option in deploymentOptions" :key="`board-marker-${option.key}`"
                        class="deploy-marker board-deploy-marker" :class="{ disabled: option.disabled }"
                        @click="deployFollower(option)">
                        <title>{{ option.label }}</title>
                        <g :transform="`translate(${option.anchor.x * tileSize} ${option.anchor.y * tileSize})`">
                            <g :transform="`rotate(${-pendingTile.rotation * 90})`">
                                <circle cx="0" cy="0" :r="boardDeployMarkerRadius" />
                            </g>
                        </g>
                    </g>
                </g>
            </g>
            </svg>
        </BoardViewport>
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
    type CarcassonneFollower,
    type CarcassonneFollowerType,
    type CarcassonneGameSettings,
    type CarcassonnePlaceLandTileAction,
    type CarcassonnePlayerPrivateState,
    type CarcassonnePublicGameState,
    type CarcassonneTile,
    type CarcassonneTileTemplate
} from 'carcassonne-back';
import { OButton } from '@oruga-ui/oruga-next';
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import BoardViewport from './BoardViewport.vue';
import TileGraphic from './TileGraphic.vue';
import { getFeatureAnchor, type TilePoint } from './tileGeometry';
import type { CarcassonnePlayerGameInstanceSettings, CarcassonnePlayerGameSettings } from './types';

const tileSize = 64;
const previewSize = 96;
const deployPreviewSize = 96;
const deployMarkerRadius = deployPreviewSize * 0.1;
const boardDeployMarkerRadius = tileSize * 0.1;

const { t } = useI18n({
    locale: 'en',
    messages: {
        en: {
            placeTile: '{player} places a tile',
            deployOrEnd: '{player} deploys a follower or ends the turn',
            deployFollower: 'Deploy follower',
            deployHint: 'Click a circle on the tile to deploy a follower there',
            endTurn: 'End turn',
            gameFinished: 'Game finished',
            followersInSupply: 'Followers in supply: {count}',
            tilesRemaining: 'Tiles remaining: {count}',
            currentTile: 'Current tile',
            rotateToPlace: '{player} must rotate the tile to place it',
            rotateToPlaceHint: 'Click a highlighted cell to rotate the tile to a fitting angle',
            confirmPlacement: 'Confirm placement',
            confirmPlacementHint: 'Click the tile again or press Confirm to place it',
            previewDoesNotFit: 'This rotation does not fit the selected cell',
            resetView: 'Reset view',
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
            deployHint: 'Нажмите на кружок на плитке, чтобы выставить подданного',
            endTurn: 'Завершить ход',
            gameFinished: 'Игра завершена',
            followersInSupply: 'Подданных в запасе: {count}',
            tilesRemaining: 'Осталось плиток: {count}',
            currentTile: 'Текущая плитка',
            rotateToPlace: '{player} должен повернуть плитку, чтобы выложить её',
            rotateToPlaceHint: 'Нажмите на подсвеченную клетку, чтобы повернуть плитку подходящим образом',
            confirmPlacement: 'Подтвердить размещение',
            confirmPlacementHint: 'Нажмите на плитку ещё раз или нажмите «Подтвердить размещение»',
            previewDoesNotFit: 'Этот поворот не подходит для выбранной клетки',
            resetView: 'Сбросить вид',
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

interface DeploymentOption {
    key: string;
    featureType: CarcassonneFeatureType;
    segmentIndex: number;
    followerType: CarcassonneFollowerType;
    label: string;
    anchor: TilePoint;
    occupied: boolean;
    disabled: boolean;
}

const rotation = ref(0);
const selectedCell = ref<{ x: number, y: number } | null>(null);

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

const selectedCellIsPlaceable = computed(() => {
    const cell = selectedCell.value;
    const templateId = props.gameState.currentTile;
    if (!cell || !templateId) {
        return false;
    }
    return canPlaceTile(props.gameState.board, templateId, cell.x, cell.y, rotation.value);
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

const boardViewBox = computed(() => {
    if (props.gameState.board.length === 0) {
        return { x: 0, y: 0, width: tileSize * 3, height: tileSize * 3 };
    }
    const xs = props.gameState.board.map(tile => tile.x);
    const ys = props.gameState.board.map(tile => tile.y);
    const minX = Math.min(...xs) - 1;
    const maxX = Math.max(...xs) + 1;
    const minY = Math.min(...ys) - 1;
    const maxY = Math.max(...ys) + 1;
    return {
        x: minX * tileSize,
        y: minY * tileSize,
        width: (maxX - minX + 1) * tileSize,
        height: (maxY - minY + 1) * tileSize
    };
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

const minGameHeight = 160;

const gameRoot = ref<HTMLDivElement | null>(null);
const gameHeight = ref<number | null>(null);
let gameResizeObserver: ResizeObserver | null = null;

const gameHeightStyle = computed(() => {
    if (gameHeight.value === null) {
        return undefined;
    }
    return { height: `${gameHeight.value}px` };
});

function findScrollContainer(element: HTMLElement): HTMLElement | null {
    let node = element.parentElement;
    while (node) {
        const overflowY = getComputedStyle(node).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

function getBottomPadding(element: HTMLElement | null): number {
    if (!element) {
        return 0;
    }
    return parseFloat(getComputedStyle(element).paddingBottom) || 0;
}

function updateGameHeight() {
    const root = gameRoot.value;
    if (!root) {
        return;
    }
    const parent = root.parentElement;
    const rootRect = root.getBoundingClientRect();
    const scrollContainer = findScrollContainer(root);
    let available: number;
    if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const topOffset = rootRect.top - containerRect.top + scrollContainer.scrollTop;
        const bottomInset = getBottomPadding(parent)
            + (parent === scrollContainer ? 0 : getBottomPadding(scrollContainer));
        available = scrollContainer.clientHeight - topOffset - bottomInset;
    } else {
        available = window.innerHeight - rootRect.top - getBottomPadding(parent);
    }
    const nextHeight = Math.max(minGameHeight, Math.floor(available));
    if (gameHeight.value === null || Math.abs(gameHeight.value - nextHeight) > 1) {
        gameHeight.value = nextHeight;
    }
}

function handleGameResize() {
    updateGameHeight();
}

onMounted(async () => {
    await nextTick();
    updateGameHeight();
    window.addEventListener('resize', handleGameResize);
    if (typeof ResizeObserver !== 'undefined') {
        const scrollContainer = gameRoot.value ? findScrollContainer(gameRoot.value) : null;
        gameResizeObserver = new ResizeObserver(handleGameResize);
        if (scrollContainer) {
            gameResizeObserver.observe(scrollContainer);
        }
        gameResizeObserver.observe(document.body);
    }
});

onUpdated(() => {
    updateGameHeight();
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleGameResize);
    gameResizeObserver?.disconnect();
    gameResizeObserver = null;
});

watch(
    () => [props.gameState.currentTile, props.gameState.pendingTileId],
    () => {
        rotation.value = 0;
        selectedCell.value = null;
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

function hasAvailableDeployment(
    tile: CarcassonneTile,
    template: CarcassonneTileTemplate,
    board: CarcassonneTile[],
    followers: CarcassonneFollower[]
): boolean {
    const graph = buildFeatureGraph(board);
    const occupiedNodeKeys = new Set(followers.map(followerNodeKey));
    const featureTypes: CarcassonneFeatureType[] = ['city', 'road', 'field', 'cloister'];

    return featureTypes.some(featureType =>
        getFeatureGroupsForTemplate(template, featureType).some((group, segmentIndex) => {
            if (!group || group.length === 0) {
                return false;
            }
            const nodeKey = featureNodeKey(tile.id, featureType, segmentIndex);
            const root = graph.nodeToFeature.get(nodeKey);
            const feature = root ? graph.features.get(root) : undefined;
            return !(feature?.nodes.some(node => occupiedNodeKeys.has(node.key)) ?? false);
        })
    );
}

function cellTransform(cell: { x: number, y: number }) {
    return `translate(${cell.x * tileSize}, ${cell.y * tileSize})`;
}

function emptyCellClass(cell: { x: number, y: number }) {
    const key = positionKey(cell.x, cell.y);
    return {
        'can-place': canPlace.value && placeableCells.value.has(key),
        'needs-rotation': needsRotation(cell)
    };
}

function needsRotation(cell: { x: number, y: number }) {
    const key = positionKey(cell.x, cell.y);
    return canPlace.value && !placeableCells.value.has(key) && placeableCellsAnyRotation.value.has(key);
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

function handleCellClick(cell: { x: number, y: number }) {
    if (!canPlace.value) {
        return;
    }

    const templateId = props.gameState.currentTile;
    if (!templateId) {
        return;
    }

    const selected = selectedCell.value;
    const isSelected = selected?.x === cell.x && selected?.y === cell.y;

    if (!placeableCells.value.has(positionKey(cell.x, cell.y))) {
        const targetRotation = [0, 1, 2, 3].find(candidateRotation =>
            canPlaceTile(props.gameState.board, templateId, cell.x, cell.y, candidateRotation)
        );
        if (targetRotation !== undefined) {
            rotation.value = targetRotation;
            selectedCell.value = { x: cell.x, y: cell.y };
        }
        return;
    }

    if (isSelected) {
        confirmPlacement();
        return;
    }

    selectedCell.value = { x: cell.x, y: cell.y };
}

function confirmPlacement() {
    const cell = selectedCell.value;
    const templateId = props.gameState.currentTile;
    if (!canPlace.value || !cell || !selectedCellIsPlaceable.value || !templateId) {
        return;
    }

    const tileId = createTileId(cell.x, cell.y);
    const placedTile: CarcassonneTile = {
        id: tileId,
        templateId,
        x: cell.x,
        y: cell.y,
        rotation: rotation.value
    };
    const template = getTileTemplate(templateId);
    const canDeploy = template
        ? hasAvailableDeployment(
            placedTile,
            template,
            [...props.gameState.board, placedTile],
            props.gameState.followers
        )
        : false;

    selectedCell.value = null;
    const action: CarcassonnePlaceLandTileAction = {
        type: 'PlaceLandTileAction',
        tileId,
        x: cell.x,
        y: cell.y,
        rotation: rotation.value
    };
    performAction(action);
    if (followersInSupply.value <= 0 || (template && !canDeploy)) {
        endTurn();
    }
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


</script>

<style scoped>
.carcassonne-game {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    min-height: 0;
    overflow: hidden;
}

.toolbar {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    flex: 0 0 auto;
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
    flex: 0 0 auto;
}

.current-tile-panel,
.deploy-panel {
    flex-direction: column;
}

.current-tile-title,
.deploy-title {
    font-weight: bold;
}

.tile-rotation-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
}

.tile-rotation-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
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

.deploy-marker:not(.disabled):hover circle {
    fill: #1f5a22;
}

.deploy-marker.disabled {
    cursor: not-allowed;
}

.deploy-marker.disabled circle {
    fill: #8a8a8a;
}

.hint {
    font-size: 0.9rem;
    color: #8a4b00;
}

.carcassonne-game.is-sized :deep(.board-stage) {
    flex: 1 1 0;
    min-height: 8rem;
}

.carcassonne-game.is-sized :deep(.board-viewport) {
    height: 100%;
}

.board {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 640px;
    user-select: none;
}

.carcassonne-game.is-sized .board {
    max-height: none;
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
    cursor: pointer;
    stroke: #b26a00;
    fill: #ffe08a33;
}

.empty-cell.needs-rotation:hover {
    fill: #ffe08a66;
}

.rotate-icon {
    fill: #b26a00;
    stroke: #fffdf0;
    stroke-width: 2px;
    paint-order: stroke;
    font-size: 22px;
    font-weight: 700;
    pointer-events: none;
    user-select: none;
}

.tile-preview {
    pointer-events: none;
}

.tile-preview-graphic {
    opacity: 0.55;
}

.tile-preview-graphic.invalid {
    opacity: 0.3;
}

.tile-preview-outline {
    fill: none;
    stroke: #2f7d32;
    stroke-width: 4px;
    stroke-dasharray: 8 4;
}

.tile-preview-outline.invalid {
    stroke: #b23a2a;
}
</style>
