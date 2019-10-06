/**
 * These functions output gradients to induce certain properties on `Vector`s and `Node`s.
 * These gradients can function as 'soft' nudges  or 'hard' constraints depending on the learning
 * rate. A `constraint` function produces a gradient that has geometric meaning, i.e. a shift in
 * position, whereas a `nudge` function produces a gradient that matters more in direction than in
 * magnitude.
 */
import { Box2 } from 'three';

import { Vector, Gradient } from '../optim';
import { Node, Edge } from './elements';
import { Rectangle } from './shapes';


// Threshold for distance under which points are considered to be the same.
const kZeroThreshold = 1e-3;

/**
 * Constrains the Euclidean distance between points, optionally after projection onto an axis.
 * @param p
 *     Point vector.
 * @param q
 *     Point vector.
 * @param op
 *     Whether to make separation equal to (`=`), greater than or equal to (`>=`), or less than or
 *     equal to (`<=`) the specified distance.
 * @param distance
 *     Positive separation between `p` and `q`.
 * @param axis
 *     Axis onto which the separation is projected. Gradients will point in opposite directions
 *     along this axis. Sign/magnitude does not matter, i.e. [1, 0] is the same as [-2, 0].
 * @param masses
 *     Mass of a point determines its inertia, i.e. with more mass it moves less.
 * @returns
 *     Empty array (if already satisfied) or 2-array of gradients in order `[p, q]`.
 */
export function constrainDistance(
    p: Vector,
    q: Vector,
    op: '=' | '>=' | '<=',
    distance: number,
    {
        axis = undefined,
        masses = [1, 1]
    }: Partial<{
        masses: [number, number],
        axis?: [number, number]
    }> = {},
): Gradient[] {
    const pq = (new Vector()).subVectors(q, p);
    const v = axis ?
        (new Vector(axis[0], axis[1])).normalize() :
        pq.clone().normalize();
    const current = axis ? Math.abs(pq.dot(v)) : pq.length();
    if (op === '>=' && current >= distance + kZeroThreshold) return [];
    if (op === '<=' && current <= distance - kZeroThreshold) return [];
    if (op === '=' && Math.abs(current - distance) <= kZeroThreshold) return [];
    const delta = distance - current;  // Sign reflects whether should increase/decrease distance.
    if (!masses) masses = [1, 1];
    if (pq.dot(v) < 0) v.negate();
    const gradq = v.clone().multiplyScalar(delta * masses[0] / (masses[0] + masses[1]));
    const gradp = v.clone().multiplyScalar(-delta * masses[1] / (masses[0] + masses[1]));
    return [new Gradient(p, gradp), new Gradient(q, gradq)];
}

/**
 * Constrains the position of `q` relative to `p` by some `offset` along the `direction`.
 * @param p
 *     Point vector that serves as the reference.
 * @param q
 *     Point vector that serves as the offset.
 * @param op
 *     Whether to make offset of `q` relative to `p` equal to (`=`), greater than / equal to (`>=`),
 *     or less than / equal to (`<=`) the specified value.
 * @param offset
 *     How much along the direction vector `q` should be relative to `p`. Can be negative.
 * @param direction
 *     Direction vector onto which the offset is projected. Magnitude does not matter.
 * @param masses
 *     Mass of a point determines its inertia, i.e. with more mass it moves less.
 * @returns
 *     Empty array (if already satisfied) or tuple of gradients in order `[p, q]`.
 */
export function constrainOffset(
    p: Vector,
    q: Vector,
    op: '=' | '>=' | '<=',
    offset: number,
    direction: [number, number],
    {
        masses = [1, 1]
    }: Partial<{
        masses: [number, number]
    }> = {},
): Gradient[] {
    const pq = (new Vector()).subVectors(q, p);
    const v = (new Vector(direction[0], direction[1])).normalize();
    const projected = pq.dot(v);
    if (op === '>=' && projected >= offset + kZeroThreshold) return [];
    if (op === '<=' && projected <= offset - kZeroThreshold) return [];
    if (op === '=' && Math.abs(projected - offset) <= kZeroThreshold) return [];
    const delta = offset - projected;
    const gradq = v.clone().multiplyScalar(delta * masses[0] / (masses[0] + masses[1]));
    const gradp = v.clone().multiplyScalar(-delta * masses[1] / (masses[0] + masses[1]));
    return [new Gradient(p, gradp), new Gradient(q, gradq)];
}

