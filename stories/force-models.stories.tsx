import React from 'react';
import { storiesOf } from '@storybook/react';
import { number, select } from '@storybook/addon-knobs';
import {
    Node,
    Vector,
    BasicStorage,
    StructuredStorage,
    StagedLayout,
    fromSchema,
    nudgePair,
    generateNodeChildrenConstraints,
    generateNodePortConstraints,
    constrainNodeNonoverlap,
    constrainOffset,
    Optimizer,
    BasicOptimizer,
    EnergyOptimizer,
    RMSPropOptimizer,
    TrustRegionOptimizer,
    generateSpringElectricalForces,
    generateSpringForces,
    generateCompactnessForces,
    BooleanScheduler,
    NumberScheduler,
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';
import { kGraphFive } from './schemas-five';
import { kGraphSimple } from './schemas-simple';
import { kGraphCompound } from './schemas-compound';


storiesOf('force models', module)
    .add('spring-electrical w/ simple nodes', () => {
        const steps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 50);
        const edgeStrength = number('edge strength', 1);
        const repulsiveStrength = number('repulsive strength', 1);

        const { nodes, edges } = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const storage = new StructuredStorage(nodes, edges);
        const forceOptimizer = new EnergyOptimizer({ lrInitial: 0.4, lrMax: 0.6, lrMin: 0.001 });
        const constraintOptimizer = new BasicOptimizer(1);
        const layout = new StagedLayout(
            storage,
            { steps },
            {
                iterations: 1,
                optimizer: forceOptimizer,
                generator: function* (storage) {
                    yield* generateSpringElectricalForces(
                        storage as StructuredStorage,
                        idealLength,
                        edgeStrength,
                        repulsiveStrength,
                    );
                }
            },
            {
                iterations: 3,
                optimizer: constraintOptimizer,
                generator: function* (storage) {
                    for (let u of storage.nodes()) {
                        yield* generateNodePortConstraints(u);
                    }
                }
            }
        )

        return (
            <Graph
                key={`${Math.random()}`}
                layout={layout}
                animated
                interactive
            />
        );
    })
    .add('spring-electrical w/ compound nodes', () => {
        const steps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 50);
        const edgeStrength = number('edge strength', 1);
        const repulsiveStrength = number('repulsive strength', 1);
        const compactness = number('children compactness', 0.5);

        const { nodes, edges } = fromSchema(kGraphCompound.nodes, kGraphCompound.edges);
        const storage = new StructuredStorage(nodes, edges);
        const forceOptimizer = new EnergyOptimizer({ lrInitial: 0.4, lrMax: 0.6, lrMin: 0.001 });
        const constraintOptimizer = new BasicOptimizer(1);
        const nonoverlapScheduler = new BooleanScheduler(true).for(20, false)
        const layout = new StagedLayout(
            storage,
            { steps },
            {
                iterations: 1,
                optimizer: forceOptimizer,
                generator: function* (storage) {
                    yield* generateSpringElectricalForces(
                        storage as StructuredStorage,
                        idealLength,
                        edgeStrength,
                        repulsiveStrength,
                    );
                    yield* generateCompactnessForces(storage, compactness);
                }
            },
            {
                iterations: 3,
                optimizer: constraintOptimizer,
                generator: function* (storage, step) {
                    for (let u of storage.nodes()) {
                        yield* generateNodeChildrenConstraints(u);
                        yield* generateNodePortConstraints(u);
                        if(nonoverlapScheduler.get(step)) {
                            for(let sibling of (storage as StructuredStorage).siblings(u)) {
                                yield constrainNodeNonoverlap(u, sibling);
                            }
                        }
                    }
                }
            }
        )

        return (
            <Graph
                key={`${Math.random()}`}
                layout={layout}
                animated
                interactive
                nodeColor={(n) => (n.meta && n.meta.group) || 0}
            />
        );
    })
    .add('spring w/ simple nodes', () => {
        const steps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 15);
        const optimizerType = select('optimizer', ['EnergyOptimizer', 'RMSPropOptimizer', 'BasicOptimizer', 'TrustRegionOptimizer'], 'EnergyOptimizer');

        const { nodes, edges } = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const storage = new StructuredStorage(nodes, edges);
        const shortestPath = storage.shortestPaths();
        
        let forceOptimizer: Optimizer;
        switch(optimizerType) {
            case 'BasicOptimizer': forceOptimizer = new BasicOptimizer(0.5, 1); break;
            case 'RMSPropOptimizer': forceOptimizer = new RMSPropOptimizer(2.0, 0.8); break;
            case 'TrustRegionOptimizer': forceOptimizer = new TrustRegionOptimizer(1, 0.01, 0.9, 10, 0.01); break;
            default:
            case 'EnergyOptimizer': forceOptimizer = new EnergyOptimizer({ lrInitial: 0.3, lrMax: 0.5, lrMin: 0.01, wait: 20, decay: 0.9, growth: 1.1, smoothing: 0.5 }); break;
        }
        const constraintOptimizer = new BasicOptimizer(1);
        const layout = new StagedLayout(
            storage,
            { steps },
            {
                iterations: 1,
                optimizer: forceOptimizer,
                generator: function* (storage) {
                    yield* generateSpringForces(
                        storage as StructuredStorage,
                        idealLength,
                        shortestPath,
                    );
                }
            },
            {
                iterations: 3,
                optimizer: constraintOptimizer,
                generator: function* (storage) {
                    for (let u of storage.nodes()) {
                        yield* generateNodePortConstraints(u);
                    }
                }
            }
        )

        return (
            <Graph
                key={`${Math.random()}`}
                layout={layout}
                animated
                interactive
            />
        );
    })
    .add('spring w/ compound nodes', () => {
        const steps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 50);
        const compactness = number('children compactness', 1.0);
        const optimizerType = select('optimizer', ['EnergyOptimizer', 'RMSPropOptimizer', 'BasicOptimizer', 'TrustRegionOptimizer'], 'EnergyOptimizer');

        const { nodes, edges } = fromSchema(kGraphCompound.nodes, kGraphCompound.edges);
        const storage = new StructuredStorage(nodes, edges);
        const shortestPath = storage.shortestPaths();

        let forceOptimizer: Optimizer;
        switch(optimizerType) {
            case 'BasicOptimizer': forceOptimizer = new BasicOptimizer(0.5, 1); break;
            case 'RMSPropOptimizer': forceOptimizer = new RMSPropOptimizer(2.0, 0.8); break;
            case 'TrustRegionOptimizer': forceOptimizer = new TrustRegionOptimizer(1, 0.01, 0.9, 10, 0.01); break;
            default:
            case 'EnergyOptimizer': forceOptimizer = new EnergyOptimizer({ lrInitial: 0.3, lrMax: 0.5, lrMin: 0.01, wait: 20, decay: 0.9, growth: 1.1, smoothing: 0.5 }); break;
        }
        const constraintOptimizer = new BasicOptimizer(1);
        const nonoverlapScheduler = new BooleanScheduler(true).for(20, false)
        const layout = new StagedLayout(
            storage,
            { steps },
            {
                iterations: 1,
                optimizer: forceOptimizer,
                generator: function* (storage) {
                    yield* generateSpringForces(
                        storage as StructuredStorage,
                        idealLength,
                        shortestPath,
                    );
                    yield* generateCompactnessForces(storage, compactness);
                }
            },
            {
                iterations: 3,
                optimizer: constraintOptimizer,
                generator: function* (storage, step) {
                    for (let u of storage.nodes()) {
                        // HACK: this needs to come before `constrainShapeCompact`, otherwise the groups will not be the correct size
                        if(nonoverlapScheduler.get(step)) {
                            for(let sibling of (storage as StructuredStorage).siblings(u)) {
                                yield constrainNodeNonoverlap(u, sibling);
                            }
                        }
                        yield* generateNodeChildrenConstraints(u);
                        yield* generateNodePortConstraints(u);
                    }
                }
            }
        )

        return (
            <Graph
                key={`${Math.random()}`}
                layout={layout}
                animated
                interactive
                nodeColor={(n) => (n.meta && n.meta.group) || 0}
            />
        );
    });