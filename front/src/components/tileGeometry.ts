import type { CarcassonneFeatureType, CarcassonneFieldSide, CarcassonneTileTemplate } from 'carcassonne-back';

export interface TilePoint {
    x: number;
    y: number;
}

export const edgeMidpoints: TilePoint[] = [
    { x: 0.5, y: 0 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 1 },
    { x: 0, y: 0.5 }
];

export const fieldSideAnchors: Record<CarcassonneFieldSide, TilePoint> = [
    { x: 0.3, y: 0.18 },
    { x: 0.7, y: 0.18 },
    { x: 0.82, y: 0.3 },
    { x: 0.82, y: 0.7 },
    { x: 0.7, y: 0.82 },
    { x: 0.3, y: 0.82 },
    { x: 0.18, y: 0.7 },
    { x: 0.18, y: 0.3 }
];

export function getFeatureAnchor(
    template: CarcassonneTileTemplate,
    featureType: CarcassonneFeatureType,
    segmentIndex: number
): TilePoint {
    if (featureType === 'cloister') {
        return { x: 0.5, y: 0.5 };
    }
    if (featureType === 'field') {
        const sides = template.fieldSides[segmentIndex] ?? [];
        const side = sides[0];
        return side === undefined ? { x: 0.5, y: 0.5 } : fieldSideAnchors[side]!;
    }

    const edges = featureType === 'city'
        ? template.cityGroups[segmentIndex] ?? []
        : template.roadGroups[segmentIndex] ?? [];
    const edge = edges[0];
    const midpoint = edge === undefined ? { x: 0.5, y: 0.5 } : edgeMidpoints[edge]!;
    const factor = 0.62;

    return {
        x: 0.5 + (midpoint.x - 0.5) * factor,
        y: 0.5 + (midpoint.y - 0.5) * factor
    };
}
