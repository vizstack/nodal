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
    if(op === '>=' && current >= distance + kZeroThreshold) return [];
    if(op === '<=' && current <= distance - kZeroThreshold) return [];
    if(op === '=' && Math.abs(current - distance) <= kZeroThreshold) return [];
    const delta = distance - current;  // Sign reflects whether should increase/decrease distance.
    if(!masses) masses = [1, 1];
    if(pq.dot(v) < 0) v.negate(); 
    const gradq = v.clone().multiplyScalar(delta * masses[0] / (masses[0] + masses[1]));
    const gradp = v.clone().multiplyScalar(-delta * masses[1] / (masses[0] + masses[1]));
    
    const grads = [];
    if(gradp.length() > kZeroThreshold) grads.push(new Gradient(p, gradp));
    if(gradq.length() > kZeroThreshold) grads.push(new Gradient(q, gradq));
    return grads;
}

/**
 * Constrains the angle of the vector pointing from `p` to `q`. The mass of a point determines its
 * inertia i.e. with more mass it moves less. Note that because many rendering schemes make the
 * positive-y axis point downwards, the angle is measured clockwise from 0 (not counter-clockwise
 * as is the convention in trigonometry).
 * @param p
 *     Point vector that serves as source (direction tail).
 * @param q 
 *     Point vector that serves as target (direction head.).
 * @param angle 
 *     A single angle or list of angles, in degrees within range [0, 360].
 * @param strength
 *     Maximum magnitude restoring force, when vector is directly opposite the angle.
 */
