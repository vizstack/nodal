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
        protected storage: Storage,
        protected forceIterFn: (storage: Storage, step: number, iter: number) => IterableIterator<Gradient[]>,
        protected constraintIterFn: (storage: Storage, step: number, iter: number) => IterableIterator<Gradient[]>,
        config: Partial<ForceConstraintLayoutConfig> = {},
    ) {
        super();
        const {
            numSteps = 10,
            numForceIters = 1,
            numConstraintIters = 10,
            // forceOptimizer = new TrustRegionOptimizer(),
            forceOptimizer = new BasicOptimizer(1),
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
        const { onStart, onEnd } = this.config;
        if (!onStart(this.storage, this.steps)) return;
        while (this.steps < this.config.numSteps) {
            this.steps += 1;
            if (this.step() === false) {
                // If break out early, do not trigger `onEnd`.
                return;
            }
        }
        onEnd(this.storage, this.steps);
    }

    public step(): boolean {
        const {
            numForceIters,
            numConstraintIters,
            forceOptimizer,
            constraintOptimizer,
            onStep,
        } = this.config;

        for (let i = 1; i <= numForceIters; i++) {
            const forceGradGen = this.forceIterFn(this.storage, this.steps, i);
            let forceGrads;
            while(true) {
                // Must use manual iteration, not for-of loop, in order to access return value.
                forceGrads = forceGradGen.next();
                if(forceGrads.value) forceOptimizer.step(forceGrads.value);
                if(forceGrads.done) break;
            }
            forceOptimizer.update();
        }

        for (let j = 1; j <= numConstraintIters; j++) {
            const constraintGradGen = this.constraintIterFn(this.storage, this.steps, j);
            let constraintGrads;
            while(true) {
                constraintGrads = constraintGradGen.next();
                if(constraintGrads.value) constraintOptimizer.step(constraintGrads.value);
                if(constraintGrads.done) break;
            }
            constraintOptimizer.update();
        }

        return onStep(this.storage, this.steps);
    }

    public onStart(onStart: ForceConstraintLayoutConfig['onStart']) {
        this.config.onStart = onStart;
    }

    public onStep(onStep: ForceConstraintLayoutConfig['onStep']) {
        this.config.onStep = onStep;
    }
    public onEnd(onEnd: ForceConstraintLayoutConfig['onEnd']) {
        this.config.onEnd = onEnd;
    }
}
