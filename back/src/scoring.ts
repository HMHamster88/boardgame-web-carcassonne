import type {
    CarcassonneFeatureType,
    CarcassonneFollower,
    CarcassonneFollowerType,
    CarcassonnePrivateGameState,
    CarcassonnePublicGameState,
    CarcassonneTile
} from './types/types';
import {
    edgeDirections,
    fieldSidesByEdge,
    followerTypeByFeature,
    getOppositeDirection,
    getOriginalEdgeIndex,
    getPlacedEdgeDirection,
    getPlacedEdgeType,
    getPlacedFieldSide,
    getOriginalFieldSide,
    getTileTemplate,
    getTilesByPosition,
    oppositeFieldSide,
    positionKey,
    surroundingOffsets
} from './tiles';

export interface CarcassonneFeatureNode {
    key: string;
    type: CarcassonneFeatureType;
    tile: CarcassonneTile;
    segmentIndex: number;
    edges: number[];
    pennants: number;
}

export interface CarcassonneFeatureGroup {
    root: string;
    type: CarcassonneFeatureType;
    nodes: CarcassonneFeatureNode[];
    complete: boolean;
}

export interface CarcassonneFeatureGraph {
    nodesByKey: Map<string, CarcassonneFeatureNode>;
    features: Map<string, CarcassonneFeatureGroup>;
    nodeToFeature: Map<string, string>;
    fieldFeatureRootsByCityRoot: Map<string, Set<string>>;
}

class DisjointSet {
    private parents = new Map<string, string>();

    add(key: string): void {
        if (!this.parents.has(key)) {
            this.parents.set(key, key);
        }
    }

    find(key: string): string {
        const parent = this.parents.get(key);
        if (!parent || parent === key) {
            return key;
        }
        const root = this.find(parent);
        this.parents.set(key, root);
        return root;
    }

    union(first: string, second: string): void {
        const firstRoot = this.find(first);
        const secondRoot = this.find(second);
        if (firstRoot !== secondRoot) {
            this.parents.set(secondRoot, firstRoot);
        }
    }
}

export function featureNodeKey(tileId: string, featureType: CarcassonneFeatureType, segmentIndex: number): string {
    return `${tileId}:${featureType}:${segmentIndex}`;
}

export function followerNodeKey(follower: CarcassonneFollower): string {
    return featureNodeKey(follower.tileId, follower.featureType, follower.segmentIndex);
}

function getCityPennants(feature: CarcassonneFeatureGroup): number {
    return feature.nodes.reduce((sum, node) => sum + node.pennants, 0);
}

function getDistinctTileCount(feature: CarcassonneFeatureGroup): number {
    return new Set(feature.nodes.map(node => node.tile.id)).size;
}

function isFeatureComplete(type: CarcassonneFeatureType, nodes: CarcassonneFeatureNode[], tilesByPosition: Map<string, CarcassonneTile>): boolean {
    if (type === 'field') {
        return false;
    }

    if (type === 'cloister') {
        const tile = nodes[0]?.tile;
        if (!tile) {
            return false;
        }
        return surroundingOffsets.every(offset =>
            tilesByPosition.has(positionKey(tile.x + offset.x, tile.y + offset.y))
        );
    }

    return nodes.every(node => {
        const template = getTileTemplate(node.tile.templateId);
        if (!template) {
            return false;
        }
        return node.edges.every(originalEdge => {
            const direction = getPlacedEdgeDirection(originalEdge, node.tile.rotation);
            const offset = edgeDirections[direction]!;
            const neighbor = tilesByPosition.get(positionKey(node.tile.x + offset.x, node.tile.y + offset.y));
            if (!neighbor) {
                return false;
            }
            const neighborTemplate = getTileTemplate(neighbor.templateId);
            if (!neighborTemplate) {
                return false;
            }
            return getPlacedEdgeType(neighborTemplate, neighbor.rotation, getOppositeDirection(direction)) === type;
        });
    });
}

