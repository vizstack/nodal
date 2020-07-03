import { Vector, Gradient } from '../optim';
import { Node } from './elements';
import { Storage, StructuredStorage } from './storage';
import { nudgePair, nudgePoint } from './gradients';

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
    // TODO: Replace idealLength and shortestPath, with idealLength: (u, v) => number | undefined.
    const visited = new Set();
    for (let u of storage.nodes()) {
        visited.add(u);
        const siblings = storage.siblings(u);
        for (let v of storage.nodes()) {
            if (visited.has(v)) continue;
            if (u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Forces act on only nodes that are not direct ancestors/descendants.
            const uvPath = shortestPath(u, v);
            if (uvPath === undefined) continue; // Ignore disconnected components.
            let idealDistance =
                typeof idealLength === 'function'
                    ? uvPath * idealLength(u, v)
                    : uvPath * idealLength;

            const axis = new Vector().subVectors(v.center, u.center);
            const actualDistance =
                axis.length() > 0
                    ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate()))
                    : 0;

            if (
                actualDistance > idealDistance &&
                storage.existsEdge(u, v, true) &&
                !storage.hasAncestorOrDescendant(u, v)
            ) {
                // Attractive force between nodes with edges if too far. If one of them
                // contains the other, no force is exerted (between their centers).
                const delta = Math.min(actualDistance - idealDistance, maxAttraction);
                yield nudgePair(u.center, v.center, [-wu * delta, -wv * delta]);
            } else if (actualDistance < idealDistance && siblings.has(v)) {
                // Repulsive force between node pairs if too close. Only siblings can repel each
                // other, else parents will repel their children, and children will be repelled by
                // the rest of graph rather than being isolated by the parent.
                const delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                yield nudgePair(u.center, v.center, [wu * delta, wv * delta]);
            }
        }
    }
}

export function* generateSpringForcesCompound(
    storage: StructuredStorage,
    idealLength: number | ((u: Node, v: Node) => number),
    shortestPath: (u: Node, v: Node) => number | undefined,
    config: Partial<{ maxAttraction: number }> = {},
) {
    const { maxAttraction = Infinity } = config;
    // TODO: Replace idealLength and shortestPath, with idealLength: (u, v) => number | undefined.

    // Repulsive force between node pairs if too close. Only siblings can repel each
    // other, else parents will repel their children, and children will be repelled by
    // the rest of graph rather than being isolated by the parent.
    const visited = new Set();
    for (let u of storage.nodes()) {
        visited.add(u);
        for (let v of storage.siblings(u)) {
            if (visited.has(v)) continue;
            if (u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            const uvPath = shortestPath(u, v);
            if (uvPath === undefined) continue; // Ignore disconnected components.
            let idealDistance =
                typeof idealLength === 'function'
                    ? uvPath * idealLength(u, v)
                    : uvPath * idealLength;
            const axis = new Vector().subVectors(v.center, u.center);
            const actualDistance =
                axis.length() > 0
                    ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate()))
                    : 0;

            if (actualDistance < idealDistance) {
                const delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                yield nudgePair(u.center, v.center, [wu * delta, wv * delta]);
            }
        }
    }

    // Attractive force between nodes with edges (directly or indirectly between descendants) if
    // too far. If one of them contains the other, no force between their centers is exerted.
    for (let e of storage.edges()) {
        const gda = storage.greatestDifferentAncestor(e.source.node, e.target.node);
        if (gda === undefined) continue;
        const [u, v] = gda;

        if (u.fixed && v.fixed) continue;
        const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

        // TODO: Is this right to ignore? What is the meaning of shortestPath?
        const uvPath = shortestPath(u, v);
        if (uvPath === undefined) continue; // Ignore disconnected components.
        let idealDistance = typeof idealLength === 'function' ? idealLength(u, v) : idealLength;
        const axis = new Vector().subVectors(v.center, u.center);
        const actualDistance =
            axis.length() > 0
                ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate()))
                : 0;

        if (actualDistance > idealDistance) {
            const delta = Math.min(actualDistance - idealDistance, maxAttraction);
            yield nudgePair(u.center, v.center, [-wu * delta, -wv * delta]);
        }
    }
}

