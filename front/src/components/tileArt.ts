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
    walls: string[];
}

export interface PennantArt {
    shield: string;
    blueHalf: string;
}

const CITY_DEPTH = 0.3;
const CITY_STRIP = 0.28;
const CITY_WALL_BOW = 0.05;

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

function midpoint(from: TilePoint, to: TilePoint): TilePoint {
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function insetWallPoint(point: TilePoint, endpoint: boolean): TilePoint {
    if (endpoint) {
        return point;
    }

    const onVerticalEdge = point.x === 0 || point.x === 1;
    const onHorizontalEdge = point.y === 0 || point.y === 1;

    if (onVerticalEdge && onHorizontalEdge) {
        return point;
    }
    if (point.x === 0) {
        return { x: CITY_WALL_BOW, y: point.y };
    }
    if (point.x === 1) {
        return { x: 1 - CITY_WALL_BOW, y: point.y };
    }
    if (point.y === 0) {
        return { x: point.x, y: CITY_WALL_BOW };
    }
    if (point.y === 1) {
        return { x: point.x, y: 1 - CITY_WALL_BOW };
    }
    return point;
}

function smoothPathCommands(points: TilePoint[], size: number, includeMove: boolean): string[] {
    if (points.length < 2) {
        return [];
    }

    const commands: string[] = [];
    if (includeMove) {
        commands.push(`M ${formatPoint(points[0]!, size)}`);
    }
    if (points.length === 2) {
        commands.push(`L ${formatPoint(points[1]!, size)}`);
        return commands;
    }

    const midpoints = points.slice(0, -1).map((point, index) => midpoint(point, points[index + 1]!));
    commands.push(`L ${formatPoint(midpoints[0]!, size)}`);
    for (let index = 1; index < points.length - 1; index += 1) {
        commands.push(`Q ${formatPoint(points[index]!, size)} ${formatPoint(midpoints[index]!, size)}`);
    }
    commands.push(`L ${formatPoint(points[points.length - 1]!, size)}`);
    return commands;
}

function segmentEdge(from: TilePoint, to: TilePoint): number | undefined {
    if (from.y === 0 && to.y === 0) {
        return 0;
    }
    if (from.x === 1 && to.x === 1) {
        return 1;
    }
    if (from.y === 1 && to.y === 1) {
        return 2;
    }
    if (from.x === 0 && to.x === 0) {
        return 3;
    }
    return undefined;
}

function cityArtForEdges(points: TilePoint[], edges: number[], size: number): { d: string; walls: string[] } {
    if (points.length === 0) {
        return { d: '', walls: [] };
    }

    const openEdges = new Set(edges);
    const segments = points.map((from, index) => {
        const to = points[(index + 1) % points.length]!;
        const edge = segmentEdge(from, to);
        return {
            from,
            to,
            wall: edge === undefined || !openEdges.has(edge)
        };
    });

    if (!segments.some(segment => segment.wall)) {
        return { d: polygonToPath(points, size), walls: [] };
    }

    const startIndex = segments.findIndex(segment => !segment.wall);
    const start = startIndex === -1 ? 0 : startIndex;
    const commands: string[] = [`M ${formatPoint(points[start]!, size)}`];
    const walls: string[] = [];
    let offset = 0;

    while (offset < segments.length) {
        const segment = segments[(start + offset) % segments.length]!;
        if (!segment.wall) {
            commands.push(`L ${formatPoint(segment.to, size)}`);
            offset += 1;
            continue;
        }

        const chain: TilePoint[] = [segment.from];
        while (offset < segments.length) {
            const current = segments[(start + offset) % segments.length]!;
            if (!current.wall) {
                break;
            }
            chain.push(current.to);
            offset += 1;
        }

        const adjusted = chain.map((point, index) =>
            insetWallPoint(point, index === 0 || index === chain.length - 1));
        const wallCommands = smoothPathCommands(adjusted, size, false);
        commands.push(...wallCommands);
        walls.push([`M ${formatPoint(adjusted[0]!, size)}`, ...wallCommands].join(' '));
    }

    commands.push('Z');
    return { d: commands.join(' '), walls };
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
        const art = cityArtForEdges(points, group, size);
        return [{
            groupIndex,
            d: art.d,
            walls: art.walls
        }];
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

        const center = pennantCenterForEdge(group[0]!);
        const offset = group[0] === 0 || group[0] === 2
            ? { x: 0.1, y: 0 }
            : { x: 0, y: 0.1 };

        const shieldWidth = size * 0.11;
        const shieldHeight = size * 0.13;

        for (let index = 0; index < count; index += 1) {
            placements.push(shieldPaths(
                (center.x + offset.x * index) * size,
                (center.y + offset.y * index) * size,
                shieldWidth,
                shieldHeight
            ));
        }
    }

    return placements;
}

function shieldPaths(centerX: number, centerY: number, width: number, height: number): PennantArt {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const left = centerX - halfWidth;
    const right = centerX + halfWidth;
    const top = centerY - halfHeight;
    const bottom = centerY + halfHeight;
    const shoulderY = top + height * 0.46;
    const curveControlY = top + height * 0.7;
    const tipControlX = width * 0.26;
    const tipControlY = bottom - height * 0.06;

    return {
        shield: `M ${left} ${top} L ${right} ${top} L ${right} ${shoulderY} C ${right} ${curveControlY} ${centerX + tipControlX} ${tipControlY} ${centerX} ${bottom} C ${centerX - tipControlX} ${tipControlY} ${left} ${curveControlY} ${left} ${shoulderY} Z`,
        blueHalf: `M ${centerX} ${top} L ${right} ${top} L ${right} ${shoulderY} C ${right} ${curveControlY} ${centerX + tipControlX} ${tipControlY} ${centerX} ${bottom} Z`
    };
}

function pennantCenterForEdge(edge: number): TilePoint {
    if (edge === 0) {
        return { x: 0.675, y: 0.2 };
    }
    if (edge === 1) {
        return { x: 0.91, y: 0.62 };
    }
    if (edge === 2) {
        return { x: 0.435, y: 0.84 };
    }
    return { x: 0.195, y: 0.44 };
}
