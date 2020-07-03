import { Optimizer, Gradient } from '../optim';
import { Storage } from './storage';

/**
 * A `Layout` defines the structure of a graph layout optimization procedure. It allows both
 * executing the entire procedure automatically and stepping through the procedure manually.
 */
export abstract class Layout<S extends Storage> {
    constructor(public storage: S) {}

    /**
     * Runs the layout optimization until some convergence criterion is met.
     */
    public abstract start(): void;

    /**
     * Performs a single step of the layout optimization.
     */
    public abstract step(): void;
}

type Stage<S extends Storage> = {
    iterations: number;
    optimizer: Optimizer;
    generator: (storage: S, step: number, iter: number) => IterableIterator<Gradient[]>;
};

/**
 * A `StagedLayout` performs a fixed number of optimization steps, where each step involved
 * executing all stages of a computation. A single stage uses a generator function to generate
 * gradients, which optimizer applies. Each stage may be repeated for a different fixed number
 * of iterations.
 */
export class StagedLayout<S extends Storage> extends Layout<S> {
    public onStart: (elems: S, step: number) => boolean;
    public onStep: (elems: S, step: number) => boolean;
    public onEnd: (elems: S, step: number) => void;
    public stages: Stage<S>[];

    private _totalSteps: number;
    private _finishedSteps: number;

    constructor(
        storage: S,
        {
            steps = 1,
            onStart = () => true,
            onStep = () => true,
            onEnd = () => undefined,
        }: Partial<{
            steps: number;
            onStart: (elems: S, step: number) => boolean;
            onStep: (elems: S, step: number) => boolean;
            onEnd: (elems: S, step: number) => void;
        }>,
        ...stages: Stage<S>[]
    ) {
        super(storage);
        this.onStart = onStart;
        this.onStep = onStep;
        this.onEnd = onEnd;
        this.stages = stages;

        this._totalSteps = steps;
        this._finishedSteps = 0;
    }

    public start() {
        const { onStart, onEnd } = this;
        if (!onStart(this.storage, this._finishedSteps)) return;
        while (this._finishedSteps < this._totalSteps) {
            const proceed = this.step();
            // If break out early, do not trigger `onEnd`.
            if (!proceed) return;
        }
        onEnd(this.storage, this._finishedSteps);
    }

    public step(): boolean {
        const { onStep } = this;
        for (let stage of this.stages) {
            for (let i = 1; i <= stage.iterations; i++) {
                const gen = stage.generator(this.storage, this._finishedSteps, i);
                let grads;
                while (true) {
                    // Must use manual iteration, not for-of loop, in order to access return value.
                    grads = gen.next();
                    if (grads.value) stage.optimizer.step(grads.value);
                    if (grads.done) break;
                }
                stage.optimizer.update();
            }
        }
        this._finishedSteps += 1;
        return onStep(this.storage, this._finishedSteps);
    }
}
