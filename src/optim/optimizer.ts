import { Vector2 } from 'three';
import { NumberScheduler } from './scheduler';

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
    public abstract update(): void;
}

/**
 * A `BasicOptimizer` uses a fixed learning rate and decay factor.
 */
export class BasicOptimizer extends Optimizer {
    constructor(public lr: number = 1, public decay: number = 1) {
        super();
    }

    public step(gradients: Gradient[]) {
        gradients.forEach(({grad, point}) => point.addScaledVector(grad, this.lr));
    }

    public update() {
        this.lr = Math.max(this.lr * this.decay, 0.01);
    }
}

/**
 * A `ScheduledOptimizer` uses a variable learning rate set by a `Scheduler`.
 */
export class ScheduledOptimizer extends Optimizer {
    protected _timestep: number;
    protected _lr: number;
    constructor(public scheduler: NumberScheduler) {
        super();
        this._timestep = 0;
        this._lr = scheduler.get(0);
    }

    public step(gradients: Gradient[]) {
        gradients.forEach(({grad, point}) => point.addScaledVector(grad, this._lr));
    }

    public update() {
        this._timestep += 1;
        this._lr = this.scheduler.get(this._timestep);
    }
}

/** Configuration options for a `TrustRegionOptimizer`. */
type EnergyOptimizerConfig = {
    /** Initial learning rate. (default: 1) */
    lrInitial: number;

    /** Maximum learning rate. (default: 1) */
    lrMax: number;

    /** Minimum learning rate. (default: 0.01) */
    lrMin: number;

    /** How many `update()` calls need to elapse with energy improvement, before learning rate is
     * increased. (default: 5) */
    wait: number;

    /** Scalar to decrease learning rate when there is no improvement on energy. (default: 0.9) */
    decay: number;

    /** Scalar to increase learning rate when there is improvement on energy. (default: 1.1) */
    growth: number;

    /** Scalar to control amount of smoothing between previous and current energy calculation.
     * Value of 0 means only use current, while 1 means only use previous. (default: 0.1) */
    smoothing: number;
};

/**
 * A `EnergyOptimizer` uses an adaptive scheme to increase or decrease the learning rate based
 * on whether there is improvement on an energy function (lower than before). The energy function
 * is the squared norm of all the gradients between successive `update()` calls.
 */
export class EnergyOptimizer extends Optimizer {
    protected _config: EnergyOptimizerConfig;
    protected _numStepsImproved: number = 0;
    protected _prevEnergy?: number;
    protected _currEnergy: number = 0;
    protected _lr: number;

    constructor(config: Partial<EnergyOptimizerConfig> = {}) {
        super();
        const { lrInitial = 1, wait = 5, lrMax = 1, lrMin = 0.01, decay = 0.9, growth = 1.1, smoothing = 0.1 } = config;
        if (decay > 1) throw Error('Must specify value of `decay` <= 1');
        if (growth < 1) throw Error('Must specify value of `growth` >= 1');
        if (wait < 0) throw Error('Must specify value of `wait` >= 0');
        this._config = { lrInitial,lrMax, lrMin, wait, decay, growth, smoothing };
        this._lr = lrInitial;
    }

    public step(gradients: Gradient[]): void {
        let energy: number = 0;
        gradients.forEach((grad) => {
            grad.point.add(grad.grad.clone().multiplyScalar(this._lr));
            energy += grad.grad.length();
        });
        energy /= (gradients.length + 1);
        this._currEnergy += energy;
    }

    public update() {
        if(!this._prevEnergy) this._prevEnergy = this._currEnergy;
        if (this._currEnergy < this._prevEnergy) {
            this._numStepsImproved += 1;
            if (this._numStepsImproved >= this._config.wait) {
                // Steady improvement, so increase learning rate.
                this._numStepsImproved = 0;
                this._lr = Math.min(this._config.growth * this._lr, this._config.lrMax);
                // console.log('improve', this._lr, this._currEnergy, this._prevEnergy);
            }
        } else if (this._currEnergy > this._prevEnergy) {
            // No improvement, so decrease learning rate.
            this._numStepsImproved = 0;
            this._lr = Math.max(this._config.decay * this._lr, this._config.lrMin);
            // console.warn('no improve', this._lr, this._currEnergy, this._prevEnergy);
        }
        this._prevEnergy *= this._config.smoothing;
        this._prevEnergy += (1 - this._config.smoothing) * this._currEnergy;
        this._currEnergy = 0;
    }

}

/** 
 * A `RMSPropOptimizer` uses an adaptive scheme based on a per-parameter moving weighted average of
 * magnitudes.
 */
export class RMSPropOptimizer extends Optimizer {
    protected _square_avgs: Map<Vector, Vector>;

    constructor(public lr: number = 1, public smoothing: number = 0.99) {
        super();
        this._square_avgs = new Map();
    }

    public step(gradients: Gradient[]) {
        gradients.forEach(({ grad, point }) => {
            // Calculate smoothed average of squared gradients.
            let square_avg = this._square_avgs.get(point) || new Vector(0, 0);
            square_avg = square_avg.multiplyScalar(this.smoothing).addScaledVector(grad.clone().multiply(grad), 1 - this.smoothing);
            this._square_avgs.set(point, square_avg);
            
            point.x += this.lr * grad.x / (Math.sqrt(square_avg.x) + 1e-3);
            point.y += this.lr * grad.y / (Math.sqrt(square_avg.y) + 1e-3);
        });
    }

    public update() {}
}

/**
 * A `TrustRegionOptimizer` uses an adaptive scheme that increasing the learning rate if the
 * gradients are growing, and decreasing the learning rate if the gradients are shrinking.
 */
export class TrustRegionOptimizer extends Optimizer {
    protected _norm_avgs: Map<Vector, number>;
    protected _lrs: Map<Vector, number>;

    constructor(protected lr: number = 0.6, protected adaption: number = 0.1, protected smoothing: number = 0.5, protected lrMax: number = 1, protected lrMin: number = 0.00001) {
        super();
        this._norm_avgs = new Map();
        this._lrs = new Map();
    }

    public step(gradients: Gradient[]) {
        gradients.forEach(({ grad, point }) => {
            // Calculate smoothed averages of squared gradients.
            let norm_avg = this._norm_avgs.get(point) || grad.length();
            norm_avg = norm_avg * this.smoothing + grad.length() * (1 - this.smoothing);
            this._norm_avgs.set(point, norm_avg);

            // Increase learning rate if gradients are growing.
            let lr = this._lrs.get(point) || this.lr;
            lr = grad.length()/(norm_avg + 1e-3) >=0.5 ? Math.min(this.lrMax, (1+this.adaption)*lr) : Math.max(this.lrMin, (1-this.adaption)*lr)
            this._lrs.set(point, lr);
            // console.log(grad.length() > norm_avg, lr);

            point.addScaledVector(grad, lr);
        });
    }

    public update() {}
}
