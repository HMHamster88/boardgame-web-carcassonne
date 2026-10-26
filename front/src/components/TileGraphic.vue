<template>
    <g v-if="template">
        <g :transform="`rotate(${rotation * 90} ${size / 2} ${size / 2})`">
            <rect :width="size" :height="size" rx="4" class="tile-base" />

            <rect v-for="cityRect in cityRects" :key="`city-${cityRect.direction}`" :x="cityRect.x" :y="cityRect.y"
                :width="cityRect.width" :height="cityRect.height" :rx="size * 0.06" class="city-edge" />

            <line v-for="(roadLine, index) in roadLines" :key="`road-${index}`" :x1="roadLine.x1" :y1="roadLine.y1"
                :x2="roadLine.x2" :y2="roadLine.y2" class="road-edge" />

            <circle v-if="template.cloister" :cx="size / 2" :cy="size / 2" :r="size * 0.17" class="cloister-edge" />
            <circle v-if="template.cloister" :cx="size / 2" :cy="size / 2" :r="size * 0.08" class="cloister-inner" />

            <template v-if="showFeatures">
                <text v-for="label in edgeLabels" :key="`label-${label.direction}`" :x="label.x" :y="label.y"
                    class="edge-label">{{ label.text }}</text>
            </template>

            <g v-for="(marker, index) in followerMarkers" :key="`follower-${index}`">
                <circle :cx="marker.x" :cy="marker.y" :r="size * 0.075" :fill="marker.color" class="follower" />
                <text :x="marker.x" :y="marker.y + size * 0.03" class="follower-label">{{ marker.label }}</text>
            </g>

            <path v-if="hasPennant" :d="pennantPath" class="pennant" />
        </g>

        <text v-if="showCoordinates && x !== undefined && y !== undefined" x="4" y="12" class="coordinate-label">
            {{ x }},{{ y }}
        </text>
    </g>

    <g v-else>
        <rect :width="size" :height="size" rx="4" class="tile-missing" />
        <text :x="size / 2" :y="size / 2 + 4" class="missing-label">?</text>
    </g>
</template>

<script setup lang="ts">
import type { Player } from 'boardgame-web-common';
import type { CarcassonneFollower, CarcassonneFollowerType, CarcassonneTileTemplate } from 'carcassonne-back';
import { getTileTemplate } from 'carcassonne-back';
import { computed, type PropType } from 'vue';
import { edgeMidpoints, getFeatureAnchor } from './tileGeometry';

const props = defineProps({
    templateId: {
        type: String,
        required: true
    },
    rotation: {
        type: Number,
        default: 0
    },
    size: {
        type: Number,
        default: 64
    },
    x: {
        type: Number,
        required: false
    },
    y: {
        type: Number,
        required: false
    },
    followers: {
        type: Array as PropType<CarcassonneFollower[]>,
        default: () => []
    },
    players: {
        type: Array as PropType<Player[]>,
        default: () => []
    },
    showFeatures: {
        type: Boolean,
        default: false
    },
    showCoordinates: {
        type: Boolean,
        default: false
    }
});

const template = computed<CarcassonneTileTemplate | undefined>(() => getTileTemplate(props.templateId));

const cityRects = computed(() => {
    const currentTemplate = template.value;
    if (!currentTemplate) {
        return [];
    }

    const depth = props.size * 0.3;

    return currentTemplate.edges.flatMap((edge, direction) => {
        if (edge !== 'city') {
            return [];
        }
        if (direction === 0) {
            return [{ direction, x: 0, y: 0, width: props.size, height: depth }];
        }
        if (direction === 1) {
            return [{ direction, x: props.size - depth, y: 0, width: depth, height: props.size }];
        }
        if (direction === 2) {
            return [{ direction, x: 0, y: props.size - depth, width: props.size, height: depth }];
        }
        return [{ direction, x: 0, y: 0, width: depth, height: props.size }];
    });
});

const roadLines = computed(() => {
    const currentTemplate = template.value;
    if (!currentTemplate) {
        return [];
    }

    return currentTemplate.edges.flatMap((edge, direction) => {
        if (edge !== 'road') {
            return [];
        }
        const midpoint = edgeMidpoints[direction]!;
        return [{
            x1: midpoint.x * props.size,
            y1: midpoint.y * props.size,
            x2: props.size / 2,
            y2: props.size / 2
        }];
    });
});

const edgeLabels = computed(() => {
    const currentTemplate = template.value;
    if (!currentTemplate) {
        return [];
    }

    const shortNames = { city: 'C', road: 'R', field: 'F' };
    const positions = [
        { x: props.size / 2, y: props.size * 0.2 },
        { x: props.size * 0.82, y: props.size / 2 + 3 },
        { x: props.size / 2, y: props.size * 0.94 },
        { x: props.size * 0.18, y: props.size / 2 + 3 }
    ];

    return currentTemplate.edges.map((edge, direction) => ({
        direction,
        text: shortNames[edge],
        x: positions[direction]!.x,
        y: positions[direction]!.y
    }));
});

const hasPennant = computed(() => (template.value?.cityPennants ?? []).some(count => count > 0));

const pennantPath = computed(() => {
    const size = props.size;
    return `M ${size - 16} ${size * 0.08} L ${size - 6} ${size * 0.08} L ${size - 11} ${size * 0.2} Z`;
});

const followerLabelByType: Record<CarcassonneFollowerType, string> = {
    knight: 'K',
    thief: 'T',
    farmer: 'F',
    monk: 'M'
};

function getFollowerAnchor(follower: CarcassonneFollower): { x: number, y: number } {
    const currentTemplate = template.value;
    if (!currentTemplate) {
        return { x: 0.5, y: 0.5 };
    }
    return getFeatureAnchor(currentTemplate, follower.featureType, follower.segmentIndex);
}

const followerMarkers = computed(() => {
    return props.followers.map((follower, index) => {
        const anchor = getFollowerAnchor(follower);
        const offset = index * 1.9;

        return {
            x: props.size * anchor.x + Math.cos(offset) * props.size * 0.05,
            y: props.size * anchor.y + Math.sin(offset) * props.size * 0.05,
            color: props.players.find(player => player.userId === follower.playerId)?.color ?? '#ffffff',
            label: followerLabelByType[follower.type]
        };
    });
});
</script>

<style scoped>
.tile-base {
    fill: #7fb069;
    stroke: #3b2f1e;
    stroke-width: 2px;
}

.city-edge {
    fill: #b98b5e;
    stroke: #7a5637;
    stroke-width: 2px;
}

.road-edge {
    stroke: #d9d9d9;
    stroke-width: 8px;
    stroke-linecap: round;
}

.cloister-edge {
    fill: #f0e6ff;
    stroke: #6b4fa0;
    stroke-width: 3px;
}

.cloister-inner {
    fill: #6b4fa0;
}

.edge-label {
    fill: #1f2d14;
    font-size: 10px;
    font-weight: bold;
    text-anchor: middle;
    pointer-events: none;
}

.follower {
    stroke: #ffffff;
    stroke-width: 1.5px;
}

.follower-label {
    fill: #000000;
    font-size: 8px;
    font-weight: bold;
    text-anchor: middle;
    pointer-events: none;
}

.pennant {
    fill: #ffd700;
    stroke: #8a6d00;
    stroke-width: 1px;
}

.coordinate-label {
    fill: #00000099;
    font-size: 9px;
}

.tile-missing {
    fill: #cfcfcf;
    stroke: #3b2f1e;
    stroke-width: 2px;
}

.missing-label {
    fill: #ffffff;
    font-size: 18px;
    font-weight: bold;
    text-anchor: middle;
}
</style>