export function* generateSpringForcesMajorization(
    storage: StructuredStorage,
    idealLength: number | ((u: Node, v: Node) => number),
    shortestPath: (u: Node, v: Node) => number | undefined,
    config: Partial<{ maxAttraction: number }> = {},
) {
    const { maxAttraction = Infinity } = config;
    // TODO: Replace idealLength and shortestPath, with idealLength: (u, v) => number | undefined.
    const visited = new Set<Node>();
    const grads = new Array<Gradient>(storage.nodes().length);
    const weights = new Array<number>(storage.nodes().length).fill(0);

    for (let [uidx, u] of storage.nodes().entries()) {
        visited.add(u);
        const siblings = storage.siblings(u);
        for (let [vidx, v] of storage.nodes().entries()) {
            if (visited.has(v)) continue;
            if (u.fixed && v.fixed) continue;

            // Forces act on only nodes that are not direct ancestors/descendants.
            const pathLength = shortestPath(u, v);
            if (pathLength === undefined) continue; // Ignore disconnected components.
            let idealDistance =
                typeof idealLength === 'function'
                    ? pathLength * idealLength(u, v)
                    : pathLength * idealLength;
            const weight = Math.pow(idealDistance, -2);
            // A node should experience 0 force if fixed, but no change if its partner is fixed.
            const [uweight, vweight] = [u.fixed ? 0 : weight, v.fixed ? 0 : weight];

            const axis = new Vector().subVectors(v.center, u.center);
            const actualDistance =
                axis.length() > 0
                    ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate()))
                    : 0;

            // Attractive force between nodes with edges if too far. If one of them
            // contains the other, no force is exerted (between their centers).
            const hasAttractiveForce =
                actualDistance > idealDistance &&
                storage.existsEdge(u, v, true) &&
                !storage.hasAncestorOrDescendant(u, v);

            // Repulsive force between node pairs if too close. Only siblings can repel each
            // other, else parents will repel their children, and children will be repelled by
            // the rest of graph rather than being isolated by the parent.
            const hasRepulsiveForce = actualDistance < idealDistance && siblings.has(v);

            if (hasAttractiveForce || hasRepulsiveForce) {
                const delta = idealDistance - actualDistance;
                const [ugrad, vgrad] = nudgePair(u.center, v.center, [
                    uweight * delta,
                    vweight * delta,
                ]);

                // Update weighted gradient contribution between u and v.
                weights[uidx] += uweight;
                if (grads[uidx] === undefined) {
                    grads[uidx] = ugrad;
                } else {
                    grads[uidx].grad.add(ugrad.grad);
                }
                weights[vidx] += vweight;
                if (grads[vidx] === undefined) {
                    grads[vidx] = vgrad;
                } else {
                    grads[vidx].grad.add(vgrad.grad);
                }
            }
        }

        // Since no more updates to gradients of u, yield now after taking weighted average.
        if (weights[uidx] > 1e-3) {
            grads[uidx].grad.divideScalar(weights[uidx]);
            yield [grads[uidx]];
        }
    }
}

class SymmetricMatrix<T> {
    private data: Array<T>;
    constructor(private size: number, creator: (i: number, j: number) => T) {
        this.data = new Array((size * size + size) / 2);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j <= i; j++) {
                this.set(i, j, creator(i, j));
            }
        }
    }

    get(i: number, j: number): T {
        const [x, y] = i >= j ? [i, j] : [j, i];
        return this.data[(x * (x + 1)) / 2 + y];
    }

    set(i: number, j: number, value: T) {
        const [x, y] = i >= j ? [i, j] : [j, i];
        this.data[(x * (x + 1)) / 2 + y] = value;
    }

    forEach(callback: (value: T, indices: [number, number]) => void) {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j <= i; j++) {
                callback(this.get(i, j), [i, j]);
            }
        }
    }
}

