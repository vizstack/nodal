/**
 * A `NumberScheduler` returns some numeric value that changes over time according to a sequence of
 * interpolation functions.
 */
export class NumberScheduler {
    private _interpolators: Array<[number, number, Interpolator]> = [];
    private _end: number = 0;
    private _defaultValue: number;

    constructor(defaultValue: number = 0) {
        this._defaultValue = defaultValue;
    }

    /**
     * Appends an interpolation trajectory from current end *to* timestep `t`, i.e. `[end, t)`.
     * @param t
     * @param fn
     */
    public to(t: number, fn: Interpolator): NumberScheduler {
        if (t <= this._end) throw Error(`Already set in range [0, ${this._end}); got t = ${t}`);
        this._interpolators.push([this._end, t, fn]);
        this._end = t;
        return this;
    }

    /**
     * Appends an interpolation trajectory from current end *for* `deltat` timesteps, i.e.
     * `[end, end + deltat)`.
     * @param deltat
     * @param fn
     */
    public for(deltat: number, fn: Interpolator): NumberScheduler {
        if (deltat < 1) throw Error(`New range must be positive; got deltat = ${deltat}`);
        this._interpolators.push([this._end, this._end + deltat, fn]);
        this._end += deltat;
        return this;
    }

    /**
     * Returns value at the specified timestep `t`.
     * @param t
     */
    public get(t: number): number {
        if (t < 0 || this._end <= t) return this._defaultValue;
        for (const [start, end, fn] of this._interpolators) {
            if (start <= t && t < end) {
                return fn((t - start) / (end - start));
            }
        }
        return this._defaultValue;
    }
}

/**
 * A function that performs an interpolation of some given curve, given some `u` between 0 and 1,
 * inclusive.
 */
type Interpolator = (u: number) => number;

/**
 * Constant `value` throughout the range.
 * @param value
 */
export function constant(value: number): Interpolator {
    return (u) => value;
}

/**
 * Linearly interpolates from `start` to `end`.
 * @param start
 * @param end
 */
export function linear(start: number, end: number): Interpolator {
    return (u) => (end - start) * u + start;
}

/**
 * Exponentially interpolates from `start` to `end`, with different curvature.
 * @param start
 * @param end
 * @param curvature
 *     Positive is concave up, while negative is concave down. Magnitude controls the steepness of
 *     the ascent/descent.
 */
export function exponential(start: number, end: number, curvature: number = 1): Interpolator {
    // For numerical stability, use linear when have small curvature.
    if (Math.abs(curvature) < 0.1) return linear(start, end);
    if (start <= end) {
        return (u) =>
            ((Math.pow(2, curvature * u) - 1) / (Math.pow(2, curvature) - 1)) * (end - start) +
            start;
    } else {
        return (u) =>
            ((Math.pow(2, curvature * (1 - u)) - 1) / (Math.pow(2, curvature) - 1)) *
                (start - end) +
            end;
    }
}

/**
 * A `BooleanScheduler` returns some boolean value that changes over time according to a sequence of
 * active ranges.
 */
export class BooleanScheduler {
    private _values: Array<[number, number, boolean]> = [];
    private _end: number = 0;
    private _defaultValue: boolean;

    constructor(defaultValue: boolean = false) {
        this._defaultValue = defaultValue;
    }

    /**
     * Appends an value from current end *to* timestep `t`, i.e. `[end, t)`.
     * @param t
     * @param value
     */
    public to(t: number, value: boolean): BooleanScheduler {
        if (t <= this._end) throw Error(`Already set in range [0, ${this._end}); got t = ${t}`);
        this._values.push([this._end, t, value]);
        this._end = t;
        return this;
    }

    /**
     * Appends an interpolation trajectory from current end *for* `deltat` timesteps, i.e.
     * `[end, end + deltat)`.
     * @param deltat
     * @param value
     */
    public for(deltat: number, value: boolean): BooleanScheduler {
        if (deltat < 1) throw Error(`New range must be positive; got deltat = ${deltat}`);
        this._values.push([this._end, this._end + deltat, value]);
        this._end += deltat;
        return this;
    }

    /**
     * Returns value at the specified timestep `t`.
     * @param t
     */
    public get(t: number): boolean {
        if (t < 0 || this._end <= t) return this._defaultValue;
        for (const [start, end, value] of this._values) {
            if (start <= t && t < end) {
                return value;
            }
        }
        return this._defaultValue;
    }
}
