import type { CarcassonneTileTemplate } from 'carcassonne-back';
import { edgeMidpoints, type TilePoint } from './tileGeometry';

interface TileRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CityPath {
    groupIndex: number;
    d: string;
}

export interface PennantArt {
    x: number;
    y: number;
    poleBottom: number;
    flag: string;
}

const CITY_DEPTH = 0.3;
const CITY_STRIP = 0.28;

const inwardDirections: TilePoint[] = [
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 }
];

const cityPolygons: Record<string, TilePoint[]> = {
    '0': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: CITY_DEPTH }, { x: 0, y: CITY_DEPTH }
    ],
    '01': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1 - CITY_DEPTH, y: 1 },
        { x: 1 - CITY_DEPTH, y: CITY_DEPTH }, { x: 0, y: CITY_DEPTH }
    ],
    '02': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: CITY_DEPTH },
        { x: (1 + CITY_STRIP) / 2, y: CITY_DEPTH }, { x: (1 + CITY_STRIP) / 2, y: 1 - CITY_DEPTH },
        { x: 1, y: 1 - CITY_DEPTH }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 1 - CITY_DEPTH },
        { x: (1 - CITY_STRIP) / 2, y: 1 - CITY_DEPTH }, { x: (1 - CITY_STRIP) / 2, y: CITY_DEPTH },
        { x: 0, y: CITY_DEPTH }
    ],
    '03': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: CITY_DEPTH }, { x: CITY_DEPTH, y: CITY_DEPTH },
        { x: CITY_DEPTH, y: 1 }, { x: 0, y: 1 }
    ],
    '012': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
        { x: 0, y: 1 - CITY_DEPTH }, { x: 1 - CITY_DEPTH, y: 1 - CITY_DEPTH },
        { x: 1 - CITY_DEPTH, y: CITY_DEPTH }, { x: 0, y: CITY_DEPTH }
    ],
    '013': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1 - CITY_DEPTH, y: 1 },
        { x: 1 - CITY_DEPTH, y: 1 - CITY_DEPTH }, { x: CITY_DEPTH, y: 1 - CITY_DEPTH },
        { x: CITY_DEPTH, y: 1 }, { x: 0, y: 1 }
    ],
    '023': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: CITY_DEPTH }, { x: CITY_DEPTH, y: CITY_DEPTH },
        { x: CITY_DEPTH, y: 1 - CITY_DEPTH }, { x: 1, y: 1 - CITY_DEPTH }, { x: 1, y: 1 },
        { x: 0, y: 1 }
    ],
    '0123': [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }
    ]
};

function rotatePointClockwise(point: TilePoint): TilePoint {
    return { x: 1 - point.y, y: point.x };
}

function rotatePointsClockwise(points: TilePoint[], rotations: number): TilePoint[] {
    return Array.from({ length: rotations }).reduce<TilePoint[]>(
        (current) => current.map(rotatePointClockwise),
        points
    );
}

function cityPolygonForEdges(edges: number[]): TilePoint[] | undefined {
    const targetKey = [...edges].sort((a, b) => a - b).join('');
    const direct = cityPolygons[targetKey];
    if (direct) {
        return direct;
    }

    for (const [canonicalKey, points] of Object.entries(cityPolygons)) {
        for (let rotations = 1; rotations < 4; rotations += 1) {
            const rotatedKey = canonicalKey
                .split('')
                .map(digit => String((Number(digit) + rotations) % 4))
                .sort()
                .join('');
            if (rotatedKey === targetKey) {
                return rotatePointsClockwise(points, rotations);
            }
        }
    }

    return undefined;
}

function cityRectsForEdges(edges: number[]): TileRect[] {
    const rects: TileRect[] = [];
    const edgeSet = new Set(edges);

    if (edgeSet.has(0)) {
        rects.push({ x: 0, y: 0, width: 1, height: CITY_DEPTH });
    }
    if (edgeSet.has(1)) {
        rects.push({ x: 1 - CITY_DEPTH, y: 0, width: CITY_DEPTH, height: 1 });
    }
    if (edgeSet.has(2)) {
        rects.push({ x: 0, y: 1 - CITY_DEPTH, width: 1, height: CITY_DEPTH });
    }
    if (edgeSet.has(3)) {
        rects.push({ x: 0, y: 0, width: CITY_DEPTH, height: 1 });
    }

    if (edgeSet.size === 2 && edgeSet.has(0) && edgeSet.has(2)) {
        rects.push({ x: (1 - CITY_STRIP) / 2, y: 0, width: CITY_STRIP, height: 1 });
    }
    if (edgeSet.size === 2 && edgeSet.has(1) && edgeSet.has(3)) {
        rects.push({ x: 0, y: (1 - CITY_STRIP) / 2, width: 1, height: CITY_STRIP });
    }
    if (edgeSet.size === 3) {
        if (!edgeSet.has(0)) {
            rects.push({ x: 0, y: CITY_DEPTH, width: 1, height: 1 - CITY_DEPTH });
        } else if (!edgeSet.has(1)) {
            rects.push({ x: 0, y: 0, width: 1 - CITY_DEPTH, height: 1 });
        } else if (!edgeSet.has(2)) {
            rects.push({ x: 0, y: 0, width: 1, height: 1 - CITY_DEPTH });
        } else {
            rects.push({ x: CITY_DEPTH, y: 0, width: 1 - CITY_DEPTH, height: 1 });
        }
    }
    if (edgeSet.size === 4) {
        rects.push({ x: 0, y: 0, width: 1, height: 1 });
    }

    return rects;
}