export function constrainAngle(
    p: Vector,
    q: Vector,
    angle: number | number[],
    strength: number = 1,
    { masses = [1, 1] }: Partial<{ masses: [number, number] }> = {},
): Gradient[] {
    const pq = (new Vector()).subVectors(q, p).normalize();
    const pqAngle = Math.atan2(pq.y, pq.x) * 180 / Math.PI;  // In degrees.
    let desired: number;
    if(Array.isArray(angle)) {
        if(angle.length === 0) throw Error('No angles specified');
        desired = angle[0];
        let mindiff = Number.POSITIVE_INFINITY;
        for(let a of angle) {
            // Positive angular difference in range [0, 180].
            const diff = 180 - Math.abs(Math.abs(a - pqAngle) - 180);
            if(diff < mindiff) {
                desired = a;
                mindiff = diff;
            }
        }
    } else {
        desired = angle;
    }

    // Signed angular difference in range (-180, 180].
    const sgndiff = (pqAngle - desired - 540) % 360 + 180;
    const delta = strength * sgndiff;  // In range (-strength, strength];  
    const gradq = (new Vector(pq.y, -pq.x)).multiplyScalar(delta*masses[0]/(masses[0] + masses[1]));
    const gradp = (new Vector(-pq.y, pq.x)).multiplyScalar(delta*masses[1]/(masses[0] + masses[1]));
    return [new Gradient(p, gradp), new Gradient(q, gradq)];
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
 * @param offset 
 *     How much along the direction vector `q` should be relative to `p`. Can be negative.
 * @param direction
 *     Direction vector onto which the offset is projected. Magnitude does not matter.
 * @param masses
 *     Mass of a point determines its inertia, i.e. with more mass it moves less.
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

const kPadding = 10;

export function positionChildren(
    u: Node,
    padding: number=kPadding,
): Gradient[] {
    // TODO: Based on shape, which has different borders, give to shape to produce constraints.

    // Compute new parent bounds.
    if(u.children.length > 0) {
        const box = new Box2();
        u.children.forEach((child) => {
            box.expandByPoint(new Vector(
                child.center.x - child.shape.width /2 - padding,
                child.center.y - child.shape.height/2 - padding,
            ));
            box.expandByPoint(new Vector(
                child.center.x + child.shape.width /2 + padding,
                child.center.y + child.shape.height/2 + padding,
            ))
        });
        box.getCenter(u.center);
        const dims = new Vector();
        box.getSize(dims);
        u.shape.width = dims.x;
        u.shape.height = dims.y;
    }
    return [];
}

const kPortSeparation: number = 10;
const kPortMasses: [number, number] = [1e6, 1];

export function positionPorts(
    u: Node,
    compactness: number = 0.01,
    gap: number = 8,
): Gradient[] {
    const grads: Gradient[][] = [];
    const ports = Object.values(u.ports);
    
    // TODO: Based on shape, which has locations, give to shape to produce constraint.
    const orders: Record<string, { order: number, location: string, point: Vector }[]> = {};
    ports.forEach((port) => {
            if(port.order !== undefined && port.location !== undefined) {
                if (!(port.location in orders)) {
                    orders[port.location] = [];
                }
                orders[port.location].push(port as any); // TODO: Fix types.
            }
        });

    ports.forEach(({location, order, point}) => {
        let portAxis: [number, number];
        switch(location) {
            case 'north':
                portAxis = [1, 0];
                grads.push(
                    constrainOffset(u.center, point, "=", -u.shape.height / 2, [0, 1], { masses: kPortMasses}),
                    constrainDistance(u.center, point, '<=', u.shape.width / 2, { axis: [1, 0], masses: kPortMasses}),
                );
                break;
            case 'south':
                portAxis = [1, 0];
                grads.push(
                    constrainOffset(u.center, point, "=", u.shape.height / 2, [0, 1], { masses: kPortMasses}),
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
                    grads.push(constrainOffset(point, port.point, "<=", kPortSeparation, portAxis));
                }
            })
        }

        // Attract ports on border towards each other but repel each other.
        if(location) {
            grads.push(forcePairwise(u.center, point, [0, -compactness*u.center.distanceTo(point)]));
        ports.forEach(({ point: otherpoint  }) => {
            // grads.push(forcePairwise(point, otherpoint, [0, -compactness*(point.distanceTo(otherpoint) - gap)]));
            grads.push(constrainDistance(point, otherpoint, '>=', gap));
        });
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
    const shorter = xgradlen < ygradlen ? xgrad : ygrad;

    // Bump all descendants by gradient on root.
    function moveChildren(p: Node, grad: Vector) {
        if(p.children.length > 0) {
            p.children.forEach((c) => {
                shorter.push(new Gradient(c.center, grad));
                moveChildren(c, grad);
            });
        }
    }
    for(let grad of shorter) {
        if(grad.point === u.center) moveChildren(u, grad.grad);
        if(grad.point === v.center) moveChildren(v, grad.grad);
    }

    return shorter;
}

export function positionAlignment(u: Node, v: Node, axis: [number, number]): Gradient[] {
    const [x, y] = axis;
    return constrainDistance(u.center, v.center, '=', 0, { axis: [-y, x] });
}

export function positionSeparation(u: Node, v: Node, op: '=' | '>=' | '<=',
separation: number, { masses = [1, 1] }: Partial<{ masses: [number, number] }> = {}): Gradient[] {
    const uv = (new Vector()).subVectors(v.center, u.center);
    let distance = uv.length();
    const { width: uwidth, height: uheight } = u.shape;
    const { width: vwidth, height: vheight } = v.shape;
    const uborder = uv.y * uwidth > uv.x * uheight ? new Vector(uv.x / uv.y * uwidth, uheight) : new Vector(uwidth, uv.y / uv.x * uheight);
    const vborder = uv.y * vwidth > uv.x * vheight ? new Vector(uv.x / uv.y * vwidth, vheight) : new Vector(vwidth, uv.y / uv.x * vheight);
    let interior = (uborder.length() + vborder.length()) / 2;
    return constrainDistance(u.center, v.center, op, separation + interior, { masses })
}

export function positionCircular(u: Node, v: Node): Gradient[] {
    // TODO
    return [];
}

export function positionGridSnap(u: Node, dx: number, dy: number): Gradient[] {
    const snapx = Math.floor(u.center.x / dx) * dx;
    const snapy = Math.floor(u.center.y / dy) * dy;
    return constrainDistance(u.center, new Vector(snapx, snapy), "=", 0);
}

/**
 * Force between a pair of nodes, with magnitude `scalar * | || u - v || - control | ^ power` and
 * directions pointing away from each other (when `f` is positive) or towards each other (when
 * `f` is negative), for `f = scalar * ( || u - v || - control )`. It is possible to specify a pair
 * of different `scalar` values to apply to each node individually.
 */
export function forcePairwisePower(
    u: Node,
    v: Node,
    {
        power = 2,
        control = 0,
        scalar = 1,
    }: Partial<{
        power: number,
        control: number,
        scalar: number | [number, number],
    }> = {}
): Gradient[] {
    const vu = (new Vector()).subVectors(u.center, v.center);
    const delta = vu.length() - control;
    const sign = delta > 0 ? 1 : -1;
    const mag = Math.pow(Math.max(Math.abs(delta), 0.1), power);
    // By default pointing away: v->u to u so scalar[0] and u->v to v so scalar[1].
    
    if(!Array.isArray(scalar)) scalar = [scalar, scalar]
    vu.normalize();
    const uv = vu.clone();
    vu.multiplyScalar(mag * scalar[0] * sign);
    uv.multiplyScalar(-mag * scalar[1] * sign);
    return [new Gradient(u.center, vu), new Gradient(v.center, uv)];
}

export function forcePairwise(
    p: Vector,
    q: Vector,
    magnitude: number | [number, number]
): [Gradient, Gradient] {
    if(!Array.isArray(magnitude)) magnitude = [magnitude, magnitude];
    const qp = (new Vector()).subVectors(p, q).normalize();
    const pq = qp.clone().negate();
    qp.multiplyScalar(magnitude[0]);
    pq.multiplyScalar(magnitude[1]);
    return [new Gradient(p, qp), new Gradient(q, pq)];
}

export function forcePairwiseNodes(
    u: Node,
    v: Node,
    magnitude: number | [number, number]
): Gradient[] {
    // TODO: Clean up interface to deal with fixed.
    const [gradu, gradv] = forcePairwise(u.center, v.center, magnitude);
    const grads: Gradient[] = [];
    if(!u.fixed) grads.push(gradu);
    if(!v.fixed) grads.push(gradv);
    return grads;
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
