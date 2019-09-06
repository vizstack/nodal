import { Point, Gradient, BasicOptimizer } from './optimizer';

test('gradient updates correctly', () => {
    const pt = new Point(1, 2);
    const grad = new Gradient(pt, 1, 1);
    const opt = new BasicOptimizer(0.5);

    opt.step([grad]);
    expect(pt).toEqual(new Point(1.5, 2.5));

    opt.step([grad]);
    expect(pt).toEqual(new Point(2, 3));
});