/**
 * Nudges the angle of the vector pointing from `p` to `q`. The mass of a point determines its
 * inertia i.e. with more mass it moves less. The angle is measured counterclockwise from 0 (as
 * in trigonometry) but since browser's render the positive-y direction pointing downwards, the
 * result may appear opposite than intended if unaccounted for.
 * @param p
 *     Point vector that serves as source (direction tail).
 * @param q
 *     Point vector that serves as target (direction head.).
 * @param angle
 *     Single angle or array of angles, in degrees within range [0, 360].
 * @param strength
 *     Maximum restoring force (felt when points directly opposite the desired angle).
 * @returns
 *     Tuple of gradients in order `[p, q]`.
 */
export function nudgeAngle(
    p: Vector,
    q: Vector,
    angle: number | number[],
    strength: number = 1,
    { masses = [1, 1] }: Partial<{ masses: [number, number] }> = {},
): Gradient[] {
    const pq = (new Vector()).subVectors(q, p).normalize();
    const pqAngle = Math.atan2(pq.y, pq.x) * 180 / Math.PI;  // In degrees.
    let desired: number;
    if (Array.isArray(angle)) {
        if (angle.length === 0) throw Error('No angles specified');
        desired = angle[0];
        let mindiff = Number.POSITIVE_INFINITY;
        for (let a of angle) {
            // Positive angular difference in range [0, 180].
            const diff = 180 - Math.abs(Math.abs(a - pqAngle) - 180);
            if (diff < mindiff) {
                desired = a;
                mindiff = diff;
            }
        }
    } else {
        desired = angle;
    }

    // Signed angular difference in range (-180, 180].
    const sgndiff = (pqAngle - desired - 540) % 360 + 180;
    const delta = strength * sgndiff / 180;  // In range (-strength, strength].
    const gradq = (new Vector(pq.y, -pq.x)).multiplyScalar(delta * masses[0] / (masses[0] + masses[1]));
    const gradp = (new Vector(-pq.y, pq.x)).multiplyScalar(delta * masses[1] / (masses[0] + masses[1]));
    return [new Gradient(p, gradp), new Gradient(q, gradq)];
}

/**
 * Nudges the pair of points in opposite directions, away from each other if `magnitude` is
 * positive, and towards each other if the `magnitude` is negative. It is possible to specify
 * different `magnitude` for each point.
 * @param p
 *     Point vector.
 * @param q
 *     Point vector.
 * @param magnitude
 *     Single magnitude or tuple of magnitudes. Nudges away from each other if positive, and
 *     nudges towards each other if negative.
 * @returns
 *     Tuple of gradients in order `[p, q]`.
 */
export function nudgePair(
    p: Vector,
    q: Vector,
    magnitude: number | [number, number]
): [Gradient, Gradient] {
    if (!Array.isArray(magnitude)) magnitude = [magnitude, magnitude];
    const qp = (new Vector()).subVectors(p, q).normalize();
    const pq = qp.clone().negate();
    qp.multiplyScalar(magnitude[0]);
    pq.multiplyScalar(magnitude[1]);
    return [new Gradient(p, qp), new Gradient(q, pq)];
}

/**
 * Nudges a point (or array of points) in the specified `direction` with `magnitude`.
 * @param points
 *     Point vector or array of point vectors.
 * @param magnitude
 *     Magnitude scalar.
 * @param direction
 *     Direction vector, unnormalized.
 * @returns
 *     Array of gradients for each point.
 */
export function nudgePoint(
    points: Vector | Vector[],
    magnitude: number,
    direction: [number, number]
): Gradient[] {
    if (!Array.isArray(points)) points = [points];
    const grad = (new Vector(direction[0], direction[1])).normalize().multiplyScalar(magnitude);
    return points.map((p) => new Gradient(p, grad.clone()));
}

// Helper type of port.
type Port = Node['ports'][keyof Node['ports']];

// Relative mass of [node, port] determines how much "tug" a port has on its node.
const kPortMasses: [number, number] = [1e6, 1];

/**
 * Constrains `u`'s ports (if any) to be at their correct `location` on the node's boundary,
 * in their correct `order` relative to other ports, if specified. If no port is specified
 * @param u
 *     Node with ports to constrain.
 * @param centering
 *     Strength of port attraction towards center of each side. (default: 0.1)
 * @param gap
 *     Minimum distance between successive ports at a location. (default: 8)
 */
