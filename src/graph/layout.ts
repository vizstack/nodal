import { Optimizer, BasicOptimizer, TrustRegionOptimizer, Gradient } from '../optim';
import { Storage } from './storage';

/**
 * A `Layout` defines the structure of a graph layout optimization procedure. It allows both
 * executing the entire procedure automatically and stepping through the procedure manually.
 */
export abstract class Layout {
    /**
     * Runs the layout optimization until some convergence criterion is met.
     */
    public abstract start(): void;

    /**
     * Performs a single step of the layout optimization.
     */
    public abstract step(): void;
}

/** Configuration options for a `ForceConstraintLayout`. */
export type ForceConstraintLayoutConfig = {
    numSteps: number;
    numForceIters: number;
    numConstraintIters: number;
    forceOptimizer: Optimizer;
    constraintOptimizer: Optimizer;
    onStart: (elems: Storage, step: number) => boolean;
    onStep: (elems: Storage, step: number) => boolean;
    onEnd: (elems: Storage, step: number) => void;
};

/**
 * A `ForceConstraintLayout` performs a fixed number of optimization steps, and each step
 * performs some iterations of 'force' optimization then 'constraint' optimization. Whereas the
 * 'force' gradients are weighted by some adaptive learning rate, the 'constraint' gradients are
 * always weighted by 1. This enables the kind of 'constraint projection' described in "Scalable
 * versatile, and simple constrained graph layout" (Dwyer 2009). Another interpretation is that
 * 'force' gradients have magitudes in a different space than the points (force-space), whereas
 * 'constraint' gradients are in the same space (position-space).
 */
export class ForceConstraintLayout extends Layout {
    protected config: ForceConstraintLayoutConfig;
    protected steps: number;
    constructor(
        protected elems: Storage,
        protected forceIterFn: (elems: Storage, step: number, iter: number) => Gradient[],
        protected constraintIterFn: (elems: Storage, step: number, iter: number) => Gradient[],
        config: Partial<ForceConstraintLayoutConfig> = {},
    ) {
        super();
        const {
            numSteps = 10,
            numForceIters = 1,
            numConstraintIters = 10,
            // forceOptimizer = new TrustRegionOptimizer({ lrInitial: 0.1, lrMax: 0.1 }),
            forceOptimizer = new BasicOptimizer(0.1),
            constraintOptimizer = new BasicOptimizer(1),
            onStart = () => true,
            onStep = () => true,
            onEnd = () => undefined,
        } = config;
        this.config = {
            numSteps,
            numForceIters,
            numConstraintIters,
            forceOptimizer,
            constraintOptimizer,
            onStart,
            onStep,
            onEnd,
        };
        this.steps = 0;
    }

    // Manually stepping does not contribute to counter.
    public start() {
        const { onStart, onStep, onEnd } = this.config;
        if (!onStart(this.elems, this.steps)) return;
        while (this.steps < this.config.numSteps) {
            this.steps += 1;
            this.step();
            if (onStep(this.elems, this.steps) === false) {
                // If break out early, do not trigger `onEnd`.
                return;
            }
        }
        onEnd(this.elems, this.steps);
    }

    public step() {
        const {
            numForceIters,
            numConstraintIters,
            forceOptimizer,
            constraintOptimizer,
        } = this.config;

        for (let i = 1; i <= numForceIters; i++) {
            const forceGrads = this.forceIterFn(this.elems, this.steps, i);
            forceOptimizer.step(forceGrads);
        }

        for (let j = 1; j <= numConstraintIters; j++) {
            const constraintGrads = this.constraintIterFn(this.elems, this.steps, j);
            constraintOptimizer.step(constraintGrads);
        }
    }
}
