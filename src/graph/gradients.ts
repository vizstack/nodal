/**
 * These functions output gradients to induce certain properties on `Vector`s and `Node`s.
 * These gradients can function as 'soft' forces  or 'hard' constraints depending on the learning
 * rate. A 'position' function produces a gradient that has geometric meaning, i.e. a shift in
 * position, whereas a 'force' function produces a gradient that matters more in direction than in
 * magnitude.
 */
import { Box2 } from 'three';

import { Vector, Gradient } from '../optim';
import { Node, Edge } from './elements';


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
 */
export function constrainDistance(
    p: Vector,
    q: Vector,
    op: '=' | '>=' | '<=',
    distance: number,
    { axis = undefined, masses = [1, 1] }: Partial<{ masses: [number, number], axis?: [number, number] }> = {},
): Gradient[] {
    const pq = (new Vector()).subVectors(q, p);
    const v = axis ?
        (new Vector(axis[0], axis[1])).normalize() :
        pq.clone().normalize();
    const current = axis ? Math.abs(pq.dot(v)) : pq.length();
    if(op === '>=' && current >= distance + kZeroThreshold) return [];
    if(op === '<=' && current <= distance - kZeroThreshold) return [];
    if(op === '=' && Math.abs(current - distance) <= kZeroThreshold) return [];
    const delta = distance - current;
    if(!masses) masses = [1, 1];
    const gradq = v.clone().multiplyScalar(delta * masses[0] / (masses[0] + masses[1]));
    const gradp = v.clone().multiplyScalar(-delta * masses[1] / (masses[0] + masses[1]));
    
    const grads = [];
    if(gradp.length() > kZeroThreshold) grads.push(new Gradient(p, gradp));
    if(gradq.length() > kZeroThreshold) grads.push(new Gradient(q, gradq));
    return grads;
}

/**
 * Constrains the angle of the segment between points. The mass of a point determines its inertia
 * i.e. with more mass it moves less.
 */
export function constrainAngle(
    p: Vector,
    q: Vector,
    angle: number,
    { masses = [1, 1] }: Partial<{ masses: [number, number] }> = {},
): Gradient[] {
    // TODO
    return [];
}

/**
 * Constrains the position of `q` relative to `p` by some `offset` along the `direction`. Both the
 * @param p
 *     Point vector that serves as the reference.
 * @param q 
 *     Point vector that serves as the offset.
 * @param op 
 *     Whether to make offset of `q` relative to `p` equal to (`=`), greater than / equal to (`>=`),
 *     or less than / equal to (`<=`) the specified value.
 * @param direction
 *     Direction vector onto which the offset is projected. Magnitude does not matter.
 * @param offset 
 *     How much along the direction vector `q` should be relative to `p`. Can be negative.
 * @param masses
 *     Mass of a point determines its inertia, i.e. with more mass it moves less.
 */
export function constrainOffset(
    p: Vector,
    q: Vector,
    op: '=' | '>=' | '<=',
    offset: number,
    direction: [number, number],
    { masses = [1, 1] }: Partial<{ masses: [number, number] }> = {},
): Gradient[] {
    const pq = (new Vector()).subVectors(q, p);
    const v = (new Vector(direction[0], direction[1])).normalize();
    const projected = pq.dot(v);
    if(op === '>=' && projected >= offset + kZeroThreshold) return [];
    if(op === '<=' && projected <= offset - kZeroThreshold) return [];
    if(op === '=' && Math.abs(projected - offset) <= kZeroThreshold) return [];
    const delta = offset - projected;
    const gradq = v.clone().multiplyScalar(delta * masses[0] / (masses[0] + masses[1]));
    const gradp = v.clone().multiplyScalar(-delta * masses[1] / (masses[0] + masses[1]));

    const grads = [];
    if(gradp.length() > kZeroThreshold) grads.push(new Gradient(p, gradp));
    if(gradq.length() > kZeroThreshold) grads.push(new Gradient(q, gradq));
    return grads;
}

export function positionChildren(
    u: Node,
    compactness: number,
): Gradient[] {
    // TODO
    return [];
}

const kPortSeparation: number = 10;
const kPortMasses: [number, number] = [1e4, 1];

