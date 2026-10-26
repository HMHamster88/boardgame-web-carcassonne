<template>
    <g v-if="template">
        <defs>
            <pattern :id="grassPatternId" :width="grassPattern.width" :height="grassPattern.height"
                patternUnits="userSpaceOnUse">
                <path v-for="(tuft, index) in grassPattern.tufts" :key="`grass-${index}`" :d="tuft.d" fill="none"
                    stroke="#5d8640" :stroke-width="tuft.width" stroke-linecap="round" :opacity="tuft.opacity" />
                <circle :cx="grassPattern.dot.cx" :cy="grassPattern.dot.cy" :r="grassPattern.dot.r" fill="#5d8640"
                    :opacity="grassPattern.dot.opacity" />
            </pattern>

            <pattern :id="cityPatternId" :width="cityPattern.width" :height="cityPattern.height"
                patternUnits="userSpaceOnUse">
                <rect :width="cityPattern.width" :height="cityPattern.height" fill="#c8a165" />
                <g v-for="(building, index) in cityPattern.buildings" :key="`building-${index}`">
                    <rect :x="building.x" :y="building.y" :width="building.width" :height="building.height"
                        :rx="building.rx" :fill="building.fill" />
                    <path :d="building.roof" :fill="building.roofFill" />
                </g>
            </pattern>

            <clipPath :id="tileClipId">
                <rect :width="size" :height="size" />
            </clipPath>
        </defs>

        <g :transform="`rotate(${rotation * 90} ${size / 2} ${size / 2})`">
            <g :clip-path="`url(#${tileClipId})`">
                <rect :width="size" :height="size" fill="#82b35a" class="tile-base" />
                <rect :width="size" :height="size" :fill="`url(#${grassPatternId})`"
                    class="tile-texture" />

                <path v-if="roadD" :d="roadD" class="road-outline" :stroke-width="size * 0.055" />
                <path v-if="roadD" :d="roadD" class="road-surface" :stroke-width="size * 0.032" />

                <g v-for="city in cityArt" :key="`city-${city.groupIndex}`" class="city">
                    <path :d="city.d" :fill="`url(#${cityPatternId})`" class="city-body" />
                    <path v-for="(wall, wallIndex) in city.walls" :key="`city-wall-${city.groupIndex}-${wallIndex}`"
                        :d="wall" fill="none" class="city-wall" :stroke-width="size * 0.035" />
                    <path v-for="(wall, wallIndex) in city.walls"
                        :key="`city-wall-highlight-${city.groupIndex}-${wallIndex}`" :d="wall" fill="none"
                        class="city-highlight" :stroke-width="size * 0.012" />
                </g>

                <g v-if="template.cloister" class="cloister"
                    :transform="`rotate(${-rotation * 90} ${size / 2} ${size / 2})`">
                    <rect :x="cloisterArt.base.x" :y="cloisterArt.base.y" :width="cloisterArt.base.width"
                        :height="cloisterArt.base.height" :rx="cloisterArt.base.rx" class="cloister-building"
                        :stroke-width="size * 0.018" />
                    <path :d="cloisterArt.roof" class="cloister-roof" :stroke-width="size * 0.018" />
                    <line :x1="cloisterArt.crossVertical.x1" :y1="cloisterArt.crossVertical.y1"
                        :x2="cloisterArt.crossVertical.x2" :y2="cloisterArt.crossVertical.y2" class="cloister-cross"
                        :stroke-width="size * 0.012" />
                    <line :x1="cloisterArt.crossHorizontal.x1" :y1="cloisterArt.crossHorizontal.y1"
                        :x2="cloisterArt.crossHorizontal.x2" :y2="cloisterArt.crossHorizontal.y2"
                        class="cloister-cross" :stroke-width="size * 0.012" />
                    <rect :x="cloisterArt.door.x" :y="cloisterArt.door.y" :width="cloisterArt.door.width"
                        :height="cloisterArt.door.height" :rx="cloisterArt.door.rx" class="cloister-door" />
                    <rect v-for="(window, index) in cloisterArt.windows" :key="`cloister-window-${index}`"
                        :x="window.x" :y="window.y" :width="window.size" :height="window.size"
                        :rx="size * 0.006" class="cloister-window" :stroke-width="size * 0.008" />
                </g>

                <g v-for="(pennant, index) in pennantArt" :key="`pennant-${index}`" class="pennant">
                    <line :x1="pennant.x" :y1="pennant.y" :x2="pennant.x" :y2="pennant.poleBottom"
                        class="pennant-pole" :stroke-width="size * 0.012" />
                    <path :d="pennant.flag" class="pennant-flag" :stroke-width="size * 0.008" />
                </g>

                <template v-if="showFeatures">
                    <text v-for="label in edgeLabels" :key="`label-${label.direction}`" :x="label.x" :y="label.y"
                        class="edge-label">{{ label.text }}</text>
                </template>

                <g v-for="(marker, index) in followerMarkers" :key="`follower-${index}`">
                    <circle :cx="marker.x" :cy="marker.y" :r="size * 0.075" :fill="marker.color" class="follower" />
                    <text :x="marker.x" :y="marker.y + size * 0.03" class="follower-label">{{ marker.label }}</text>
                </g>
            </g>

            <rect :x="size * 0.012" :y="size * 0.012" :width="size * 0.976" :height="size * 0.976"
                fill="none" class="tile-border" :stroke-width="size * 0.016" />
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
import { computed, useId, type PropType } from 'vue';
import { cityPaths, pennantPlacements, roadPathData } from './tileArt';
import { getFeatureAnchor } from './tileGeometry';

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

