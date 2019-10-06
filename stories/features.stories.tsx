import React from 'react';
import { storiesOf } from '@storybook/react';
import { number, boolean } from '@storybook/addon-knobs';

import { kGraphFive } from './schemas-five';
import {
    Node,
    Gradient,
    Edge,
    NodeId,
    NodeSchema,
    EdgeSchema,
    fromSchema,
    Storage,
    StructuredStorage,
    StagedLayout,
    constrainDistance,
    nudgePair,
    nudgePoint,
    constrainNodeChildren,
    constrainNodePorts,
    constrainNodeAlignment,
    constrainNodeGrid,
    constrainNodeDistance,
    constrainNodeOffset,
    constrainNodeNonoverlap,
    constrainOffset,
    nudgeAngle,
    BasicOptimizer,
    EnergyOptimizer,
    Vector,
    generateSpringForces,
    generateCompactnessForces,
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';

function makeLayout(
    nodeSchemas: NodeSchema[],
    edgeSchemas: EdgeSchema[],
    {
        steps = 200,
        idealLength = 30,
        compactness = 10,
        forceIterations = 1,
        constraintIterations = 3,
        extraForces = undefined,
        extraConstraints = undefined,
    }: Partial<{
        steps: number,
        idealLength: number,
        compactness: number,
        forceIterations: number,
        constraintIterations: number,
        extraForces?: (storage: Storage, step: number, iter: number) => IterableIterator<Gradient[]>
        extraConstraints?: (storage: Storage, step: number, iter: number) => IterableIterator<Gradient[]>
    }>
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
                yield* generateSpringForces(
                    storage as StructuredStorage,
                    idealLength,
                    shortestPath,
                );
                yield* generateCompactnessForces(storage, compactness);
                if(extraForces) yield* extraForces(storage, step, iter);
            }
        },
        {
            iterations: constraintIterations,
            optimizer: constraintOptimizer,
            generator: function* (storage, step, iter) {
                for (let u of storage.nodes()) {
                    yield constrainNodeChildren(u);
                    yield constrainNodePorts(u);
                }
                if(extraConstraints) yield* extraConstraints(storage, step, iter);
            }
        }
    );
}

