import { BooleanScheduler, NumberScheduler, constant, linear, exponential } from './scheduler';

describe('BooleanScheduler works correctly', () => {

    test('out of bounds returns default value', () => {
        const scheduler = new BooleanScheduler(true);
        expect(scheduler.get(-1)).toEqual(true);
        expect(scheduler.get(0)).toEqual(true);
        expect(scheduler.get(1)).toEqual(true);
    });

    test('bounds are [inclusive, exclusive)', () => {
        const scheduler = new BooleanScheduler(false).to(2, true).to(3, false).to(4, true);
        expect(scheduler.get(-1)).toEqual(false);
        expect(scheduler.get(0)).toEqual(true);
        expect(scheduler.get(1)).toEqual(true);
        expect(scheduler.get(2)).toEqual(false);
        expect(scheduler.get(3)).toEqual(true);
        expect(scheduler.get(4)).toEqual(false);
    });

});

describe('NumberScheduler works correctly', () => {

    test('out of bounds returns default value', () => {
        const scheduler = new NumberScheduler(86);
        expect(scheduler.get(-1)).toEqual(86);
        expect(scheduler.get(0)).toEqual(86);
        expect(scheduler.get(1)).toEqual(86);
    });

    test('bounds are [inclusive, exclusive)', () => {
        const scheduler = new NumberScheduler(86).to(2, constant(0)).to(3, constant(1));
        expect(scheduler.get(-1)).toEqual(86);
        expect(scheduler.get(0)).toEqual(0);
        expect(scheduler.get(1)).toEqual(0);
        expect(scheduler.get(2)).toEqual(1);
        expect(scheduler.get(3)).toEqual(86);
    });

    test('constant interpolation', () => {
        const scheduler = new NumberScheduler(86).to(2, constant(1));
        expect(scheduler.get(0)).toEqual(1);
        expect(scheduler.get(1)).toEqual(1);
        expect(scheduler.get(2)).toEqual(86);
    });

    test('linear interpolation (low to high)', () => {
        const scheduler = new NumberScheduler(86).to(2, linear(1, 3));
        expect(scheduler.get(0)).toEqual(1);
        expect(scheduler.get(1)).toEqual(2);
        expect(scheduler.get(2)).toEqual(86);
    });

    test('linear interpolation (high to low)', () => {
        const scheduler = new NumberScheduler(86).to(2, linear(3, 1));
        expect(scheduler.get(0)).toEqual(3);
        expect(scheduler.get(1)).toEqual(2);
        expect(scheduler.get(2)).toEqual(86);
    });

    test('exponential interpolation (low to high)', () => {
        const scheduler = new NumberScheduler(86).to(2, exponential(1, 3));
        expect(scheduler.get(0)).toEqual(1);
        expect(scheduler.get(2)).toEqual(86);
    });

    test('exponential interpolation (high to low)', () => {
        const scheduler = new NumberScheduler(86).to(2, exponential(3, 1));
        expect(scheduler.get(0)).toEqual(3);
        expect(scheduler.get(2)).toEqual(86);
    });

});
