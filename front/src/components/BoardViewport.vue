<template>
    <div class="board-stage">
        <div ref="boardViewport" class="board-viewport" :class="{ panning: isPanning }"
            @wheel.prevent="handleBoardWheel" @pointerdown="handleBoardPointerDown"
            @click.capture="handleBoardClickCapture">
            <slot :box="zoomedViewBox" />
        </div>
        <o-button size="small" class="board-reset-button" :disabled="isBoardViewReset"
            :title="resetLabel" :aria-label="resetLabel" @click="resetView">
            <svg class="reset-view-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 4H4v5" />
                <path d="M15 4h5v5" />
                <path d="M9 20H4v-5" />
                <path d="M15 20h5v-5" />
            </svg>
        </o-button>
    </div>
</template>

<script setup lang="ts">
import { OButton } from '@oruga-ui/oruga-next';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';

interface BoardViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

const props = defineProps({
    viewBox: {
        type: Object as PropType<BoardViewBox>,
        required: true
    },
    resetLabel: {
        type: String,
        required: true
    }
});

defineSlots<{
    default(props: { box: string }): unknown;
}>();

const boardViewport = ref<HTMLDivElement | null>(null);
const boardZoom = ref(1);
const boardPan = ref({ x: 0, y: 0 });
const boardScale = ref(1);
const isPanning = ref(false);
const minBoardZoom = 1;
const maxBoardZoom = 4;
const boardPanThreshold = 8;

const isBoardViewReset = computed(() => {
    return boardZoom.value === 1 && boardPan.value.x === 0 && boardPan.value.y === 0;
});

const activePointers = new Map<number, { x: number, y: number }>();
let lastPanPoint: { x: number, y: number } | null = null;
let pinchLastDistance = 0;
let pinchLastMidpoint: { x: number, y: number } | null = null;
let gestureDistance = 0;
let pendingPanX = 0;
let pendingPanY = 0;
let suppressClick = false;

const zoomedViewBox = computed(() => {
    const box = props.viewBox;
    const zoom = boardZoom.value;
    const scale = (boardScale.value || 1) * zoom;
    const width = box.width / zoom;
    const height = box.height / zoom;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const panX = boardPan.value.x / scale;
    const panY = boardPan.value.y / scale;
    return `${centerX - width / 2 - panX} ${centerY - height / 2 - panY} ${width} ${height}`;
});

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function getBoardScale() {
    const viewport = boardViewport.value;
    const box = props.viewBox;
    if (!viewport || box.width <= 0 || box.height <= 0) {
        return undefined;
    }
    const scale = Math.min(viewport.clientWidth / box.width, viewport.clientHeight / box.height);
    return scale > 0 ? scale : undefined;
}

function updateBoardScale() {
    const scale = getBoardScale();
    if (scale !== undefined) {
        boardScale.value = scale;
    }
}

function getBoardContentSize() {
    const scale = getBoardScale();
    if (scale === undefined) {
        return undefined;
    }
    const box = props.viewBox;
    return {
        width: box.width * scale,
        height: box.height * scale
    };
}

function clampBoardPan() {
    const viewport = boardViewport.value;
    const content = getBoardContentSize();
    if (!viewport || !content) {
        return;
    }
    const maxX = Math.max(0, (content.width * boardZoom.value - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (content.height * boardZoom.value - viewport.clientHeight) / 2);
    const nextX = clamp(boardPan.value.x, -maxX, maxX);
    const nextY = clamp(boardPan.value.y, -maxY, maxY);
    if (nextX !== boardPan.value.x || nextY !== boardPan.value.y) {
        boardPan.value = { x: nextX, y: nextY };
    }
}

function panBoardBy(dx: number, dy: number) {
    if (boardZoom.value <= minBoardZoom) {
        return;
    }
    boardPan.value = {
        x: boardPan.value.x + dx,
        y: boardPan.value.y + dy
    };
    clampBoardPan();
}

function zoomBoardAt(nextZoom: number, clientX: number, clientY: number) {
    const viewport = boardViewport.value;
    if (!viewport) {
        return;
    }
    const clampedZoom = clamp(nextZoom, minBoardZoom, maxBoardZoom);
    if (clampedZoom === boardZoom.value) {
        return;
    }
    const rect = viewport.getBoundingClientRect();
    const pointX = clientX - (rect.left + rect.width / 2);
    const pointY = clientY - (rect.top + rect.height / 2);
    const ratio = clampedZoom / boardZoom.value;
    boardPan.value = {
        x: pointX - (pointX - boardPan.value.x) * ratio,
        y: pointY - (pointY - boardPan.value.y) * ratio
    };
    boardZoom.value = clampedZoom;
    clampBoardPan();
}

function handleBoardWheel(event: WheelEvent) {
    const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    const factor = Math.exp(-event.deltaY * deltaUnit * 0.0015);
    zoomBoardAt(boardZoom.value * factor, event.clientX, event.clientY);
}

function pointerDistance(first: { x: number, y: number }, second: { x: number, y: number }) {
    return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerMidpoint(first: { x: number, y: number }, second: { x: number, y: number }) {
    return {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2
    };
}

function handleBoardClickCapture(event: MouseEvent) {
    if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
    }
}

function startPointerTracking() {
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
}

function stopPointerTracking() {
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);
}

function handleBoardPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
    }
    if (activePointers.size === 0) {
        gestureDistance = 0;
        pendingPanX = 0;
        pendingPanY = 0;
        suppressClick = false;
        startPointerTracking();
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    isPanning.value = true;

    if (activePointers.size === 1) {
        lastPanPoint = { x: event.clientX, y: event.clientY };
        return;
    }

    const points = [...activePointers.values()];
    const first = points[0];
    const second = points[1];
    if (first && second) {
        pinchLastDistance = pointerDistance(first, second);
        pinchLastMidpoint = pointerMidpoint(first, second);
        lastPanPoint = null;
        pendingPanX = 0;
        pendingPanY = 0;
        suppressClick = true;
    }
}

function handleWindowPointerMove(event: PointerEvent) {
    if (!activePointers.has(event.pointerId)) {
        return;
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...activePointers.values()];

    if (points.length === 1) {
        const point = points[0];
        if (!point) {
            return;
        }
        if (lastPanPoint) {
            const dx = point.x - lastPanPoint.x;
            const dy = point.y - lastPanPoint.y;
            if (dx !== 0 || dy !== 0) {
                gestureDistance += Math.hypot(dx, dy);
                if (gestureDistance > boardPanThreshold) {
                    suppressClick = true;
                    panBoardBy(pendingPanX + dx, pendingPanY + dy);
                    pendingPanX = 0;
                    pendingPanY = 0;
                } else {
                    pendingPanX += dx;
                    pendingPanY += dy;
                }
            }
        }
        lastPanPoint = { x: point.x, y: point.y };
        return;
    }

    const first = points[0];
    const second = points[1];
    if (!first || !second) {
        return;
    }
    const distance = pointerDistance(first, second);
    const midpoint = pointerMidpoint(first, second);
    if (pinchLastDistance > 0 && pinchLastMidpoint) {
        const factor = distance / pinchLastDistance;
        const dx = midpoint.x - pinchLastMidpoint.x;
        const dy = midpoint.y - pinchLastMidpoint.y;
        if (factor !== 1 || dx !== 0 || dy !== 0) {
            suppressClick = true;
            zoomBoardAt(boardZoom.value * factor, midpoint.x, midpoint.y);
            panBoardBy(dx, dy);
        }
    }
    pinchLastDistance = distance;
    pinchLastMidpoint = midpoint;
}

function handleWindowPointerUp(event: PointerEvent) {
    activePointers.delete(event.pointerId);
    const points = [...activePointers.values()];
    if (points.length === 0) {
        stopPointerTracking();
        isPanning.value = false;
        lastPanPoint = null;
        pinchLastDistance = 0;
        pinchLastMidpoint = null;
        pendingPanX = 0;
        pendingPanY = 0;
        return;
    }
    if (points.length === 1) {
        const point = points[0];
        lastPanPoint = point ? { x: point.x, y: point.y } : null;
        pinchLastDistance = 0;
        pinchLastMidpoint = null;
        pendingPanX = 0;
        pendingPanY = 0;
        return;
    }

    const first = points[0];
    const second = points[1];
    if (first && second) {
        pinchLastDistance = pointerDistance(first, second);
        pinchLastMidpoint = pointerMidpoint(first, second);
    }
    lastPanPoint = null;
    pendingPanX = 0;
    pendingPanY = 0;
}

function resetView() {
    boardZoom.value = 1;
    boardPan.value = { x: 0, y: 0 };
}

let boardResizeObserver: ResizeObserver | null = null;

function handleBoardResize() {
    updateBoardScale();
    clampBoardPan();
}

watch(() => props.viewBox, async () => {
    await nextTick();
    updateBoardScale();
    clampBoardPan();
});

onMounted(() => {
    updateBoardScale();
    clampBoardPan();
    if (boardViewport.value && typeof ResizeObserver !== 'undefined') {
        boardResizeObserver = new ResizeObserver(handleBoardResize);
        boardResizeObserver.observe(boardViewport.value);
    }
});

onBeforeUnmount(() => {
    boardResizeObserver?.disconnect();
    boardResizeObserver = null;
    stopPointerTracking();
});
</script>

<style scoped>
.board-stage {
    position: relative;
    width: 100%;
}

.board-viewport {
    position: relative;
    width: 100%;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
}

.board-viewport.panning {
    cursor: grabbing;
}

.board-reset-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.reset-view-icon {
    display: block;
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}
</style>
