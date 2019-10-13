import { Vector, Gradient } from '../optim';
import {
    Polygon as CollidablePolygon,
    Circle as CollidableCircle,
    Vector as CollidableVector,
    Box,
} from 'sat';

import {Box2} from 'three';

/** A lightweight specification that is transformed into a `Shape`. */
export type ShapeSchema<T extends Shape = Shape> = ReturnType<T['toSchema']>;

/**
 * A `Shape` represents a convex boundary of a node. It has preferred dimensions, but these may be
 * expanded in order to contain children nodes. Optionally, it can have padding (inside) or margin
 * (outside) of the boundary.
 */
export abstract class Shape {
    constructor(public readonly center: Vector, public preserve?: 'size' | 'ratio') {}

    /**
     * Returns the axis-aligned bounding box (AABB) around the shape.
     */
    public abstract bounds(): { x: number, X: number, y: number, Y: number, width: number, height: number };

    /**
     * Returns the point on the boundary in the specified `direction` with respect to the center.
     */
    public abstract boundary(direction: Vector, offset?: number): Vector;

    /**
     * Returns a point on the boundary that is furthest along the specified `direction`, i.e. a
     * support point.
     */
    public abstract support(direction: Vector): Vector;

    /**
     * Returns whether the specified point is contained within the shape.
     */
    public abstract contains(point: Vector, offset?: number): boolean;

    /**
     * Produces gradients which move the center and control point such that it encloses every shape in `subshapes` with the least total volume.
     * @param subshapes 
     * @param offset 
     */
    public abstract constrainShapesWithin(subshapes: Shape[], offset: number): [Gradient, Gradient] | [];

    /**
     * Produces gradients to keep the `point` within this shape, adjusting this shape's dimensions
     * and the `point`'s location according to the relative masses.
     * @param point 
     *     The point to constrain within this shape's boundary.
     * @param masses 
     *     The mass of this shape and the point, respectively.
     */
    public abstract constrainPointWithin(
        point: Vector,
        config?: Partial<{ masses: { shape: number, point: number }, expansion: number, offset: number }>
    ): Gradient[];

    /**
     * Produces gradients to keep the `point` on the shape's interior boundary.
     * @param point 
     *     The point to constrain to this shape's boundary.
     * @param masses 
     *     The mass of this shape and the point, respectively.
     */
    public abstract constrainPointOnBoundary(
        point: Vector,
        config?: Partial<{ masses: { shape: number, point: number }, expansion: number, offset: number }>
    ): Gradient[];

    public abstract toCollidable(): CollidablePolygon | CollidableCircle;

    /**
     * Transforms this `Shape` to a `ShapeSchema`.
     */
    public abstract toSchema(): Record<string, any> & { type: string, preserve?: 'size' | 'ratio' };
}

export function fromShapeSchema(schema: ShapeSchema, center: Vector): Shape {
    const { type, preserve } = schema;
    switch (type) {
        case 'rectangle': {
            const { width, height } = schema as ShapeSchema<Rectangle>;
            return new Rectangle(center, width, height, preserve);
        }
        case 'circle': {
            const { radius } = schema as ShapeSchema<Circle>;
            return new Circle(center, radius, preserve);
        }
        default: {
            throw Error(`Unrecognized ShapeSchema type: ${type}`);
        }
    }
}

export class Rectangle extends Shape {
    control: Vector;

    constructor(
        center: Vector,
        width: number,
        height: number,
        preserve?: 'size' | 'ratio',
    ) {
        super(center, preserve);
        this.control = new Vector(width / 2, height / 2);
    }

    public bounds() {
        return {
            x: this.center.x - this.control.x,
            X: this.center.x + this.control.x,
            y: this.center.y - this.control.y,
            Y: this.center.y + this.control.y,
            width: this.control.x * 2,
            height: this.control.y * 2,
        };
    }

    public boundary(direction: Vector, offset: number = 0) {
        for (let [start, end] of this._edges(offset)) {
            const pt = intersectSegment(start, end, direction);
            if (pt !== undefined) return pt.add(this.center);
        }
        throw Error(`No boundary point found: direction ${JSON.stringify(direction)}, edges ${JSON.stringify(this._edges())}`);
    }

