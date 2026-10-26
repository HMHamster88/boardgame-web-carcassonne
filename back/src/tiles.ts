import type {
    CarcassonneEdgeType,
    CarcassonneFeatureType,
    CarcassonneFieldSide,
    CarcassonneFollowerType,
    CarcassonneTile,
    CarcassonneTileTemplate
} from './types/types';

export const edgeDirections = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
] as const;

export const surroundingOffsets = [
    { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
    { x: -1, y: 0 }, { x: 1, y: 0 },
    { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
] as const;

export const fieldSidesByEdge: [CarcassonneFieldSide, CarcassonneFieldSide][] = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7]
];

export const oppositeFieldSide: CarcassonneFieldSide[] = [5, 4, 7, 6, 1, 0, 3, 2];

export const followerTypeByFeature: Record<CarcassonneFeatureType, CarcassonneFollowerType> = {
    city: 'knight',
    road: 'thief',
    field: 'farmer',
    cloister: 'monk'
};

export const tileTemplates: CarcassonneTileTemplate[] = [
    {
        id: 'starting-tile',
        edges: ['city', 'field', 'road', 'field'],
        cityGroups: [[0]],
        roadGroups: [[2]],
        fieldSides: [[2, 3, 4], [5, 6, 7]],
        count: 1,
        starting: true
    },
    {
        id: 'city-cap',
        edges: ['city', 'field', 'field', 'field'],
        cityGroups: [[0]],
        roadGroups: [],
        fieldSides: [[2, 3, 4, 5, 6, 7]],
        count: 8
    },
    {
        id: 'city-two-opposite',
        edges: ['city', 'field', 'city', 'field'],
        cityGroups: [[0, 2]],
        roadGroups: [],
        fieldSides: [[2, 3], [6, 7]],
        count: 4
    },
    {
        id: 'city-two-opposite-pennant',
        edges: ['city', 'field', 'city', 'field'],
        cityGroups: [[0, 2]],
        cityPennants: [1],
        roadGroups: [],
        fieldSides: [[2, 3], [6, 7]],
        count: 2
    },
    {
        id: 'city-two-adjacent',
        edges: ['city', 'city', 'field', 'field'],
        cityGroups: [[0, 1]],
        roadGroups: [],
        fieldSides: [[4, 5, 6, 7]],
        count: 4
    },
    {
        id: 'city-two-adjacent-pennant',
        edges: ['city', 'city', 'field', 'field'],
        cityGroups: [[0, 1]],
        cityPennants: [1],
        roadGroups: [],
        fieldSides: [[4, 5, 6, 7]],
        count: 2
    },
    {
        id: 'city-three',
        edges: ['city', 'city', 'field', 'city'],
        cityGroups: [[0, 1, 3]],
        roadGroups: [],
        fieldSides: [[4, 5]],
        count: 3
    },
    {
        id: 'city-three-pennant',
        edges: ['city', 'city', 'field', 'city'],
        cityGroups: [[0, 1, 3]],
        cityPennants: [1],
        roadGroups: [],
        fieldSides: [[4, 5]],
        count: 2
    },
    {
        id: 'city-four',
        edges: ['city', 'city', 'city', 'city'],
        cityGroups: [[0, 1, 2, 3]],
        cityPennants: [1],
        roadGroups: [],
        fieldSides: [],
        count: 1
    },
    {
        id: 'city-cap-road',
        edges: ['city', 'field', 'road', 'field'],
        cityGroups: [[0]],
        roadGroups: [[2]],
        fieldSides: [[2, 3, 4], [5, 6, 7]],
        count: 8
    },
    {
        id: 'city-cap-road-pennant',
        edges: ['city', 'field', 'road', 'field'],
        cityGroups: [[0]],
        cityPennants: [1],
        roadGroups: [[2]],
        fieldSides: [[2, 3, 4], [5, 6, 7]],
        count: 2
    },
    {
        id: 'city-adjacent-road',
        edges: ['city', 'city', 'road', 'field'],
        cityGroups: [[0, 1]],
        roadGroups: [[2]],
        fieldSides: [[5, 6, 7], [4]],
        count: 3
    },
    {
        id: 'city-opposite-road',
        edges: ['city', 'field', 'city', 'road'],
        cityGroups: [[0, 2]],
        roadGroups: [[3]],
        fieldSides: [[2, 3], [6], [7]],
        count: 2
    },
    {
        id: 'city-three-road',
        edges: ['city', 'city', 'road', 'city'],
        cityGroups: [[0, 1, 3]],
        roadGroups: [[2]],
        fieldSides: [[4], [5]],
        count: 2
    },
    {
        id: 'road-straight',
        edges: ['road', 'field', 'road', 'field'],
        cityGroups: [],
        roadGroups: [[0, 2]],
        fieldSides: [[1, 2, 3, 4], [0, 5, 6, 7]],
        count: 8
    },
    {
        id: 'road-curve',
        edges: ['road', 'field', 'field', 'road'],
        cityGroups: [],
        roadGroups: [[0, 3]],
        fieldSides: [[1, 2, 3, 4, 5, 6], [0, 7]],
        count: 9
    },
    {
        id: 'road-t',
        edges: ['road', 'road', 'field', 'road'],
        cityGroups: [],
        roadGroups: [[0], [1], [3]],
        fieldSides: [[3, 4, 5, 6], [0, 7], [1, 2]],
        count: 4
    },
    {
        id: 'road-cross',
        edges: ['road', 'road', 'road', 'road'],
        cityGroups: [],
        roadGroups: [[0], [1], [2], [3]],
        fieldSides: [[1, 2], [3, 4], [5, 6], [0, 7]],
        count: 1
    },
    {
        id: 'cloister',
        edges: ['field', 'field', 'field', 'field'],
        cityGroups: [],
        roadGroups: [],
        fieldSides: [[0, 1, 2, 3, 4, 5, 6, 7]],
        cloister: true,
        count: 4
    },
    {
        id: 'cloister-road',
        edges: ['road', 'field', 'field', 'field'],
        cityGroups: [],
        roadGroups: [[0]],
        fieldSides: [[0, 1, 2, 3, 4, 5, 6, 7]],
        cloister: true,
        count: 2
    }
];