const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
const grassPatternId = `grass-pattern-${instanceId}`;
const cityPatternId = `city-pattern-${instanceId}`;
const tileClipId = `tile-clip-${instanceId}`;

const grassPattern = computed(() => {
    const size = props.size;
    return {
        width: size * 0.2,
        height: size * 0.2,
        tufts: [
            {
                d: `M ${size * 0.03} ${size * 0.15} q ${size * 0.02} -${size * 0.04} ${size * 0.04} 0`,
                width: size * 0.014,
                opacity: 0.35
            },
            {
                d: `M ${size * 0.12} ${size * 0.08} q ${size * 0.015} -${size * 0.03} ${size * 0.03} 0`,
                width: size * 0.012,
                opacity: 0.25
            }
        ],
        dot: {
            cx: size * 0.08,
            cy: size * 0.05,
            r: size * 0.008,
            opacity: 0.3
        }
    };
});

const cityPattern = computed(() => {
    const size = props.size;
    return {
        width: size * 0.22,
        height: size * 0.16,
        buildings: [
            {
                x: size * 0.025,
                y: size * 0.035,
                width: size * 0.075,
                height: size * 0.05,
                rx: size * 0.008,
                fill: '#b98b5e',
                roof: `M ${size * 0.02} ${size * 0.035} L ${size * 0.0625} ${size * 0.008} L ${size * 0.105} ${size * 0.035} Z`,
                roofFill: '#96623a'
            },
            {
                x: size * 0.135,
                y: size * 0.085,
                width: size * 0.065,
                height: size * 0.045,
                rx: size * 0.007,
                fill: '#d4b27a',
                roof: `M ${size * 0.13} ${size * 0.085} L ${size * 0.1675} ${size * 0.06} L ${size * 0.205} ${size * 0.085} Z`,
                roofFill: '#a97444'
            }
        ]
    };
});

const cityArt = computed(() => {
    const currentTemplate = template.value;
    return currentTemplate ? cityPaths(currentTemplate, props.size) : [];
});

const roadD = computed(() => {
    const currentTemplate = template.value;
    return currentTemplate ? roadPathData(currentTemplate, props.size) : '';
});

const pennantArt = computed(() => {
    const currentTemplate = template.value;
    return currentTemplate ? pennantPlacements(currentTemplate, props.size) : [];
});

const cloisterArt = computed(() => {
    const size = props.size;
    return {
        base: {
            x: size * 0.38,
            y: size * 0.4,
            width: size * 0.24,
            height: size * 0.22,
            rx: size * 0.02
        },
        roof: `M ${size * 0.35} ${size * 0.41} L ${size * 0.5} ${size * 0.28} L ${size * 0.65} ${size * 0.41} Z`,
        crossVertical: {
            x1: size * 0.5,
            y1: size * 0.28,
            x2: size * 0.5,
            y2: size * 0.22
        },
        crossHorizontal: {
            x1: size * 0.46,
            y1: size * 0.25,
            x2: size * 0.54,
            y2: size * 0.25
        },
        door: {
            x: size * 0.47,
            y: size * 0.54,
            width: size * 0.06,
            height: size * 0.08,
            rx: size * 0.01
        },
        windows: [
            { x: size * 0.41, y: size * 0.46, size: size * 0.04 },
            { x: size * 0.55, y: size * 0.46, size: size * 0.04 }
        ]
    };
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
    stroke: none;
}

.tile-texture {
    opacity: 0.85;
}

.road-outline {
    fill: none;
    stroke: #6b4f2a;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.road-surface {
    fill: none;
    stroke: #f2e3c2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.city-wall {
    stroke: #7a5528;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.city-highlight {
    stroke: #e7c58e;
    stroke-opacity: 0.55;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.cloister-building {
    fill: #f5e8cf;
    stroke: #7a5528;
    stroke-linejoin: round;
}

.cloister-roof {
    fill: #a8613f;
    stroke: #6b3d28;
    stroke-linejoin: round;
}

.cloister-cross {
    stroke: #f6df9a;
    stroke-linecap: round;
}

.cloister-door {
    fill: #5c3d27;
}

.cloister-window {
    fill: #ffe9a8;
    stroke: #7a5528;
}

.pennant-pole {
    stroke: #5d4326;
    stroke-linecap: round;
}

.pennant-flag {
    fill: #ffd35c;
    stroke: #8a6d00;
    stroke-linejoin: round;
}

.edge-label {
    fill: #1f2d14;
    font-size: 9px;
    font-weight: 700;
    text-anchor: middle;
    paint-order: stroke;
    stroke: #fffdf0;
    stroke-width: 1.5px;
    stroke-linejoin: round;
    pointer-events: none;
}

.follower {
    stroke: #ffffff;
    stroke-width: 1.5px;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35));
}

.follower-label {
    fill: #000000;
    font-size: 8px;
    font-weight: bold;
    text-anchor: middle;
    pointer-events: none;
}

.tile-border {
    stroke: #3f5a2b;
    stroke-opacity: 0.55;
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