function rayRectDistance(origin: TilePoint, direction: TilePoint, rect: TileRect): number | undefined {
    let nearest: number | undefined;

    for (const axis of ['x', 'y'] as const) {
        const originValue = origin[axis];
        const directionValue = direction[axis];
        if (directionValue === 0) {
            continue;
        }

        const min = axis === 'x' ? rect.x : rect.y;
        const max = min + (axis === 'x' ? rect.width : rect.height);
        const candidates = directionValue > 0
            ? [min, max]
            : [max, min];

        for (const candidate of candidates) {
            const distance = (candidate - originValue) / directionValue;
            if (distance < 0.0001) {
                continue;
            }
            const otherAxis = axis === 'x' ? 'y' : 'x';
            const otherValue = origin[otherAxis] + direction[otherAxis] * distance;
            const otherMin = otherAxis === 'x' ? rect.x : rect.y;
            const otherMax = otherMin + (otherAxis === 'x' ? rect.width : rect.height);
            if (otherValue >= otherMin - 0.0001 && otherValue <= otherMax + 0.0001) {
                nearest = nearest === undefined ? distance : Math.min(nearest, distance);
            }
        }
    }

    return nearest;
}

function findCityIntersection(origin: TilePoint, direction: TilePoint, rects: TileRect[]): TilePoint | undefined {
    const distances = rects
        .map(rect => rayRectDistance(origin, direction, rect))
        .filter((distance): distance is number => distance !== undefined);

    if (distances.length === 0) {
        return undefined;
    }

    const distance = Math.min(...distances);
    return {
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance
    };
}

function formatPoint(point: TilePoint, size: number): string {
    return `${(point.x * size).toFixed(2)} ${(point.y * size).toFixed(2)}`;
}

function polygonToPath(points: TilePoint[], size: number): string {
    if (points.length === 0) {
        return '';
    }
    const [first, ...rest] = points;
    const path = [`M ${formatPoint(first!, size)}`];
    for (const point of rest) {
        path.push(`L ${formatPoint(point, size)}`);
    }
    path.push('Z');
    return path.join(' ');
}

export function roadPathData(template: CarcassonneTileTemplate, size: number): string {
    const allCityRects = template.cityGroups.flatMap(cityRectsForEdges);
    const paths: string[] = [];

    for (const group of template.roadGroups) {
        if (group.length === 0) {
            continue;
        }

        if (group.length === 1) {
            const edge = group[0]!;
            const origin = edgeMidpoints[edge]!;
            const direction = inwardDirections[edge]!;
            const end = findCityIntersection(origin, direction, allCityRects) ?? { x: 0.5, y: 0.5 };
            paths.push(`M ${formatPoint(origin, size)} L ${formatPoint(end, size)}`);
            continue;
        }

        if (group.length === 2) {
            const [firstEdge, secondEdge] = group as [number, number];
            const start = edgeMidpoints[firstEdge]!;
            const end = edgeMidpoints[secondEdge]!;
            const key = [firstEdge, secondEdge].sort((a, b) => a - b).join('');
            if (key === '02' || key === '13') {
                paths.push(`M ${formatPoint(start, size)} L ${formatPoint(end, size)}`);
            } else {
                paths.push(
                    `M ${formatPoint(start, size)} Q ${formatPoint({ x: 0.5, y: 0.5 }, size)} ${formatPoint(end, size)}`
                );
            }
            continue;
        }

        for (const edge of group) {
            const origin = edgeMidpoints[edge]!;
            paths.push(`M ${formatPoint(origin, size)} L ${(size / 2).toFixed(2)} ${(size / 2).toFixed(2)}`);
        }
    }

    return paths.join(' ');
}

export function cityPaths(template: CarcassonneTileTemplate, size: number): CityPath[] {
    return template.cityGroups.flatMap((group, groupIndex) => {
        const points = cityPolygonForEdges(group);
        if (!points) {
            return [];
        }
        return [{ groupIndex, d: polygonToPath(points, size) }];
    });
}

export function pennantPlacements(template: CarcassonneTileTemplate, size: number): PennantArt[] {
    const placements: PennantArt[] = [];

    for (let groupIndex = 0; groupIndex < template.cityGroups.length; groupIndex += 1) {
        const group = template.cityGroups[groupIndex]!;
        const count = template.cityPennants?.[groupIndex] ?? 0;
        if (count <= 0 || group.length === 0) {
            continue;
        }

        const base = pennantBaseForEdge(group[0]!);
        const offset = group[0] === 0 || group[0] === 2
            ? { x: 0.1, y: 0 }
            : { x: 0, y: 0.1 };

        for (let index = 0; index < count; index += 1) {
            const x = (base.x + offset.x * index) * size;
            const y = (base.y + offset.y * index) * size;
            placements.push({
                x,
                y,
                poleBottom: y + size * 0.12,
                flag: `M ${x} ${y} L ${x + size * 0.11} ${y + size * 0.03} L ${x} ${y + size * 0.06} Z`
            });
        }
    }

    return placements;
}

function pennantBaseForEdge(edge: number): TilePoint {
    if (edge === 0) {
        return { x: 0.62, y: 0.14 };
    }
    if (edge === 1) {
        return { x: 0.86, y: 0.62 };
    }
    if (edge === 2) {
        return { x: 0.38, y: 0.86 };
    }
    return { x: 0.14, y: 0.38 };
}