const templatesById = new Map(tileTemplates.map(template => [template.id, template]));

export function getTileTemplate(templateId: string): CarcassonneTileTemplate | undefined {
    return templatesById.get(templateId);
}

export function getStartingTileTemplate(): CarcassonneTileTemplate {
    const template = tileTemplates.find(tile => tile.starting);
    if (!template) {
        throw new Error('Starting tile template is missing');
    }
    return template;
}

export function createTileDeck(): string[] {
    const deck: string[] = [];
    for (const template of tileTemplates) {
        if (template.starting) {
            continue;
        }
        for (let index = 0; index < template.count; index++) {
            deck.push(template.id);
        }
    }
    return deck;
}

export function getPlacedEdgeType(template: CarcassonneTileTemplate, rotation: number, direction: number): CarcassonneEdgeType {
    return template.edges[(direction - rotation + 4) % 4]!;
}

export function getPlacedFieldSide(side: CarcassonneFieldSide, rotation: number): CarcassonneFieldSide {
    return ((side + rotation * 2) % 8) as CarcassonneFieldSide;
}

export function getOriginalFieldSide(side: CarcassonneFieldSide, rotation: number): CarcassonneFieldSide {
    return ((side - rotation * 2 + 8) % 8) as CarcassonneFieldSide;
}

export function getOriginalEdgeIndex(direction: number, rotation: number): number {
    return (direction - rotation + 4) % 4;
}

export function getPlacedEdgeDirection(originalEdgeIndex: number, rotation: number): number {
    return (originalEdgeIndex + rotation) % 4;
}

export function getOppositeDirection(direction: number): number {
    return (direction + 2) % 4;
}

export function positionKey(x: number, y: number): string {
    return `${x},${y}`;
}

export function getTilesByPosition(board: CarcassonneTile[]): Map<string, CarcassonneTile> {
    return new Map(board.map(tile => [positionKey(tile.x, tile.y), tile]));
}

export function canPlaceTile(board: CarcassonneTile[], templateId: string, x: number, y: number, rotation: number): boolean {
    const template = getTileTemplate(templateId);
    if (!template) {
        return false;
    }
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(rotation) || rotation < 0 || rotation > 3) {
        return false;
    }

    const tilesByPosition = getTilesByPosition(board);
    if (tilesByPosition.has(positionKey(x, y))) {
        return false;
    }

    let hasNeighbor = false;

    for (let direction = 0; direction < edgeDirections.length; direction++) {
        const offset = edgeDirections[direction]!;
        const neighbor = tilesByPosition.get(positionKey(x + offset.x, y + offset.y));
        if (!neighbor) {
            continue;
        }
        hasNeighbor = true;

        const neighborTemplate = getTileTemplate(neighbor.templateId);
        if (!neighborTemplate) {
            return false;
        }

        const ownEdge = getPlacedEdgeType(template, rotation, direction);
        const neighborEdge = getPlacedEdgeType(neighborTemplate, neighbor.rotation, getOppositeDirection(direction));
        if (ownEdge !== neighborEdge) {
            return false;
        }
    }

    return hasNeighbor;
}

