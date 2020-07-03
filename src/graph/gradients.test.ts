import { constrainOffset, constrainDistance, nudgeAngle } from './gradients';
import { Vector, Gradient } from '../optim';

function expectToMatchVector(actual: Vector, expected: { x: number; y: number }) {
    expect(actual.x).toBeCloseTo(expected.x);
    expect(actual.y).toBeCloseTo(expected.y);
}

describe('constrainDistance works correctly', () => {
    test('both positive, no axis', () => {
        let grads: Gradient[] = [];

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 0), '>=', 0.5);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 0), '<=', 1.5);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 0), '=', 1);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 0), '=', 2);
        expectToMatchVector(grads[0].grad, { x: -0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: 0.5, y: 0 });

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 0), '=', 0);
        expectToMatchVector(grads[0].grad, { x: 0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: -0.5, y: 0 });
    });

    test('both negative, no axis', () => {
        let grads: Gradient[] = [];

        grads = constrainDistance(new Vector(-1, 0), new Vector(-2, 0), '>=', 0.5);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(-1, 0), new Vector(-2, 0), '<=', 1.5);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(-1, 0), new Vector(-2, 0), '=', 1);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(-1, 0), new Vector(-2, 0), '=', 2);
        expectToMatchVector(grads[0].grad, { x: 0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: -0.5, y: 0 });

        grads = constrainDistance(new Vector(-1, 0), new Vector(-2, 0), '=', 0);
        expectToMatchVector(grads[0].grad, { x: -0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: 0.5, y: 0 });
    });

    test('different sign, no axis', () => {
        let grads: Gradient[] = [];

        grads = constrainDistance(new Vector(-1, 0), new Vector(1, 0), '>=', 1.5);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(-1, 0), new Vector(1, 0), '<=', 2.5);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(-1, 0), new Vector(1, 0), '=', 2);
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(-1, 0), new Vector(1, 0), '=', 1);
        expectToMatchVector(grads[0].grad, { x: 0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: -0.5, y: 0 });

        grads = constrainDistance(new Vector(-1, 0), new Vector(1, 0), '=', 3);
        expectToMatchVector(grads[0].grad, { x: -0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: 0.5, y: 0 });
    });

    test('positive dot with axis', () => {
        let grads: Gradient[] = [];

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '>=', 0.5, { axis: [1, 0] });
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '<=', 1.5, { axis: [1, 0] });
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '=', 1, { axis: [1, 0] });
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '=', 2, { axis: [1, 0] });
        expectToMatchVector(grads[0].grad, { x: -0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: 0.5, y: 0 });

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '=', 0, { axis: [1, 0] });
        expectToMatchVector(grads[0].grad, { x: 0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: -0.5, y: 0 });
    });

    test('negative dot with axis', () => {
        let grads: Gradient[] = [];

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '>=', 0.5, { axis: [-1, 0] });
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '<=', 1.5, { axis: [-1, 0] });
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '=', 1, { axis: [-1, 0] });
        expect(grads).toHaveLength(0);

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '=', 2, { axis: [-1, 0] });
        expectToMatchVector(grads[0].grad, { x: -0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: 0.5, y: 0 });

        grads = constrainDistance(new Vector(1, 0), new Vector(2, 1), '=', 0, { axis: [-1, 0] });
        expectToMatchVector(grads[0].grad, { x: 0.5, y: 0 });
        expectToMatchVector(grads[1].grad, { x: -0.5, y: 0 });
    });
});
