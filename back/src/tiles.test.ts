import { describe, expect, it } from 'vitest';
import {
    canPlaceTile,
    createTileDeck,
    getFeatureGroupsForTemplate,
    getPlacedEdgeType,
    getTileTemplate,
    hasLegalPlacement,
    tileTemplates,
    validateTileTemplates
} from './tiles';
import type { CarcassonneTile } from './types/types';

function placedTile(id: string, templateId: string, x: number, y: number, rotation = 0): CarcassonneTile {
    return { id, templateId, x, y, rotation };
}

describe('tile templates', () => {
    it('cover every edge exactly once and use valid counts', () => {
        expect(validateTileTemplates()).toEqual([]);
    });

    it('build a seventy-one tile deck plus the starting tile', () => {
        const deck = createTileDeck();
        expect(deck).toHaveLength(71);
        expect(tileTemplates.filter(template => template.starting)).toHaveLength(1);
    });

    it('define a pennant count for every city group when pennants are used', () => {
        for (const template of tileTemplates) {
            if (template.cityPennants) {
                expect(template.cityPennants).toHaveLength(template.cityGroups.length);
            }
        }
    });

    it('splits fields at roads and cities', () => {
        const fieldGroupCount = (templateId: string) => {
            const template = getTileTemplate(templateId);
            expect(template).toBeDefined();
            return getFeatureGroupsForTemplate(template!, 'field');
        };

        expect(fieldGroupCount('road-straight')).toHaveLength(2);
        expect(fieldGroupCount('road-curve')).toHaveLength(2);
        expect(fieldGroupCount('road-t')).toHaveLength(3);
        expect(fieldGroupCount('road-cross')).toHaveLength(4);
        expect(fieldGroupCount('cloister-road')).toHaveLength(1);
        expect(fieldGroupCount('city-three-road')).toHaveLength(2);
        expect(fieldGroupCount('city-cap-road-t')).toHaveLength(3);
        expect(fieldGroupCount('city-four')).toHaveLength(0);
    });

    it('matches the official base game distribution', () => {
        const total = tileTemplates.reduce((sum, template) => sum + template.count, 0);
        expect(total).toBe(72);
        expect(tileTemplates).toHaveLength(25);

        // The starting tile is one of the four "city cap + straight road" tiles, so it is
        // kept as its own template and the remaining three are in city-cap-road-through.
        const startTiles = tileTemplates
            .filter(template => template.starting)
            .reduce((sum, template) => sum + template.count, 0);
        const designCounts = tileTemplates
            .filter(template => !template.starting)
            .map(template => template.count)
            .sort((a, b) => a - b);
        expect(startTiles).toBe(1);
        expect(designCounts).toEqual([
            1, 1, 1, 1, 1,
            2, 2, 2, 2, 2, 2,
            3, 3, 3, 3, 3, 3, 3, 3,
            4, 4,
            5,
            8,
            9
        ]);
    });
});

describe('tile rotation', () => {
    it('rotates edges clockwise', () => {
        const template = getTileTemplate('starting-tile')!;

        expect(getPlacedEdgeType(template, 0, 0)).toBe('city');
        expect(getPlacedEdgeType(template, 0, 1)).toBe('road');
        expect(getPlacedEdgeType(template, 0, 2)).toBe('field');
        expect(getPlacedEdgeType(template, 1, 0)).toBe('road');
        expect(getPlacedEdgeType(template, 1, 1)).toBe('city');
        expect(getPlacedEdgeType(template, 1, 2)).toBe('road');
    });
});

describe('placing tiles', () => {
    // starting tile: city north, roads east and west, field south
    const board = [placedTile('start', 'starting-tile', 0, 0)];

    it('accepts a matching road edge', () => {
        expect(canPlaceTile(board, 'road-straight', 1, 0, 1)).toBe(true);
    });

    it('rejects a mismatched city edge', () => {
        expect(canPlaceTile(board, 'city-cap', 0, 1, 0)).toBe(false);
    });

    it('accepts a rotated city edge', () => {
        expect(canPlaceTile(board, 'city-cap', 0, -1, 2)).toBe(true);
    });

    it('rejects tiles that only touch diagonally', () => {
        expect(canPlaceTile(board, 'cloister', 1, 1, 0)).toBe(false);
    });

    it('finds at least one legal placement for every template', () => {
        for (const template of tileTemplates) {
            if (template.starting) {
                continue;
            }
            expect(hasLegalPlacement(board, template.id)).toBe(true);
        }
    });
});