export function getEmptyAdjacentCells(board: CarcassonneTile[]): { x: number, y: number }[] {
    const occupied = new Set(board.map(tile => positionKey(tile.x, tile.y)));
    const cells = new Map<string, { x: number, y: number }>();

    for (const tile of board) {
        for (const offset of edgeDirections) {
            const x = tile.x + offset.x;
            const y = tile.y + offset.y;
            const key = positionKey(x, y);
            if (occupied.has(key)) {
                continue;
            }
            cells.set(key, { x, y });
        }
    }

    return [...cells.values()];
}

export function hasLegalPlacement(board: CarcassonneTile[], templateId: string): boolean {
    for (const cell of getEmptyAdjacentCells(board)) {
        for (let rotation = 0; rotation < 4; rotation++) {
            if (canPlaceTile(board, templateId, cell.x, cell.y, rotation)) {
                return true;
            }
        }
    }
    return false;
}

export function getFeatureGroupsForTemplate(template: CarcassonneTileTemplate, featureType: CarcassonneFeatureType): number[][] {
    if (featureType === 'city') {
        return template.cityGroups;
    }
    if (featureType === 'road') {
        return template.roadGroups;
    }
    if (featureType === 'field') {
        return template.fieldSides;
    }
    return template.cloister ? [[0]] : [];
}

export function validateTileTemplates(): string[] {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    for (const template of tileTemplates) {
        if (seenIds.has(template.id)) {
            errors.push(`Duplicate tile id: ${template.id}`);
        }
        seenIds.add(template.id);

        if (template.count < 1) {
            errors.push(`Tile ${template.id} must have a positive count`);
        }

        const coverage: Record<'city' | 'road', number[]> = { city: [], road: [] };
        for (const [type, groups] of [
            ['city', template.cityGroups],
            ['road', template.roadGroups]
        ] as const) {
            for (const group of groups) {
                for (const edge of group) {
                    if (edge < 0 || edge > 3) {
                        errors.push(`Tile ${template.id} has invalid ${type} edge ${edge}`);
                        continue;
                    }
                    coverage[type].push(edge);
                }
            }
        }

        for (const type of ['city', 'road'] as const) {
            const expectedEdges = template.edges
                .map((edge, index) => edge === type ? index : -1)
                .filter(index => index >= 0);
            const actualEdges = coverage[type].sort((a, b) => a - b);
            if (expectedEdges.join(',') !== actualEdges.join(',')) {
                errors.push(`Tile ${template.id} has mismatched ${type} edges`);
            }
        }

        const fieldSideCounts = new Map<number, number>();
        template.fieldSides.forEach((group, groupIndex) => {
            if (group.length === 0) {
                errors.push(`Tile ${template.id} has an empty field group ${groupIndex}`);
            }
            for (const side of group) {
                if (!Number.isInteger(side) || side < 0 || side > 7) {
                    errors.push(`Tile ${template.id} has invalid field side ${side}`);
                    continue;
                }
                fieldSideCounts.set(side, (fieldSideCounts.get(side) ?? 0) + 1);
            }
        });

        const expectedFieldSides = new Set<number>();
        for (const [edgeIndex, edgeType] of template.edges.entries()) {
            if (edgeType === 'city') {
                continue;
            }
            for (const side of fieldSidesByEdge[edgeIndex]!) {
                expectedFieldSides.add(side);
            }
        }

        for (const side of expectedFieldSides) {
            const count = fieldSideCounts.get(side) ?? 0;
            if (count !== 1) {
                errors.push(`Tile ${template.id} field side ${side} must be covered exactly once (found ${count})`);
            }
        }
        for (const side of fieldSideCounts.keys()) {
            if (!expectedFieldSides.has(side)) {
                errors.push(`Tile ${template.id} field side ${side} lies on a city edge`);
            }
        }

        for (const [edgeIndex, edgeType] of template.edges.entries()) {
            if (edgeType !== 'field') {
                continue;
            }
            const [firstSide, secondSide] = fieldSidesByEdge[edgeIndex]!;
            const firstGroup = template.fieldSides.findIndex(group => group.includes(firstSide));
            const secondGroup = template.fieldSides.findIndex(group => group.includes(secondSide));
            if (firstGroup < 0 || secondGroup < 0 || firstGroup !== secondGroup) {
                errors.push(`Tile ${template.id} field edge ${edgeIndex} must belong to a single field group`);
            }
        }

        if (template.cityPennants && template.cityPennants.length !== template.cityGroups.length) {
            errors.push(`Tile ${template.id} has mismatched city pennants`);
        }
    }

    return errors;
}