export function* generateSpringForcesNewton(
    storage: StructuredStorage,
    idealLength: number | ((u: Node, v: Node) => number),
    shortestPath: (u: Node, v: Node) => number | undefined,
    config: Partial<{ maxAttraction: number }> = {},
) {
    const { maxAttraction = Infinity } = config;
    // TODO: Replace idealLength and shortestPath, with idealLength: (u, v) => number | undefined.
    const visited = new Set<Node>();
    const n = storage.nodes().length;
    const grads = new Array<Gradient>(n);
    const weights = new Array<number>(n).fill(0);
    const hess = new SymmetricMatrix<Vector>(n, () => new Vector(0, 0));

    // const grads = [];
    for (let [uidx, u] of storage.nodes().entries()) {
        visited.add(u);
        const siblings = storage.siblings(u);
        for (let [vidx, v] of storage.nodes().entries()) {
            if (visited.has(v)) continue;
            if (u.fixed && v.fixed) continue;

            // Forces act on only nodes that are not direct ancestors/descendants.
            const pathLength = shortestPath(u, v);
            if (pathLength === undefined) continue; // Ignore disconnected components.
            let idealDistance =
                typeof idealLength === 'function'
                    ? pathLength * idealLength(u, v)
                    : pathLength * idealLength;
            const weight = Math.pow(idealDistance, -2);
            // A node should experience 0 force if fixed, but no change if its partner is fixed.
            const [uweight, vweight] = [u.fixed ? 0 : weight, v.fixed ? 0 : weight];

            let axis = new Vector().subVectors(v.center, u.center);
            if (axis.length() === 0) axis = new Vector(1, 1);
            // const actualDistance = u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate()));  // So denominator does not zero out.
            const actualDistance = axis.length();

            // Attractive force between nodes with edges if too far. If one of them
            // contains the other, no force is exerted (between their centers).
            const hasAttractiveForce =
                actualDistance > idealDistance &&
                storage.existsEdge(u, v, true) &&
                !storage.hasAncestorOrDescendant(u, v);

            // Repulsive force between node pairs if too close. Only siblings can repel each
            // other, else parents will repel their children, and children will be repelled by
            // the rest of graph rather than being isolated by the parent.
            const hasRepulsiveForce = actualDistance < idealDistance && siblings.has(v);

            if (hasAttractiveForce || hasRepulsiveForce) {
                const delta = 2 * (idealDistance - actualDistance);
                const [ugrad, vgrad] = nudgePair(u.center, v.center, [
                    uweight * delta,
                    vweight * delta,
                ]);

                const diff = new Vector().subVectors(
                    u.shape.boundary(axis),
                    v.shape.boundary(axis.negate()),
                );
                // const diff = axis.clone();
                const hessuv = diff
                    .multiply(diff)
                    .multiplyScalar(idealDistance / Math.pow(actualDistance, 3))
                    .addScalar(1 - idealDistance / actualDistance)
                    .multiplyScalar(-2 * weight);
                hess.get(uidx, vidx).copy(hessuv);
                hess.get(uidx, uidx).sub(hessuv);
                hess.get(vidx, vidx).sub(hessuv);

                // Update weighted gradient contribution between u and v.
                weights[uidx] += uweight;
                if (grads[uidx] === undefined) {
                    grads[uidx] = ugrad;
                } else {
                    grads[uidx].grad.add(ugrad.grad);
                }
                weights[vidx] += vweight;
                if (grads[vidx] === undefined) {
                    grads[vidx] = vgrad;
                } else {
                    grads[vidx].grad.add(vgrad.grad);
                }
            }
        }
    }

    let numerator = 0,
        denominator = 0;
    grads.forEach((g) => (numerator += g.grad.lengthSq()));
    hess.forEach((h, [uidx, vidx]) => {
        if (!grads[uidx] || !grads[vidx]) return; // Skip if no grads registered.
        const g2 = grads[uidx].grad.clone().multiply(grads[vidx].grad);
        denominator += 2 * g2.x * Math.max(h.x, 0) + 2 * g2.y * Math.max(h.y, 0);
    });
    if (denominator === 0) return [];
    const alpha = numerator / denominator;
    console.log('alpha', { alpha, numerator, denominator });

    yield grads.filter((g) => {
        g.grad.multiplyScalar(alpha);
        return true;
    });
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
    for (let u of storage.nodes()) {
        visited.add(u);
        for (let v of storage.nodes()) {
            if (visited.has(v)) continue;
            if (u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Forces act on only nodes that are not direct ancestors/descendants.
            if (storage.hasAncestor(u, v) || storage.hasAncestor(v, u)) continue;

            if (typeof idealLength === 'function') idealLength = idealLength(u, v);
            const axis = new Vector().subVectors(v.center, u.center);
            const actualDistance =
                axis.length() > 0
                    ? u.shape.boundary(axis).distanceTo(v.shape.boundary(axis.negate()))
                    : 1;
            if (storage.existsEdge(u, v, true)) {
                // Restoring force between edges to ideal length.
                const delta = edgeStrength * (actualDistance - idealLength);
                yield nudgePair(u.center, v.center, [-wu * delta, -wv * delta]);
            } else {
                // Repulsive force between unconnected node pairs.
                const delta = repulsiveStrength * Math.pow(actualDistance, -1);
                yield nudgePair(u.center, v.center, [wu * delta, wv * delta]);
            }
        }
    }
}

/**
 * Generates forces that pull children nodes towards the parent's center.
 * @param storage
 * @param strength
 */
export function* generateCompactnessForces(storage: Storage, strength: number) {
    // TODO: Based on shape preserveSize, preserveWidth, preserveHeight
    for (let u of storage.nodes()) {
        for (let child of u.children) {
            yield nudgePair(u.center, child.center, -strength);
        }
    }
}

/**
 * Generates forces tha pull graph towards the origin.
 * @param storage
 * @param strength
 */
export function* generateCenteringForces(storage: StructuredStorage, strength: number) {
    const { x, X, y, Y } = storage.bounds();
    const midX = (x + X) / 2;
    const midY = (y + Y) / 2;
    for (let r of storage.roots()) {
        if (r.fixed) continue;
        yield nudgePoint(r.center, strength, [-midX, -midY]);
    }
}

/**
 * Constrain `u`'s children to be contained within itself, expanding its boundaries if necessary.
 * @param u
 *      Node with children to constrain.
 * @param padding
 *      Spacing inside the node's boundary.
 */
export function* generateNodeChildrenConstraints(u: Node, padding: number = 0) {
    if (u.children.length > 0) {
        yield u.shape.constrainShapesWithin(u.children.map((child) => child.shape), padding);
    }
}