    public support(direction: Vector) {
        let max = Number.NEGATIVE_INFINITY;
        let support: Vector | undefined;
        for (let vertex of this._vertices()) {
            const dot = vertex.dot(direction);
            if (dot > max) {
                support = vertex;
                max = dot;
            }
        }
        if (!support) throw Error(`No support point found: direction ${direction}`);
        return support.add(this.center);
    }

    public contains(point: Vector, offset: number = 0) {
        return (
            (point.x <= this.center.x + this.control.x + offset) &&
            (point.x >= this.center.x - this.control.x - offset) &&
            (point.y <= this.center.y + this.control.y + offset) &&
            (point.y >= this.center.y - this.control.y - offset)
        );
    }

    public constrainShapesWithin(subshapes: Shape[], offset: number = 0): [Gradient, Gradient] {
        let box = new Box2();
        subshapes.forEach((subshape) => {
            const { x, y, X, Y } = subshape.bounds();
            box.union(new Box2(new Vector(x, y), new Vector(X, Y)));
        });
        box.expandByScalar(offset);
        const centerGrad = (new Vector()).subVectors(box.getCenter(new Vector()), this.center);
        const controlGrad = (new Vector()).subVectors(box.max, (new Vector()).addVectors(this.control, this.center));
        return [new Gradient(this.center, centerGrad), new Gradient(this.control, controlGrad)];
    }

    public constrainPointWithin(point: Vector, { masses = { shape: 1, point: 1 }, expansion = 0, offset = 0 } = {}) {
        if (this.contains(point, offset)) return [];
        return this.constrainPointOnBoundary(point, { masses, expansion, offset });
    }

    public constrainPointOnBoundary(point: Vector, { masses = { shape: 1, point: 1 }, expansion = 0, offset = 0 } = {}) {
        const centerToPoint = (new Vector()).subVectors(point, this.center);
        const boundary = this.boundary(centerToPoint, offset).sub(this.center);
        const boundaryToPointOffset = centerToPoint.length() - boundary.length();
        const pointDelta = -boundaryToPointOffset * (masses.shape / (masses.shape + masses.point));
        const shapeDelta = boundaryToPointOffset * (masses.point / (masses.shape + masses.point));
        const centerDelta = shapeDelta * (1 - expansion);
        const boundaryDelta = shapeDelta * expansion;

        centerToPoint.normalize();
        const pointGrad = new Gradient(
            point,
            centerToPoint.clone().multiplyScalar(pointDelta),
        );
        const centerGrad = new Gradient(
            this.center,
            centerToPoint.clone().multiplyScalar(centerDelta),
        );
        // TODO: Preserve ratio, size, none
        const controlGrad = new Gradient(
            this.control,
            this.control.clone().multiplyScalar(boundaryDelta / boundary.length())
        );
        return [pointGrad, centerGrad, controlGrad];
    }

    public toCollidable() {
        // Vertices must be specified counter-clockwise,
        return new CollidablePolygon(
            new CollidableVector(this.center.x, this.center.y),
            this._vertices().map((vec) => new CollidableVector(vec.x, vec.y))
        );
    }

    public toSchema() {
        const { preserve } = this;
        const { width, height } = this.bounds();
        return { type: 'rectangle' as 'rectangle', preserve, width, height };
    }

    private _edges(offset: number = 0): Array<[Vector, Vector]> {
        const { x: halfwidth, y: halfheight } = this.control;
        const x = -halfwidth - offset, X = halfwidth + offset;
        const y = -halfheight - offset, Y = halfheight + offset;
        return [
            [new Vector(x, y), new Vector(X, y)],  // Top edge.
            [new Vector(x, Y), new Vector(X, Y)],  // Bottom edge.
            [new Vector(x, y), new Vector(x, Y)],  // Left edge.
            [new Vector(X, y), new Vector(X, Y)],  // Right edge.
        ];
    }

    private _vertices(offset: number = 0): Array<Vector> {
        const { x: halfwidth, y: halfheight } = this.control;
        const x = -halfwidth - offset, X = halfwidth + offset;
        const y = -halfheight - offset, Y = halfheight + offset;
        return [new Vector(x, y), new Vector(X, y), new Vector(X, Y), new Vector(x, Y)];
    }
}

export class Circle extends Shape {
    /** Point at the zero-angle point of a circle. */
    public radius: Vector;

    constructor(
        center: Vector,
        radius: number,
        preserve?: 'size' | 'ratio',
    ) {
        super(center, preserve);
        this.radius = new Vector(radius, 0);
    }

