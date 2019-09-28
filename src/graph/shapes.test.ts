import {
    Rectangle,
    Circle,
} from './shapes';
import { Vector, Gradient } from '../optim';

function expectToMatchVector(actual: Vector, expected: { x: number, y: number }) {
    expect(actual.x).toBeCloseTo(expected.x);
    expect(actual.y).toBeCloseTo(expected.y);
}

describe('Rectangle works correctly', () => {
    test('bounds() derived correctly from control points', () => {
        const rect = new Rectangle(new Vector(1, 2), 2, 4);
        const bounds = rect.bounds();
        expect(bounds).toMatchObject({ x: 0, X: 2, y: 0, Y: 4});
    });
    test('toSchema() derived correctly from control points', () => {
        const rect = new Rectangle(new Vector(1, 2), 2, 4);
        const schema = rect.toSchema();
        expect(schema).toMatchObject({ type: 'rectangle', width: 2, height: 4 });
    });
    test('boundary() works for normalized and unnormalized rays', () => {
        const rect = new Rectangle(new Vector(1, 1), 2, 2);
        expectToMatchVector(rect.boundary(new Vector(1, 0)), new Vector(2, 1));
        expectToMatchVector(rect.boundary(new Vector(2, 0)), new Vector(2, 1));
        expectToMatchVector(rect.boundary(new Vector(0, 1)), new Vector(1, 2));
        expectToMatchVector(rect.boundary(new Vector(0, 2)), new Vector(1, 2));
        expectToMatchVector(rect.boundary(new Vector(-1, 0)), new Vector(0, 1));
        expectToMatchVector(rect.boundary(new Vector(0, -1)), new Vector(1, 0));
    });
    test('boundary() works with positive and negative offsets', () => {
        const rect = new Rectangle(new Vector(1, 1), 2, 2);

        expectToMatchVector(rect.boundary(new Vector(1, 0), 1), new Vector(3, 1));
        expectToMatchVector(rect.boundary(new Vector(-1, 0), 1), new Vector(-1, 1));
        expectToMatchVector(rect.boundary(new Vector(0, 1), 1), new Vector(1, 3));
        expectToMatchVector(rect.boundary(new Vector(0, -1), 1), new Vector(1, -1));

        expectToMatchVector(rect.boundary(new Vector(1, 0), -0.5), new Vector(1.5, 1));
        expectToMatchVector(rect.boundary(new Vector(-1, 0), -0.5), new Vector(0.5, 1));
        expectToMatchVector(rect.boundary(new Vector(0, 1), -0.5), new Vector(1, 1.5));
        expectToMatchVector(rect.boundary(new Vector(0, -1), -0.5), new Vector(1, 0.5));
    });
    test('constrainPointOnBoundary() control side, no expansion', () => {
        const rect = new Rectangle(new Vector(1, 1), 2, 2);
        const point = new Vector(4, 1);
        const [pointGrad, centerGrad, controlGrad] = rect.constrainPointOnBoundary(point, { masses: { shape: 1, point: 1}, expansion: 0 });

        expectToMatchVector(pointGrad.grad, new Vector(-1, 0));
        expectToMatchVector(centerGrad.grad, new Vector(1, 0));
        expectToMatchVector(controlGrad.grad, new Vector(0, 0));
    });
    test('constrainPointOnBoundary() only move point', () => {
        const rect = new Rectangle(new Vector(1, 1), 2, 2);
        const point = new Vector(4, 1);
        const [pointGrad, centerGrad, controlGrad] = rect.constrainPointOnBoundary(point, { masses: { shape: 1e9, point: 1}, expansion: 0 });

        expectToMatchVector(pointGrad.grad, new Vector(-2, 0));
        expectToMatchVector(centerGrad.grad, new Vector(0, 0));
        expectToMatchVector(controlGrad.grad, new Vector(0, 0));
    });
    test('constrainPointOnBoundary() control side, expansion, preserve ratio', () => {
        const rect = new Rectangle(new Vector(1, 1), 2, 2);
        const point = new Vector(4, 1);
        const [pointGrad, centerGrad, controlGrad] = rect.constrainPointOnBoundary(point, { masses: { shape: 1, point: 1}, expansion: 0.25 });

        expectToMatchVector(pointGrad.grad, new Vector(-1, 0));
        expectToMatchVector(centerGrad.grad, new Vector(0.75, 0));
        expectToMatchVector(controlGrad.grad, new Vector(0.25, 0.25));
    });
});