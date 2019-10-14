import { Vector, Gradient } from '../optim';
import { Node } from './elements';
import { Storage, StructuredStorage } from './storage';
import { nudgePair } from './gradients';

/**
 * Generates (1) attractive forces encouraging connected nodes to be no farther than their ideal
 * distance, and (2) repulsive forces between unconnected nodes encouraging them to be no closer
 * than their ideal distance. The ideal distance is the shortest path length scaled by the ideal
 * length. There are no forces generated between nodes of different connected components (with
 * undefined shortest path length).
 * @param storage 
 * @param idealLength
 *     Ideal length of an edge between nodes, either as a constant or function of the nodes. The
 *     function will only be called between nodes with a non-undefined `shortestPath`.
 * @param shortestPath 
 */
export function* generateSpringForces(
    storage: StructuredStorage,
    idealLength: number | ((u: Node, v: Node) => number),
    shortestPath: (u: Node, v: Node) => number | undefined,
    config: Partial<{ maxAttraction: number }> = {},
) {
    const { maxAttraction = Infinity } = config;
    const visited = new Set();
    for(let u of storage.nodes()) {
        visited.add(u);
        const siblings = storage.siblings(u);
        for(let v of storage.nodes()) {
            if(visited.has(v)) continue;
            if(u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Forces act on only nodes that are not direct ancestors/descendants.
            const uvPath = shortestPath(u, v);
            if(uvPath === undefined) continue; // Ignore disconnected components.
            let idealDistance = (typeof idealLength === "function") ? uvPath * idealLength(u, v) : uvPath * idealLength;
            
            const axis = (new Vector()).subVectors(v.center, u.center);
            const actualDistance = axis.length() > 0 ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate())) : 0;
            
            if(storage.existsEdge(u, v, true) && actualDistance > idealDistance && !storage.hasAncestor(u, v) && !storage.hasAncestor(v, u)) {
                // Attractive force between edges if too far.
                const delta = Math.min(actualDistance - idealDistance, maxAttraction);
                yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
            } else if(actualDistance < idealDistance && siblings.has(v)) {
                // Repulsive force between node pairs if too close.
                const delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
            }
        }
    }
}

/**
 * Generates attractive forces encouraging edges to be no fthe ideal length and repulsive forces between
 * unconnected nodes proportional to their shortest path length. There are no forces generated
 * between forces from different connected components (with undefined shortest path length).
 * @param storage 
 * @param idealLength
 *     Ideal length of an edge between nodes, either as a constant or function of the nodes. The
 *     function will only be called between nodes with a direct edge.
 * @param shortestPath 
 */
export function* generateSpringElectricalForces(
    storage: StructuredStorage,
    idealLength: number | ((u: Node, v: Node) => number),
    edgeStrength: number,
    repulsiveStrength: number,
) {
    const visited = new Set();
    for(let u of storage.nodes()) {
        visited.add(u);
        for(let v of storage.nodes()) {
            if(visited.has(v)) continue;
            if(u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Forces act on only nodes that are not direct ancestors/descendants.
            if(storage.hasAncestor(u, v) || storage.hasAncestor(v, u)) continue;

            if(typeof idealLength === "function") idealLength = idealLength(u, v);
            const axis = (new Vector()).subVectors(v.center, u.center);
            const actualDistance = axis.length() > 0 ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate())) : 1;
            if(storage.existsEdge(u, v, true)) {
                // Restoring force between edges to ideal length.
                const delta = edgeStrength * (actualDistance - idealLength);
                yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
            } else {
                // Repulsive force between unconnected node pairs.
                const delta = repulsiveStrength * Math.pow(actualDistance, -1);
                yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
            }
        }
    }
}

/**
 * Generates forces that pull children nodes towards the parent's center.
 * @param storage 
 * @param strength 
 */
export function* generateCompactnessForces(
    storage: Storage,
    strength: number,
) {
    for(let u of storage.nodes()) {
        for(let child of u.children) {
            yield nudgePair(u.center, child.center, -strength*(u.center.distanceTo(child.center)));
        };
    }
}

/**
 * Constrain `u`'s children to be contained within itself, expansing its boundaries if necessary.
 * @param u
 *      Node with children to constrain.
 * @param padding
 *      Spacing inside the node's boundary.
 */
export function* generateNodeChildrenConstraints(
    u: Node,
    padding: number = 0,
) {
    if (u.children.length > 0) {
        yield u.shape.constrainShapesWithin(u.children.map((child) => child.shape), padding);
    }
}