    public bounds() {
        return {
            x: this.center.x - this.radius.x,
            X: this.center.x + this.radius.x,
            y: this.center.y - this.radius.x,
            Y: this.center.y + this.radius.x,
            width: this.radius.x * 2,
            height: this.radius.x * 2,
        }
    }

    public boundary(direction: Vector, offset: number = 0) {
        return direction.clone().setLength(this.radius.x).add(this.center);
    }

    public support(direction: Vector, offset: number = 0) {
        return this.boundary(direction);
    }

    public contains(point: Vector, offset: number = 0) {
        return (new Vector()).subVectors(point, this.center).length() < this.radius.x;
    }

    public constrainShapesWithin(subshapes: Shape[], offset: number = 0): [Gradient, Gradient] {
        // TODO: do something smarter than bounding rectangle enclosure
        let box = new Box2();
        subshapes.forEach((subshape) => {
            const { x, y, X, Y } = subshape.bounds();
            box.union(new Box2(new Vector(x, y), new Vector(X, Y)));
        });
        box.expandByScalar(offset);
        const centerGrad = (new Vector()).subVectors(box.getCenter(new Vector()), this.center);
        const controlGrad = (new Vector()).subVectors(new Vector(box.getSize(new Vector()).multiplyScalar(0.5).length(), 0), this.radius);
        return [new Gradient(this.center, centerGrad), new Gradient(this.radius, controlGrad)];
    }

    public constrainPointWithin(point: Vector, { masses = { shape: 1, point: 1 }, expansion = 0, offset = 0 } = {}) {
        if (this.contains(point, offset)) return [];
        return this.constrainPointOnBoundary(point, { masses, expansion, offset });
    }

    public constrainPointOnBoundary(point: Vector, { masses = { shape: 1, point: 1 }, expansion = 0, offset = 0 } = {}) {
        const centerToPoint = (new Vector()).subVectors(point, this.center);
        const boundary = this.boundary(centerToPoint, offset).sub(this.center);
        const boundaryToPointOffset = centerToPoint.length() - boundary.length();
        const pointDelta = -boundaryToPointOffset * (masses.shape / (masses.shape + masses.point));
        const shapeDelta = boundaryToPointOffset * (masses.point / (masses.shape + masses.point));
        const centerDelta = shapeDelta * (1 - expansion);
        const boundaryDelta = shapeDelta * expansion;

        centerToPoint.normalize();
        const pointGrad = new Gradient(
            point,
            centerToPoint.clone().multiplyScalar(pointDelta),
        );
        const centerGrad = new Gradient(
            this.center,
            centerToPoint.clone().multiplyScalar(centerDelta),
        );
        // TODO: Preserve ratio, size, none
        const controlGrad = new Gradient(
            this.radius,
            this.radius.clone().multiplyScalar(boundaryDelta / boundary.length())
        );
        return [pointGrad, centerGrad, controlGrad];
    }

    public toCollidable() {
        return new CollidableCircle(new CollidableVector(this.center.x, this.center.y), this.radius.x);
    }

    public toSchema() {
        const { preserve } = this;
        return { type: 'circle' as 'circle', preserve, radius: this.radius.x };
    }
}

/**
 * Returns the point on a line segment intersected by a ray coming from the origin, or undefined if
 * no intersection. Segment and ray must not be degenerate (with zero length).
 * @param start
 *    Start point of segment with respect to the orgin.
 * @param end 
 *    End point of segment with respect to the origin.
 * @param ray
 *    Direction vector of ray starting from the orgin.
 */
function intersectSegment(start: Vector, end: Vector, ray: Vector): Vector | undefined {
    // Formulas for t and s derived by solving a system of linear equations:
    // [x, y] = start * (1 - t) + end * t,   where t in [0, 1]
    // [x, y] = ray * s,   where s in [0, inf)
    const delta = (new Vector()).subVectors(end, start);
    const denom = ray.y * delta.x - ray.x * delta.y;
    if (Math.abs(denom) < 1e-6) return undefined;  // Ray and segment are parallel.
    const t = (ray.x * start.y - ray.y * start.x) / denom;
    const s = (delta.x * start.y - delta.y * start.x) / denom;
    if (t < 0 || 1 < t || s < 0) return undefined;  // Ray doesn't point towards segment.
    return start.clone().multiplyScalar(1 - t).addScaledVector(end, t);
}