export function constrainNodePorts(
    u: Node,
    centering: number = 0.5,
    gap: number = 8,
): Gradient[] {
    const grads: Gradient[][] = [];
    const ports: Port[] = Object.values(u.ports);

    // Aggregate all ports at the same specified location.
    const orders: Record<Port['location'], (Port & { order: number })[]> = {
        north: [], south: [], east: [], west: [], boundary: [], center: []
    };
    ports.forEach((port) => {
        if (port.order !== undefined) {
            orders[port.location].push(port as (Port & { order: number }));
        }
    });

    const { x: cx, y: cy } = u.center;
    const { width, height, x, y, X, Y } = u.shape.bounds();
    ports.forEach(({ location, order, point }) => {
        if (location === 'center') {
            grads.push(constrainDistance(u.center, point, "=", 0, { masses: kPortMasses }));
            return;
        }

        let side: 'north' | 'south' | 'east' | 'west';
        if (location === 'boundary') {
            // Narrow down location that the point is currently on.
            const ray = (new Vector()).subVectors(point, u.center);
            const risingNormalDot = ray.x * (-height) + ray.y * (-width);
            const fallingNormalDot = ray.x * (height) + ray.y * (-width);
            if (risingNormalDot > 0) {
                side = fallingNormalDot > 0 ? 'north' : 'west';
            } else {
                side = fallingNormalDot > 0 ? 'east' : 'south';
            }
        } else {
            side = location;
        }

        // Constrain port to `Shape` boundary.
        grads.push(u.shape.constrainPointOnBoundary(point, { masses: { shape: 100000, point: 1 }, offset: 0 }));  // TODO: Add masses.

        // Attract ports on boundary towards side center.
        switch (side) {
            case 'north':
                // Scale the boundary coordinates by a close-to-1 constant so that the ports do not exactly
                // align with them and cause jitter
                grads.push(nudgePair(new Vector(cx, y * 0.9), point, [0, -centering]));
                break;
            case 'south':
                grads.push(nudgePair(new Vector(cx, Y * 0.9), point, [0, -centering]));
                break;
            case 'west':
                grads.push(nudgePair(new Vector(x * 0.9, cy), point, [0, -centering]));
                break;
            case 'east':
                grads.push(nudgePair(new Vector(X * 0.9, cy), point, [0, -centering]));
                break;
        }

        // Maintain separation gap between ports.
        // TODO: Make into a scheduled value.
        ports.filter(({ location }) => location !== 'center').forEach(({ point: p }) => {
            if (p !== point) {
                grads.push(constrainDistance(point, p, '>=', gap))
            }
        });

        // Only location zones and ordering for more specific sides.
        if (location === 'boundary') return;

        // Constrain the port to be in the correct location zone (if not 'boundary' or 'center'):
        // |\ N /|    N = 'north',    portAxis: [1, 0]
        // | \ / |    S = 'south',    portAxis: [1, 0]
        // |W X E|    E = 'east',     portAxis: [0, 1]
        // | / \ |    W = 'west',     portAxis: [0, 1]
        // |/ S \|
        // Use the normal vectors of the rising/falling diagonals to target a particular zone,
        // e.g. positive along rising diagonal normal and negative along falling diagonal
        // normal = west.
        const risingNormalOp = location === 'north' || location === 'west' ? '>=' : '<=';
        const fallingNormalOp = location === 'north' || location === 'east' ? '>=' : '<=';
        grads.push(
            constrainOffset(u.center, point, risingNormalOp, 0, [-height, -width], { masses: kPortMasses }),
            constrainOffset(u.center, point, fallingNormalOp, 0, [height, -width], { masses: kPortMasses }),
        );

        // Constrain order for ordered ports at the same side.
        if (order) {
            orders[location].forEach((port) => {
                if (order < port.order) {
                    grads.push(
                        constrainOffset(point, port.point, ">=", gap, location === 'north' || location === 'south' ? [1, 0] : [0, 1])
                    );
                }
            })
        }
    });

    return grads.flat();
}

/**
 *
 * @param u
 *     First node of pair to ensure nonoverlap.
 * @param v
 *     Second node of pair to ensure nonoverlap.
 * @param margin
 *     Spacing outside each node's boundary.
 */
export function constrainNodeNonoverlap(
    u: Node,
    v: Node,
    margin: number = 0,
): Gradient[] {
    // TODO: Rewrite using collision checker
    // TODO: Integrate margin.
    const { x: ux, y: uy, X: uX, Y: uY, width: uwidth, height: uheight } = u.shape.bounds();
    const { x: vx, y: vy, X: vX, Y: vY, width: vwidth, height: vheight } = v.shape.bounds();
    const ubounds = new Box2(new Vector(ux, uy), new Vector(uX, uY));
    const vbounds = new Box2(new Vector(vx, vy), new Vector(vX, vY));
    if (!ubounds.intersectsBox(vbounds)) return [];
    const xgrad = constrainDistance(u.center, v.center, ">=", (uwidth + vwidth) / 2, { axis: [1, 0] });
    const ygrad = constrainDistance(u.center, v.center, ">=", (uheight + vheight) / 2, { axis: [0, 1] });
    const xgradlen = xgrad.reduce((sum, grad) => sum + grad.grad.length(), 0);
    const ygradlen = ygrad.reduce((sum, grad) => sum + grad.grad.length(), 0);
    const shorter = xgradlen < ygradlen ? xgrad : ygrad;

    // Bump all descendants by gradient on root.
    function moveChildren(p: Node, grad: Vector) {
        if (p.children.length > 0) {
            p.children.forEach((c) => {
                shorter.push(new Gradient(c.center, grad));
                moveChildren(c, grad);
            });
        }
    }
    for (let grad of shorter) {
        if (grad.point === u.center) moveChildren(u, grad.grad);
        if (grad.point === v.center) moveChildren(v, grad.grad);
    }

    return shorter;
}

