import { Vector, Gradient, BasicOptimizer } from './optimizer';

test('gradient updates correctly', () => {
    const pt = new Vector(1, 2);
    const grad = new Gradient(pt, new Vector(1, 1));
    const opt = new BasicOptimizer(0.5);

    opt.step([grad]);
    expect(pt).toEqual(new Vector(1.5, 2.5));

    opt.step([grad]);
    expect(pt).toEqual(new Vector(2, 3));
});
