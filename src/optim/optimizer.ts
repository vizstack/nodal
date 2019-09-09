import { Vector2 } from 'three';

/**
 * A `Vector` in 2D space is the base entity manipulated by the `Optimizer`. All higher-level
 * entities (like simple and compound nodes, ports, etc.) are represented as a collection of points.
 */
export class Vector extends Vector2 {}

/**
 * A `Gradient` associates a point `Vector` to a gradient `Vector` that the `Optimizer` uses to
 * update the point's location in space. A `Gradient` can act as a "soft" force or a "hard"
 * constraint depending on how aggressively the `Optimizer` enforces it (through the learning rate).
 */
export class Gradient {
    constructor(public point: Vector, public grad: Vector) {}
}

/**
 * An `Optimizer` performs an update to a `Vector` based on a `Gradient`. It uses *gradient ascent*,
 * which means that the gradient vector should already point in the intended direction of update and
 * the update rule takes the form: `x = x + lr * grad`. This fits with the physical iterpretation
 * of a gradient as a "nudge" in a particular direction due to forces or constraints.
 */
export abstract class Optimizer {
    public abstract step(gradients: Gradient[]): void;
}

/**
 * A `BasicOptimizer` uses a fixed learning rate.
 */
export class BasicOptimizer extends Optimizer {
    // TODO: Momentum, shuffle.
    constructor(private lr: number = 1) {
        super();
    }

    public step(gradients: Gradient[]): void {
        gradients.forEach((grad) => grad.point.add(grad.grad.clone().multiplyScalar(this.lr)));
    }
}

/** Configuration options for a `TrustRegionOptimizer`. */
export type TrustRegionOptimizerConfig = {
    lrInitial: number;
    adaption: number;
    wait: number;
    lrMax: number;
    lrMin: number;
};

/**
 * A `TrustRegionOptimizer` uses an adaptive scheme to increase or decrease the learning rate based
 * on whether there is improvement on an energy function (lower than before).
 */
export class TrustRegionOptimizer extends Optimizer {
    protected _config: TrustRegionOptimizerConfig;
    protected _numStepsImproved: number = 0;
    protected _prevEnergy: number = Number.MAX_VALUE;
    protected _lr: number;

    constructor(config: Partial<TrustRegionOptimizerConfig> = {}) {
        super();
        const { lrInitial = 1, adaption = 0.9, wait = 5, lrMax = 1, lrMin = 0.01 } = config;
        if (adaption > 1) throw Error('Must specify value of `adaption` <= 1');
        if (wait < 0) throw Error('Must specify value of `wait` >= 0');
        this._config = { lrInitial, adaption, wait, lrMax, lrMin };
        this._lr = lrInitial;
    }

    private _update(currEnergy: number) {
        if (currEnergy < this._prevEnergy) {
            this._numStepsImproved += 1;
            if (this._numStepsImproved >= this._config.wait) {
                // Steady improvement, so increase learning rate.
                this._numStepsImproved = 0;
                this._lr /= this._config.adaption;
            }
        } else {
            // No improvement, so decrease learning rate.
            this._numStepsImproved = 0;
            this._lr *= this._config.adaption;
        }
    }

    public step(gradients: Gradient[]): void {
        let currEnergy: number = 0;
        gradients.forEach((grad) => {
            grad.point.add(grad.grad.clone().multiplyScalar(this._lr));
            currEnergy += grad.grad.length();
        });
        this._update(currEnergy);
    }
}
