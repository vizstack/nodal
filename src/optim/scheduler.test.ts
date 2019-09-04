import { Scheduler, constant, linear, exponential } from './scheduler';

test('out of bounds returns default value', () => {
    const scheduler = new Scheduler(86);
    expect(scheduler.get(-1)).toEqual(86);
    expect(scheduler.get(0)).toEqual(86);
    expect(scheduler.get(1)).toEqual(86);
});

test('bounds are [inclusive, exclusive)', () => {
    const scheduler = new Scheduler(86).to(2, constant(0)).to(3, constant(1));
    expect(scheduler.get(-1)).toEqual(86);
    expect(scheduler.get(0)).toEqual(0);
    expect(scheduler.get(1)).toEqual(0);
    expect(scheduler.get(2)).toEqual(1);
    expect(scheduler.get(3)).toEqual(86);
});

test('constant interpolation', () => {
    const scheduler = new Scheduler(86).to(2, constant(1));
    expect(scheduler.get(0)).toEqual(1);
    expect(scheduler.get(1)).toEqual(1);
    expect(scheduler.get(2)).toEqual(86);
});

test('linear interpolation (low to high)', () => {
    const scheduler = new Scheduler(86).to(2, linear(1, 3));
    expect(scheduler.get(0)).toEqual(1);
    expect(scheduler.get(1)).toEqual(2);
    expect(scheduler.get(2)).toEqual(86);
});

test('linear interpolation (high to low)', () => {
    const scheduler = new Scheduler(86).to(2, linear(3, 1));
    expect(scheduler.get(0)).toEqual(3);
    expect(scheduler.get(1)).toEqual(2);
    expect(scheduler.get(2)).toEqual(86);
});

test('exponential interpolation (low to high)', () => {
    const scheduler = new Scheduler(86).to(2, exponential(1, 3));
    expect(scheduler.get(0)).toEqual(1);
    expect(scheduler.get(2)).toEqual(86);
});

test('exponential interpolation (high to low)', () => {
    const scheduler = new Scheduler(86).to(2, exponential(3, 1));
    expect(scheduler.get(0)).toEqual(3);
    expect(scheduler.get(2)).toEqual(86);
});