export function buildFeatureGraph(board: CarcassonneTile[]): CarcassonneFeatureGraph {
    const nodesByKey = new Map<string, CarcassonneFeatureNode>();
    const edgeNodeKeys = new Map<string, string>();
    const fieldSideNodeKeys = new Map<string, string>();
    const disjointSet = new DisjointSet();

    const addNode = (tile: CarcassonneTile, type: CarcassonneFeatureType, segmentIndex: number, edges: number[], pennants: number): void => {
        const key = featureNodeKey(tile.id, type, segmentIndex);
        nodesByKey.set(key, { key, type, tile, segmentIndex, edges, pennants });
        disjointSet.add(key);
        if (type === 'city' || type === 'road') {
            for (const edge of edges) {
                edgeNodeKeys.set(`${tile.id}:${type}:${edge}`, key);
            }
        }
    };

    for (const tile of board) {
        const template = getTileTemplate(tile.templateId);
        if (!template) {
            continue;
        }

        template.cityGroups.forEach((edges, index) => {
            addNode(tile, 'city', index, edges, template.cityPennants?.[index] ?? 0);
        });
        template.roadGroups.forEach((edges, index) => {
            addNode(tile, 'road', index, edges, 0);
        });
        template.fieldSides.forEach((sides, index) => {
            const edges = [...new Set(sides.map(side => Math.floor(side / 2)))];
            addNode(tile, 'field', index, edges, 0);
            const nodeKey = featureNodeKey(tile.id, 'field', index);
            for (const side of sides) {
                fieldSideNodeKeys.set(`${tile.id}:${side}`, nodeKey);
            }
        });
        if (template.cloister) {
            addNode(tile, 'cloister', 0, [], 0);
        }
    }

    const tilesByPosition = getTilesByPosition(board);

    for (const tile of board) {
        const template = getTileTemplate(tile.templateId);
        if (!template) {
            continue;
        }

        for (let direction = 0; direction < edgeDirections.length; direction++) {
            const offset = edgeDirections[direction]!;
            const neighbor = tilesByPosition.get(positionKey(tile.x + offset.x, tile.y + offset.y));
            if (!neighbor) {
                continue;
            }

            const neighborTemplate = getTileTemplate(neighbor.templateId);
            if (!neighborTemplate) {
                continue;
            }

            const type = getPlacedEdgeType(template, tile.rotation, direction);
            const neighborDirection = getOppositeDirection(direction);
            const neighborType = getPlacedEdgeType(neighborTemplate, neighbor.rotation, neighborDirection);
            if (type !== neighborType) {
                continue;
            }

            if (type === 'city' || type === 'road') {
                const ownNodeKey = edgeNodeKeys.get(`${tile.id}:${type}:${getOriginalEdgeIndex(direction, tile.rotation)}`);
                const neighborNodeKey = edgeNodeKeys.get(`${neighbor.id}:${type}:${getOriginalEdgeIndex(neighborDirection, neighbor.rotation)}`);
                if (ownNodeKey && neighborNodeKey) {
                    disjointSet.union(ownNodeKey, neighborNodeKey);
                }
            }

            if (type === 'field' || type === 'road') {
                const originalEdge = getOriginalEdgeIndex(direction, tile.rotation);
                for (const side of fieldSidesByEdge[originalEdge]!) {
                    const placedSide = getPlacedFieldSide(side, tile.rotation);
                    const neighborSide = getOriginalFieldSide(oppositeFieldSide[placedSide]!, neighbor.rotation);
                    const ownFieldNodeKey = fieldSideNodeKeys.get(`${tile.id}:${side}`);
                    const neighborFieldNodeKey = fieldSideNodeKeys.get(`${neighbor.id}:${neighborSide}`);
                    if (ownFieldNodeKey && neighborFieldNodeKey) {
                        disjointSet.union(ownFieldNodeKey, neighborFieldNodeKey);
                    }
                }
            }
        }
    }

    const nodesByRoot = new Map<string, CarcassonneFeatureNode[]>();
    for (const node of nodesByKey.values()) {
        const root = disjointSet.find(node.key);
        const nodes = nodesByRoot.get(root);
        if (nodes) {
            nodes.push(node);
        } else {
            nodesByRoot.set(root, [node]);
        }
    }

    const features = new Map<string, CarcassonneFeatureGroup>();
    const nodeToFeature = new Map<string, string>();

    for (const [root, nodes] of nodesByRoot) {
        const type = nodes[0]!.type;
        features.set(root, {
            root,
            type,
            nodes,
            complete: isFeatureComplete(type, nodes, tilesByPosition)
        });
        for (const node of nodes) {
            nodeToFeature.set(node.key, root);
        }
    }

    const fieldFeatureRootsByCityRoot = new Map<string, Set<string>>();

    for (const tile of board) {
        const template = getTileTemplate(tile.templateId);
        if (!template || template.cityGroups.length === 0 || template.fieldSides.length === 0) {
            continue;
        }

        for (let fieldIndex = 0; fieldIndex < template.fieldSides.length; fieldIndex++) {
            const fieldRoot = disjointSet.find(featureNodeKey(tile.id, 'field', fieldIndex));
            for (let cityIndex = 0; cityIndex < template.cityGroups.length; cityIndex++) {
                const cityRoot = disjointSet.find(featureNodeKey(tile.id, 'city', cityIndex));
                let fieldRoots = fieldFeatureRootsByCityRoot.get(cityRoot);
                if (!fieldRoots) {
                    fieldRoots = new Set<string>();
                    fieldFeatureRootsByCityRoot.set(cityRoot, fieldRoots);
                }
                fieldRoots.add(fieldRoot);
            }
        }
    }

    return { nodesByKey, features, nodeToFeature, fieldFeatureRootsByCityRoot };
}

function getFollowersOnFeature(followers: CarcassonneFollower[], feature: CarcassonneFeatureGroup, followerType: CarcassonneFollowerType): CarcassonneFollower[] {
    const nodeKeys = new Set(feature.nodes.map(node => node.key));
    return followers.filter(follower =>
        follower.type === followerType && nodeKeys.has(followerNodeKey(follower))
    );
}