export function positionPorts(
    u: Node,
): Gradient[] {
    const grads: Gradient[][] = [];
    
    // TODO: Based on shape, which has locations, give to shape to produce constraint.
    const orders: Record<string, { order: number, location: string, point: Vector }[]> = {};
    Object.values(u.ports)
        .forEach((port) => {
            if(port.order !== undefined && port.location !== undefined) {
                if (!(port.location in orders)) {
                    orders[port.location] = [];
                }
                orders[port.location].push(port as any); // TODO: Fix types.
            }
        });

    Object.values(u.ports).forEach(({location, order, point}) => {
        // grads.push(
        //     constrainDistance(u.center, point, '>=', u.shape.height / 2, [0, 1], kPortMasses),
        //     constrainDistance(u.center, point, '>=', u.shape.width / 2, [1, 0], kPortMasses),
        //     constrainOffset(u.center, point, '<=', u.shape.height / 2, [0, 1], kPortMasses),
        //     constrainOffset(u.center, point, '<=', u.shape.height / 2, [0, -1], kPortMasses),
        //     constrainOffset(u.center, point, '<=', u.shape.width / 2, [1, 0], kPortMasses),
        //     constrainOffset(u.center, point, '<=', u.shape.width / 2, [-1, 0], kPortMasses),
        // );

        let portAxis: [number, number];
        switch(location) {
            case 'north':
                portAxis = [1, 0];
                grads.push(
                    constrainOffset(u.center, point, "=", u.shape.height / 2, [0, 1], { masses: kPortMasses}),
                    constrainDistance(u.center, point, '<=', u.shape.width / 2, { axis: [1, 0], masses: kPortMasses}),
                );
                break;
            case 'south':
                portAxis = [1, 0];
                grads.push(
                    constrainOffset(u.center, point, "=", -u.shape.height / 2, [0, 1], { masses: kPortMasses}),
                    constrainDistance(u.center, point, '<=', u.shape.width / 2, { axis: [1, 0], masses: kPortMasses}),
                );
                break;
            case 'east':
                portAxis = [0, 1];
                grads.push(
                    constrainOffset(u.center, point, "=", u.shape.width / 2, [1, 0], { masses: kPortMasses}),
                    constrainDistance(u.center, point, '<=', u.shape.height / 2, { axis: [0, 1],masses: kPortMasses}),
                );
                break;
            case 'west':
                portAxis = [0, 1];
                grads.push(
                    constrainOffset(u.center, point, "=", -u.shape.width / 2, [1, 0], { masses: kPortMasses}),
                    constrainDistance(u.center, point, '<=', u.shape.height / 2, { axis: [0, 1],masses: kPortMasses}),
                );
                break;
            default:
                grads.push(constrainDistance(u.center, point, "=", 0, { masses: kPortMasses}));
                break;
        }

        // Constrain order for all ordered ports at a location.
        if (location && order) {
            orders[location].forEach((port) => {
                if (port.order < order) {
                    grads.push(constrainDistance(point, port.point, "<=", kPortSeparation, { axis: portAxis}));
                }
                if (port.order > order) {
                    grads.push(constrainDistance(point, port.point, ">=", kPortSeparation, { axis: portAxis}));
                }
            })
        }
    });
    return grads.flat();
}

function getBounds(node: Node): Box2 {
    return new Box2(
        new Vector(node.center.x - node.shape.width / 2, node.center.y - node.shape.height / 2),
        new Vector(node.center.x + node.shape.width / 2, node.center.y + node.shape.height / 2),
    )
}

export function positionNoOverlap(u: Node, v: Node): Gradient[] {
    const ubounds = getBounds(u);
    const vbounds = getBounds(v);
    if(!ubounds.intersectsBox(vbounds)) return [];
    const xgrad = constrainDistance(u.center, v.center, ">=", (u.shape.width + v.shape.width)/2, {axis: [1, 0]});
    const ygrad = constrainDistance(u.center, v.center, ">=", (u.shape.height + v.shape.height)/2, {axis: [0, 1]});
    const xgradlen = xgrad.reduce((sum, grad) => sum + grad.grad.length(), 0);
    const ygradlen = ygrad.reduce((sum, grad) => sum + grad.grad.length(), 0);
    return xgradlen < ygradlen ? xgrad : ygrad;
}

export function positionAlignment(u: Node, v: Node, direction: [number, number]): Gradient[] {
    // TODO
    return [];
}

export function positionSeparation(u: Node, v: Node): Gradient[] {
    // TODO
    return [];
}

export function positionCircular(u: Node, v: Node): Gradient[] {
    // TODO
    return [];
}

export function positionGridSnap(u: Node): Gradient[] {
    // TODO
    return [];
}

/**
 * Force between a pair of nodes, with magnitude `scalar * | || u - v || - shift | ^ power` and
 * directions pointing away from each other (when `scalar` is positive) or towards each other (when
 * `scalar` is negative). It is possible to specify a pair of different `scalar` values to apply to
 * each node individually.
 */
export function forcePairwisePower(
    u: Node,
    v: Node,
    {
        power = 2,
        shift = 0,
        scalar = 1,
    }: Partial<{
        power: number,
        shift: number,
        scalar: number | [number, number],
    }> = {}
): Gradient[] {
    const vu = (new Vector()).subVectors(u.center, v.center);
    let delta = vu.length() - shift;
    const mag = Math.pow(Math.max(Math.abs(delta), 0.1), power);
    // By default pointing away: v->u to u so scalar[0] and u->v to v so scalar[1].
    const mags = Array.isArray(scalar) ?
        [mag * scalar[0], mag * scalar[1]] :
        [mag * scalar, mag * scalar];
    vu.normalize();
    const uv = vu.clone().negate();
    vu.multiplyScalar(mags[0]);
    uv.multiplyScalar(mags[1]);
    return [new Gradient(u.center, vu), new Gradient(v.center, uv)];
}

/**
 * Force acting on a single node, with `magnitude` and `direction` specified. The `direction` vector
 * may be unnormalized.
 */
export function forceVector(
    u: Node,
    magnitude: number,
    direction: [number, number]
): Gradient[] {
    const force = new Vector(direction[0], direction[1]);
    force.normalize().multiplyScalar(magnitude);
    return [new Gradient(u.center, force)];
}