storiesOf('features', module)
    .add('simple nodes', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphFive.nodesEqual,
            kGraphFive.edgesAcyclic,
            { idealLength },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('simple nodes (unequal)', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphFive.nodesUnequal,
            kGraphFive.edgesAcyclic,
            { idealLength },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('disconnected components', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphFive.nodesUnequal,
            [],
            { idealLength },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('compound nodes', () => {
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 0.5);
        const layout = makeLayout(
            kGraphFive.nodesNested,
            kGraphFive.edgesAcyclic,
            { idealLength, compactness },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('unidirectional flow', () => {
        const idealLength = number('ideal length', 30);
        const flowSeparation = number('flow separation', 50);
        const layout = makeLayout(
            kGraphFive.nodesEqual,
            kGraphFive.edgesAcyclic,
            { idealLength,
              extraConstraints: function* (storage, step) {
                if(step > 10) {
                    for (let e of storage.edges()) {
                        yield constrainOffset(e.source.node.center, e.target.node.center, ">=", flowSeparation, [0, 1], { masses: [e.source.node.fixed ? 1e9 : 1, e.target.node.fixed ? 1e9 : 1] });
                    }
                }
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('multidirectional flow', () => {
        const idealLength = number('ideal length', 30);
        const flowSeparation = number('flow separation', 50);
        const layout = makeLayout(
            kGraphFive.nodesUnequal,
            kGraphFive.edgesTree,
            { idealLength,
              extraConstraints: function* (storage) {
                function constrain(uid: NodeId, vid: NodeId, direction: [number, number]) {
                    const u = storage.node(uid);
                    const v = storage.node(vid);
                    return constrainOffset(u.center, v.center, ">=", flowSeparation, direction, { masses: [u.fixed ? 1e9 : 1, v.fixed ? 1e9 : 1] });
                }

                yield constrain('n0', 'n1', [1, 0]);
                yield constrain('n1', 'n2', [0, 1]);
                yield constrain('n2', 'n3', [1, 0]);
                yield constrain('n2', 'n4', [0, 1]);
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('named ports', () => {
        const idealLength = number('ideal length', 30);
        const flowSeparation = number('flow separation', 50);
        const nodesUnequalWithPorts: NodeSchema[] = kGraphFive.nodesUnequal.map((n) => Object.assign({ ports: {
            e1: { location: 'east', order: 1 },
            w1: { location: 'west', order: 1 }, w2: { location: 'west', order: 2 },
            n1: { location: 'north', order: 1 },
            s1: { location: 'south', order: 1 }, s2: { location: 'south', order: 2 },
        } }, n))
        const edgesTreeWithPorts: EdgeSchema[] = [
            { id: 'e0->1', source: { id: 'n0', port: 'e1' }, target: { id: 'n1', port: 'w1' } },
            { id: 'e1->2:1', source: { id: 'n1', port: 's1' }, target: { id: 'n2', port: 'n1' } },
            { id: 'e1->2:2', source: { id: 'n1', port: 's2' }, target: { id: 'n2', port: 'n1' } },
            { id: 'e2->3', source: { id: 'n2', port: 'e1' }, target: { id: 'n3', port: 'w1' } },
            { id: 'e2->4', source: { id: 'n2', port: 's1' }, target: { id: 'n4', port: 'n1' } },
        ];
        const layout = makeLayout(
            nodesUnequalWithPorts,
            edgesTreeWithPorts,
            { idealLength,
              extraConstraints: function* (storage) {
                function constrain(uid: NodeId, vid: NodeId, direction: [number, number]) {
                    const u = storage.node(uid);
                    const v = storage.node(vid);
                    return constrainOffset(u.center, v.center, ">=", flowSeparation, direction, { masses: [u.fixed ? 1e9 : 1, v.fixed ? 1e9 : 1] });
                }

                yield constrain('n0', 'n1', [1, 0]);
                yield constrain('n1', 'n2', [0, 1]);
                yield constrain('n2', 'n3', [1, 0]);
                yield constrain('n2', 'n4', [0, 1]);
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('oriented edges', () => {
        const idealLength = number('ideal length', 30);
        const orientationAngle = number('orientation angle', 45, { range: true, min: 0, max: 360, step:  1 })
        const orientationStrength = number('orientation strength', 100);
        const layout = makeLayout(
            kGraphTwo.nodes,
            kGraphTwo.edges,
            { idealLength,
              extraForces: function* (storage) {
                for(let edge of storage.edges()) {
                    yield nudgeAngle(edge.source.node.center, edge.target.node.center, orientationAngle, orientationStrength);
                }
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('node distance and offset', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphFive.nodesUnequal,
            kGraphFive.edgesTree,
            { idealLength,
              extraConstraints: function* (storage) {
                yield constrainNodeOffset(storage.node('n0'), storage.node('n1'), '>=', 100, [1, 1]);
                yield constrainNodeDistance(storage.node('n1'), storage.node('n2'), '>=', 100);
                yield constrainNodeOffset(storage.node('n2'), storage.node('n3'), '>=', 100, [-1, 1]);
                yield constrainNodeDistance(storage.node('n2'), storage.node('n4'), '>=', 100, {axis: [1, 0]});
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('alignment', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphFive.nodesUnequal,
            kGraphFive.edgesTree,
            { idealLength,
              extraConstraints: function* (storage) {
                function align(u: NodeId, v: NodeId, axis: [number, number]) {
                    return constrainNodeAlignment([storage.node(u), storage.node(v)], axis);
                }

                yield align('n0', 'n1', [1, 0]);
                yield align('n1', 'n2', [0, 1]);
                yield align('n2', 'n3', [1, 0]);
                yield align('n2', 'n4', [0, 1]);
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('grid snap', () => {
        // TODO: Need global grid snap transformation, so nudges don't cause overlap.
        const idealLength = number('ideal length', 30);
        const gridSnap = boolean('grid snap', true);
        const gridX = number('grid x', 5);
        const gridY = number('grid y', 10);
        const layout = makeLayout(
            kGraphFive.nodesUnequal,
            kGraphFive.edgesTree,
            { idealLength,
              extraConstraints: function* (storage, step) {
                if(gridSnap && step > 50) {
                    for(let u of storage.nodes()) {
                        yield constrainNodeGrid(u, gridX, gridY);
                    }
                }
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('limp noodle', () => {
        const fire: (idx: number) => {nodes: NodeSchema[], edges: EdgeSchema[]} = (idx: number) => {
            return {
                nodes: [
                    {
                        id: `n${idx}:group`,
                        shape: {
                            type: 'rectangle',
                            width: 80,
                            height: 80,
                        },
                        children: [
                            `n${idx}:conv1`,
                            `n${idx}:relu1`,
                            `n${idx}:conv21`,
                            `n${idx}:conv22`,
                            `n${idx}:relu21`,
                            `n${idx}:relu22`,
                            `n${idx}:cat`,
                        ]
                    },
                    {
                        id: `n${idx}:conv1`,
                        shape: {
                            type: 'rectangle', width: 50, height: 21,
                        }
                    },
                    {
                        id: `n${idx}:relu1`,
                        shape: {
                            type: 'rectangle', width: 36, height: 21,
                        }
                    },
                    {
                        id: `n${idx}:conv21`,
                        shape: {
                            type: 'rectangle', width: 50, height: 21,
                        }
                    },
                    {
                        id: `n${idx}:conv22`,
                        shape: {
                            type: 'rectangle', width: 50, height: 21,
                        }
                    },
                    {
                        id: `n${idx}:relu21`,
                        shape: {
                            type: 'rectangle', width: 36, height: 21,
                        }
                    },
                    {
                        id: `n${idx}:relu22`,
                        shape: {
                            type: 'rectangle', width: 36, height: 21,
                        }
                    },
                    {
                        id: `n${idx}:cat`,
                        shape: {
                            type: 'rectangle', width: 71, height: 21,
                        }
                    }
                ],
                edges: [
                    {
                        id: `${idx}:c1r1`,
                        source: {
                            id: `n${idx}:conv1`
                        },
                        target: {
                            id: `n${idx}:relu1`
                        }
                    },
                    {
                        id: `${idx}:r1c21`,
                        source: {
                            id: `n${idx}:relu1`
                        },
                        target: {
                            id: `n${idx}:conv21`
                        }
                    },
                    {
                        id: `${idx}:r1c22`,
                        source: {
                            id: `n${idx}:relu1`
                        },
                        target: {
                            id: `n${idx}:conv22`
                        }
                    },
                    {
                        id: `${idx}:c21r21`,
                        source: {
                            id: `n${idx}:conv21`
                        },
                        target: {
                            id: `n${idx}:relu21`
                        }
                    },
                    {
                        id: `${idx}:c22r22`,
                        source: {
                            id: `n${idx}:conv22`
                        },
                        target: {
                            id: `n${idx}:relu22`
                        }
                    },
                    {
                        id: `${idx}:r21cat`,
                        source: {
                            id: `n${idx}:relu21`
                        },
                        target: {
                            id: `n${idx}:cat`
                        }
                    },
                    {
                        id: `${idx}:r22cat`,
                        source: {
                            id: `n${idx}:relu22`
                        },
                        target: {
                            id: `n${idx}:cat`
                        }
                    },
                ]
            }
        }
        const nodeSchemas = [...fire(0).nodes, ...fire(1).nodes, ...fire(2).nodes, ...fire(3).nodes, ...fire(4).nodes, ...fire(5).nodes];
        const edgeSchemas = [...fire(0).edges, ...fire(1).edges, ...fire(2).edges, ...fire(3).edges, ...fire(4).edges, ...fire(5).edges];
        nodeSchemas.push({
            id: "maxpool",
            shape: {
                type: 'rectangle',
                width: 71,
                height: 21,
            }
        });
        edgeSchemas.push({
            id: "0:cat1:1conv1",
            source: {
                id: "n0:cat",
            },
            target: {
                id: "n1:conv1",
            },
        });
        edgeSchemas.push({
            id: "1:cat1:2conv1",
            source: {
                id: "n1:cat",
            },
            target: {
                id: "n2:conv1",
            },
        })
        edgeSchemas.push({
            id: "2:cat1:3conv1",
            source: {
                id: "n2:cat",
            },
            target: {
                id: "n3:conv1",
            },
        })
        // edgeSchemas.push({
        //     id: "3:cat1:4conv1",
        //     source: {
        //         id: "n3:cat",
        //     },
        //     target: {
        //         id: "n4:conv1",
        //     },
        // })
        edgeSchemas.push({
            id: "3:cat1:maxpool",
            source: {
                id: "n3:cat",
            },
            target: {
                id: "maxpool",
            },
        })
        edgeSchemas.push({
            id: "maxpool:4conv1",
            source: {
                id: "maxpool",
            },
            target: {
                id: "n4:conv1",
            },
        })
        edgeSchemas.push({
            id: "4:cat1:5conv1",
            source: {
                id: "n4:cat",
            },
            target: {
                id: "n5:conv1",
            },
        })

        const idealLength = number('ideal length', 20);
        const flowSpacing = number('flow spacing', 30);
        const flowStart = number('flow timestep start', 0);
        const orientationStrength = number('orient to 90/270', 0);
        const layout = makeLayout(
            nodeSchemas,
            edgeSchemas,
            { idealLength, compactness: 0, forceIterations: 1, constraintIterations: 5,
              extraForces: function* (storage) {
                for(let e of storage.edges()) {
                    yield nudgeAngle(e.source.node.center, e.target.node.center, [90, 270], orientationStrength);
                }
              },
              extraConstraints: function* (storage, step) {
                if (step > flowStart) {
                    for (let {source, target} of storage.edges()) {
                        yield constrainNodeOffset(source.node, target.node, ">=", flowSpacing, [0, 1]);
                    }
                }
              }
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    });