function getMajorityPlayers(followers: CarcassonneFollower[]): string[] {
    const counts = new Map<string, number>();
    for (const follower of followers) {
        counts.set(follower.playerId, (counts.get(follower.playerId) ?? 0) + 1);
    }
    if (counts.size === 0) {
        return [];
    }
    const maxCount = Math.max(...counts.values());
    return [...counts.entries()]
        .filter(([, count]) => count === maxCount)
        .map(([playerId]) => playerId);
}

function awardPoints(publicState: CarcassonnePublicGameState, playerIds: string[], points: number): void {
    for (const playerId of playerIds) {
        const playerState = publicState.playersStates?.find(state => state.playerId === playerId);
        if (playerState) {
            playerState.points += points;
        }
    }
}

function returnFollowersToSupply(privateState: CarcassonnePrivateGameState, publicState: CarcassonnePublicGameState, followers: CarcassonneFollower[]): void {
    if (followers.length === 0) {
        return;
    }

    const returned = new Set(followers);
    publicState.followers = publicState.followers.filter(follower => !returned.has(follower));

    for (const follower of followers) {
        const playerState = privateState.playersStates.find(state => state.playerId === follower.playerId);
        if (playerState) {
            playerState.followersInSupply++;
        }
    }
}

function getCompletedFeaturePoints(feature: CarcassonneFeatureGroup): number {
    if (feature.type === 'cloister') {
        return 9;
    }
    if (feature.type === 'city') {
        return getDistinctTileCount(feature) * 2 + getCityPennants(feature) * 2;
    }
    if (feature.type === 'road') {
        return getDistinctTileCount(feature);
    }
    return 0;
}

function countSurroundingPlacedTiles(tile: CarcassonneTile, tilesByPosition: Map<string, CarcassonneTile>): number {
    return surroundingOffsets
        .filter(offset => tilesByPosition.has(positionKey(tile.x + offset.x, tile.y + offset.y)))
        .length;
}

export function scoreCompletedFeatures(privateState: CarcassonnePrivateGameState, publicState: CarcassonnePublicGameState): void {
    const featureGraph = buildFeatureGraph(publicState.board);

    for (const feature of featureGraph.features.values()) {
        if (!feature.complete || feature.type === 'field') {
            continue;
        }

        const followerType = followerTypeByFeature[feature.type];
        const followers = getFollowersOnFeature(publicState.followers, feature, followerType);
        if (followers.length === 0) {
            continue;
        }

        awardPoints(publicState, getMajorityPlayers(followers), getCompletedFeaturePoints(feature));
        returnFollowersToSupply(privateState, publicState, followers);
    }
}

export function scoreFinalFeatures(publicState: CarcassonnePublicGameState): void {
    const featureGraph = buildFeatureGraph(publicState.board);
    const tilesByPosition = getTilesByPosition(publicState.board);

    for (const feature of featureGraph.features.values()) {
        if (feature.type === 'field') {
            continue;
        }

        const followerType = followerTypeByFeature[feature.type];
        const followers = getFollowersOnFeature(publicState.followers, feature, followerType);
        if (followers.length === 0) {
            continue;
        }

        let points = 0;

        if (feature.type === 'city') {
            if (feature.complete) {
                continue;
            }
            points = feature.nodes.length + getCityPennants(feature);
        } else if (feature.type === 'road') {
            if (feature.complete) {
                continue;
            }
            points = getDistinctTileCount(feature);
        } else if (feature.type === 'cloister') {
            if (feature.complete) {
                continue;
            }
            const tile = feature.nodes[0]?.tile;
            if (!tile) {
                continue;
            }
            points = 1 + countSurroundingPlacedTiles(tile, tilesByPosition);
        }

        awardPoints(publicState, getMajorityPlayers(followers), points);
    }

    for (const [cityRoot, fieldRoots] of featureGraph.fieldFeatureRootsByCityRoot) {
        const city = featureGraph.features.get(cityRoot);
        if (!city || city.type !== 'city' || !city.complete) {
            continue;
        }

        for (const fieldRoot of fieldRoots) {
            const field = featureGraph.features.get(fieldRoot);
            if (!field || field.type !== 'field') {
                continue;
            }

            const farmers = getFollowersOnFeature(publicState.followers, field, 'farmer');
            if (farmers.length === 0) {
                continue;
            }

            awardPoints(publicState, getMajorityPlayers(farmers), 3);
        }
    }
}

export function getWinnerIds(publicState: CarcassonnePublicGameState): string[] {
    const playersStates = publicState.playersStates ?? [];
    if (playersStates.length === 0) {
        return [];
    }

    const maxPoints = Math.max(...playersStates.map(state => state.points));
    return playersStates
        .filter(state => state.points === maxPoints)
        .map(state => state.playerId);
}
