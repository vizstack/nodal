import { Vector, Gradient } from '../optim';

/** A lightweight specification that is transformed into a `Shape`. */
export type ShapeSchema = {
    type: string,
    padding: number,
    margin: number,
    preserveSize: boolean,
    preserveAspectRatio: boolean,
}

/** Configuration options for a `Shape`. */
type ShapeConfig = {
    padding: number,
    margin: number,
    preserveSize: boolean,
    preserveAspectRatio: boolean,
};

/**
 * A `Shape` represents a convex boundary of a node. It has preferred dimensions, but these may be
 * expanded in order to contain children nodes. Optionally, it can have padding (inside) or margin
 * (outside) of the boundary.
 */
export abstract class Shape {
    public padding: number;
    public margin: number;
    public preserveSize: boolean;
    public preserveAspectRatio: boolean;
    constructor(
        public readonly center: Vector,
        {
            padding = 0,
            margin = 0,
            preserveSize = false,
            preserveAspectRatio = false,
        }: Partial<ShapeConfig> = {}) {
        this.padding = padding;
        this.margin = margin;
        this.preserveSize = preserveSize;
        this.preserveAspectRatio = preserveAspectRatio;
    }

    /**
     * Returns the axis-aligned bounding box (AABB) around the shape.
     */
    public abstract bounds(): { x: number, X: number, y: number, Y: number, width: number, height: number };

    /**
     * Returns the point on the boundary in the specified `direction` with respect to the center.
     */
    public abstract boundary(direction: Vector): Vector;

    /**
     * Returns a point on the boundary that is furthest along the specified `direction`, i.e. a
     * support point.
     */
    public abstract support(direction: Vector): Vector;

    /**
     * Returns whether the specified point is contained within the shape.
     */
    public abstract contains(point: Vector): boolean;

    /**
     * Produces gradients to keep `child` within this shape, adjusting this shape's dimensions and
     * the `child`'s location according to the relative masses.
     * @param children 
     * @param masses
     */
    public abstract forceContainShape(child: Shape, masses?: [number, number]): Gradient[];

    /**
     * Produces gradients to keep the `point` within the shape, adjusting this shape's dimensions
     * and the `point`'s location according to the relative masses.
     * @param point 
     * @param masses 
     */
    public abstract forceContainPoint(point: Vector, masses?: [number, number]): Gradient[];

    /**
     * Produces gradients to keep the `point` at a particular region on the shape's interior or
     * boundary.
     * @param point 
     * @param location 
     * @param masses 
     */
    public abstract forceConstrainPoint(point: Vector, location: string, masses?: [number, number]): Gradient[];

    /**
     * Transforms this `Shape` to a `ShapeSchema`.
     */
    public abstract toSchema(): ShapeSchema;

    /**
     * Transforms a `ShapeSchema` to a new `Shape`.
     */
    public abstract fromSchema(schema: ShapeSchema): Shape;
}

export class Rectangle extends Shape {
    // Lower and upper bounds of rectangele, in global coordinates.
    public lower: Vector;
    public upper: Vector;
    constructor(
        center: Vector,
        width: number,
        height: number,
        config: Partial<ShapeConfig> = {},
    ) {
        super(center, config);
        this.lower = new Vector(center.x - width / 2, center.y - height / 2);
        this.upper = new Vector(center.x + width / 2, center.y + height / 2);   
    }

    public bounds() {
        return { x: this.lower.x, y: this.lower.y, X: this.upper.x, Y: this.upper.y,
            width: this.upper.x - this.lower.x, height: this.upper.y - this.lower.y };
    }

    public boundary(direction: Vector) {
        for(let [start, end] of this._edges()) {
            const pt = intersectSegment(start, end, direction);
            if(pt !== undefined) return pt.add(this.center);
        }
        throw Error(`No boundary point found: direction ${direction}, edges ${this._edges()}`);
    }

    public support(direction: Vector) {
        let max = Number.NEGATIVE_INFINITY;
        let support: Vector | undefined;
        for(let vertex of this._vertices()) {
            const dot = vertex.dot(direction);
            if(dot > max) {
                support = vertex;
                max = dot;
            }
        }
        if(!support) throw Error(`No support point found: direction ${direction}`);
        return support.add(this.center);
    }

    public contains(point: Vector ) {
        const direction = (new Vector()).subVectors(point, this.center);
        return direction.lengthSq() < this.boundary(direction).lengthSq();
    }

    public forceContainShape(shape: Shape) {
        // TODO
        return [];
    }

    public forceContainPoint(point: Vector, masses?: [number, number]) {
        // TODO
        return [];
    }

    public forceConstrainPoint(
        point: Vector,
        location: 'boundary'|'north'|'south'|'east'|'west',
        masses?: [number, number]
    ) {
        // TODO
        return [];
    }

    public toSchema() {
        const { padding, margin, preserveSize, preserveAspectRatio } = this;
        const { width, height } = this.bounds();
        return {
            type: 'rectangle',
            padding, margin, preserveAspectRatio, preserveSize,
            width, height };
    }

    public fromSchema(schema: ShapeSchema) {
        // TODO
        return new Rectangle(this.center, 0, 0);
    }

    private _edges(): Array<[Vector, Vector]> {
        const x = this.lower.x - this.center.x, X = this.upper.x - this.center.x;
        const y = this.lower.y - this.center.y, Y = this.upper.y - this.center.y;
        return [
            [new Vector(x, y), new Vector(X, y)],  // Top edge.
            [new Vector(x, Y), new Vector(X, Y)],  // Bottom edge.
            [new Vector(x, y), new Vector(x, Y)],  // Left edge.
            [new Vector(X, y), new Vector(X, Y)],  // Right edge.
        ];
    }

    private _vertices(): Array<Vector> {
        const x = this.lower.x - this.center.x, X = this.upper.x - this.center.x;
        const y = this.lower.y - this.center.y, Y = this.upper.y - this.center.y;
        return [new Vector(x, y), new Vector(X, y), new Vector(x, Y), new Vector(X, Y)];
    }
}

// export class Circle extends Shape {

// }

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