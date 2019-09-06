/**
 * These functions output gradients to induce certain properties on Point and Nodes. These gradients
 * can function as 'soft' forces  or 'hard' constraints depending on the learning rate. A 'position'
 * function produces a gradient that has geometric meaning, i.e. a shift in position, whereas a
 * 'force' function produces a gradient that matters more in direction than in magnitude.
 */
import { Point, Gradient } from '../optim';
import { Node, Edge } from './elements';

/**
 * Constrains the Euclidean distance between points, optionally after projection onto a specified
 * direction. The mass of a point determines its inertia, i.e. with more mass it moves less.
 */
export function constrainDistance(
    p: Point,
    q: Point,
    op: '=' | '>=' | '<=',
    distance: number,
    direction?: [number, number],
    masses?: [number, number],
): Gradient[] {
    // TODO
    return [];
}

/**
 * Constrains the angle of the segment between points. The mass of a point determines its inertia
 * i.e. with more mass it moves less.
 */
export function constrainAngle(
    p: Point,
    q: Point,
    angle: number,
    masses?: [number, number],
): Gradient[] {
    // TODO
    return [];
}

export function positionNoOverlap(u: Node, v: Node): Gradient[] {
    // TODO
    return [];
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

export function forceElectrical(u: Node, v: Node): Gradient[] {
    // TODO
    return [];
}

export function forceSpring(u: Node, v: Node): Gradient[] {
    // TODO
    return [];
}

export function forceGravity(u: Node, direction: [number, number]): Gradient[] {
    // TODO
    return [];
}
