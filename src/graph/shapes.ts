import { Vector, Gradient } from '../optim';
import {
    Polygon as CollidablePolygon,
    Circle as CollidableCircle,
    Vector as CollidableVector,
} from 'sat';

/** A lightweight specification that is transformed into a `Shape`. */
export type ShapeSchema<T extends Shape = Shape> = ReturnType<T['toSchema']>;

/**
 * A `Shape` represents a convex boundary of a node. It has preferred dimensions, but these may be
 * expanded in order to contain children nodes. Optionally, it can have padding (inside) or margin
 * (outside) of the boundary.
 */
export abstract class Shape {
    /** Half-width and half-height, with respect to the center. */
    protected readonly control: Vector;
    protected readonly originalControl: Vector;

    constructor(public readonly center: Vector, public width: number, public height: number, public preserve?: 'size' | 'ratio') {
        this.control = new Vector(width / 2, height / 2);
        this.originalControl = this.control.clone();
    }

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
     * Produces gradients to keep the child `shape` within this shape, adjusting this shape's dimensions and the child `shape`'s location according to the relative masses.
     * @param shape
     *     The shape to constrain within this shape's boundary.
     * @param masses
     *     The mass of this shape and the child shape, respectively.
     */
    public abstract constrainShapeWithin(
        shape: Shape,
        config?: Partial<{ masses: { shape: number, subshape: number }, expansion: number, offset: number }>
    ): Gradient[];

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

    /**
     * 
     */
    public constrainControl(): Gradient[] {
        if (this.preserve === "size") {
            return [new Gradient(this.control, (new Vector()).subVectors(this.originalControl, this.control))];
        }
        const grads = []
        if (this.preserve === "ratio") {
            // Set control to be the projection of `this.control` onto `this.originalControl`
            grads.push(new Gradient(this.control, this.originalControl.clone().multiplyScalar(this.originalControl.dot(this.control)/this.originalControl.lengthSq()).sub(this.control)));
        }
        if (this.control.x < 0) {
            grads.push(new Gradient(this.control, new Vector(-this.control.x + 0.1, 0)));
        }
        if (this.control.y < 0) {
            grads.push(new Gradient(this.control, new Vector(0, -this.control.y + 0.1)));
        }
        return grads;
    }

    public nudgeControl(vector: [number, number]): Gradient[] {
        return [new Gradient(this.control, new Vector(...vector))];
    }

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
    constructor(
        center: Vector,
        width: number,
        height: number,
        preserve?: 'size' | 'ratio',
    ) {
        super(center, width, height, preserve);
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

    public constrainShapeWithin(subshape: Shape, { masses = { shape: 1, subshape: 1 }, expansion = 0, offset = 0 } = {}) {
        const grads: Gradient[][] = [];
        for(let normal of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const support = subshape.support(new Vector(normal[0], normal[1]));
            const g = this.constrainPointWithin(support, { masses: { shape: masses.shape, point: masses.subshape }, expansion, offset });
            if(g.length === 0) continue;
            const [pointGrad, centerGrad, controlGrad] = g;
            grads.push([new Gradient(subshape.center, pointGrad.grad), centerGrad, controlGrad]);
        }
        return grads.flat();
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
        super(center, radius * 2, radius * 2, preserve);
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

    public boundary(direction: Vector) {
        return direction.clone().setLength(this.radius.x).add(this.center);
    }

    public support(direction: Vector) {
        return this.boundary(direction);
    }

    public contains(point: Vector) {
        return (new Vector()).subVectors(point, this.center).length() < this.radius.x;
    }

    public constrainShapeWithin(shape: Shape, { masses = { shape: 1, subshape: 1 }, expansion = 0, offset = 0 } = {}) {
        // TODO
        return [];
    }

    public constrainPointWithin(point: Vector, { masses = { shape: 1, point: 1 }, expansion = 0, offset = 0 } = {}) {
        // TODO
        return [];
    }

    public constrainPointOnBoundary(point: Vector, { masses = { shape: 1, point: 1 }, expansion = 0, offset = 0 } = {}) {
        // TODO
        return [];
    }

    public toCollidable() {
        return new CollidableCircle(new CollidableVector(this.center.x, this.center.y), this.control.x);
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