/**
 *
 * @param nodes
 * @param axis
 */
export function constrainNodeAlignment(
    nodes: Node[],
    axis: [number, number],
    align: 'north' | 'south' | 'east' | 'west' | 'center' = 'center',
): Gradient[] {
    // TODO: Integrate align.
    const [x, y] = axis;
    if (nodes.length < 2) return [];
    const grads: Gradient[][] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
        // TODO: Integrate fixed.
        const u = nodes[i];
        const v = nodes[i + 1];
        const p = u.center.clone();
        const q = v.center.clone();
        switch(align) {
            case 'north': 
                p.y += u.shape.support(new Vector(0, -1)).sub(u.center).y;
                q.y += v.shape.support(new Vector(0, -1)).sub(v.center).y;
                break;
            case 'south': 
                p.y += u.shape.support(new Vector(0, 1)).sub(u.center).y;
                q.y += v.shape.support(new Vector(0, 1)).sub(v.center).y;
                break;
            case 'east': 
                p.x += u.shape.support(new Vector(0, 1)).sub(u.center).x;
                q.x += v.shape.support(new Vector(0, 1)).sub(v.center).x;
                break;
            case 'west': 
                p.x += u.shape.support(new Vector(0, -1)).sub(u.center).x;
                q.x += v.shape.support(new Vector(0, -1)).sub(v.center).x;
                break;
        }
        const newGrads = constrainDistance(p, q, '=', 0, { axis: [-y, x] });
        grads.push(newGrads.map((grad) => new Gradient(grad.point === p ? u.center : v.center, grad.grad)));
    }
    return grads.flat();
}

/**
 * Constraint two nodes such that the distance between their support points along a given axis obeys a given inequality.
 * @param u 
 * @param v 
 * @param op 
 * @param separation 
 * @param config 
 */
export function constrainNodeDistance(
    u: Node, 
    v: Node, 
    op: '=' | '>=' | '<=', 
    distance: number,
    {
        axis = undefined,
        masses = [1, 1]
    }: Partial<{
        masses: [number, number],
        axis?: [number, number]
    }> = {},
): Gradient[] {
    // TODO: Integrate fixed;
    const supportAxis = (new Vector()).subVectors(v.center, u.center);
    const us = u.shape.support(supportAxis);
    const vs = v.shape.support(supportAxis.negate());
    return constrainDistance(us, vs, op, distance, { axis, masses }).map((grad) => {
        if (grad.point === us) {
            return new Gradient(u.center, grad.grad);
        }
        else if (grad.point === vs) {
            return new Gradient(v.center, grad.grad);
        }
        throw Error('Gradient for unknown point returned by `constrainOffset()`.');
    });
}

/**
 * Constraint two nodes such that the distance between their support points along a given axis obeys a given inequality.
 * @param u 
 * @param v 
 * @param op 
 * @param separation 
 * @param config 
 */
export function constrainNodeOffset(
    u: Node, 
    v: Node, 
    op: '=' | '>=' | '<=', 
    offset: number, 
    direction: [number, number], 
    { masses = [1, 1] }: Partial<{ masses: [number, number] }> = {}
): Gradient[] {
    // TODO: Integrate fixed;
    const axis = new Vector(...direction);
    const us = u.shape.support(axis);
    const vs = v.shape.support(axis.negate());
    return constrainOffset(us, vs, op, offset, direction, { masses }).map((grad) => {
        if (grad.point === us) {
            return new Gradient(u.center, grad.grad);
        }
        else if (grad.point === vs) {
            return new Gradient(v.center, grad.grad);
        }
        throw Error('Gradient for unknown point returned by `constrainOffset()`.');
    });
}

/**
 *
 * @param u
 * @param v
 */
export function constrainNodeCircular(nodes: Node[], radius: number | undefined = undefined): Gradient[] {
    // TODO
    return [];
}

/**
 *
 * @param u
 * @param dx
 * @param dy
 */
export function constrainNodeGrid(u: Node, dx: number, dy: number): Gradient[] {
    const snapx = Math.floor(u.center.x / dx) * dx;
    const snapy = Math.floor(u.center.y / dy) * dy;
    return constrainDistance(u.center, new Vector(snapx, snapy), "=", 0);
}
