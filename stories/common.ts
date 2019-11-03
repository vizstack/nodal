import {
    Gradient,
    NodeSchema,
    EdgeSchema,
    fromSchema,
    Storage,
    StructuredStorage,
    StagedLayout,
    generateNodeChildrenConstraints,
    generateNodePortConstraints,
    BasicOptimizer,
    EnergyOptimizer,
    generateSpringForces,
    generateSpringForcesCompound,
    generateCompactnessForces,
    generateCenteringForces,
} from '../src';

export function makeLayout(
    nodeSchemas: NodeSchema[],
    edgeSchemas: EdgeSchema[],
    {
        steps = 200,
        idealLength = 30,
        compactness = 10,
        padding = 0,
        forceIterations = 1,
        constraintIterations = 3,
        extraForces = undefined,
        extraConstraints = undefined,
    }: Partial<{
        steps: number,
        idealLength: number,
        compactness: number,
        padding: number,
        forceIterations: number,
        constraintIterations: number,
        extraForces?: (storage: Storage, step: number, iter: number) => IterableIterator<Gradient[]>
        extraConstraints?: (storage: Storage, step: number, iter: number) => IterableIterator<Gradient[]>
    }> = {}
): StagedLayout {
    const { nodes, edges } = fromSchema(nodeSchemas, edgeSchemas);
    const storage = new StructuredStorage(nodes, edges);
    const shortestPath = storage.shortestPaths();
    
    const forceOptimizer = new BasicOptimizer(0.5);
    // const forceOptimizer = new EnergyOptimizer({ lrInitial: 0.3, lrMax: 0.5, lrMin: 0.01, wait: 20, decay: 0.9, growth: 1.1, smoothing: 0.5 });
    const constraintOptimizer = new BasicOptimizer(1);

    return new StagedLayout(
        storage,
        { steps },
        {
            iterations: forceIterations,
            optimizer: forceOptimizer,
            generator: function* (storage, step, iter) {
                yield* generateSpringForcesCompound(
                    storage as StructuredStorage,
                    idealLength,
                    shortestPath,
                );
                yield* generateCenteringForces(storage as StructuredStorage, compactness);
                yield* generateCompactnessForces(storage, compactness);
                if(extraForces) yield* extraForces(storage, step, iter);
            }
        },
        {
            iterations: constraintIterations,
            optimizer: constraintOptimizer,
            generator: function* (storage, step, iter) {
                for (let u of storage.nodes()) {
                    yield* generateNodeChildrenConstraints(u, padding);
                }
                if(extraConstraints) yield* extraConstraints(storage, step, iter);
                for (let u of storage.nodes()) {
                    yield* generateNodePortConstraints(u);
                }
            }
        }
    );
}