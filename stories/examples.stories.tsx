import React from 'react';
import { storiesOf } from '@storybook/react';
import { number, boolean } from '@storybook/addon-knobs';

import { kGraphFive } from './schemas-five';
import {
    NodeId,
    NodeSchema,
    EdgeSchema,
    generateNodeAlignmentConstraints,
    constrainNodeGrid,
    constrainNodeDistance,
    constrainNodeOffset,
    constrainNodeNonoverlap,
    constrainOffset,
    nudgeAngle,
} from '../src';
import { makeLayout } from './common';
import { Graph } from './Graph';
import { kGraphSimple } from './schemas-simple';
import { kGraphMetro } from './schemas-metro';



storiesOf('examples', module)
    .add('organic', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphSimple.nodes,
            kGraphSimple.edges,
            { idealLength },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    .add('hierarchical', () => {
        const idealLength = number('ideal length', 30);
        const flowSeparation = number('flow separation', 50);
        const layout = makeLayout(
            kGraphSimple.nodes,
            kGraphSimple.edges,
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
    .add('metro', () => {
        const idealLength = number('ideal length', 30);
        const flowSeparation = number('flow separation', 50);
        const layout = makeLayout(
            kGraphMetro.nodes,
            kGraphMetro.edges,
            { steps: 400,
              idealLength,
              extraForces: function* (storage, step) {
                if(step > 150) {
                    for(let edge of storage.edges()) {
                      yield nudgeAngle(edge.source.node.center, edge.target.node.center, [0, 45, 90, 135, 180, 225, 270, 315], 75);
                    }
                }
              },
            },
        );
        return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    })
    // .add('multidirectional flow', () => {
    //     const idealLength = number('ideal length', 30);
    //     const flowSeparation = number('flow separation', 50);
    //     const layout = makeLayout(
    //         kGraphFive.nodesUnequal,
    //         kGraphFive.edgesTree,
    //         { idealLength,
    //           extraConstraints: function* (storage) {
    //             function constrain(uid: NodeId, vid: NodeId, direction: [number, number]) {
    //                 const u = storage.node(uid);
    //                 const v = storage.node(vid);
    //                 return constrainOffset(u.center, v.center, ">=", flowSeparation, direction, { masses: [u.fixed ? 1e9 : 1, v.fixed ? 1e9 : 1] });
    //             }

    //             yield constrain('n0', 'n1', [1, 0]);
    //             yield constrain('n1', 'n2', [0, 1]);
    //             yield constrain('n2', 'n3', [1, 0]);
    //             yield constrain('n2', 'n4', [0, 1]);
    //           }
    //         },
    //     );
    //     return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    // })
    // .add('oriented edges', () => {
    //     const idealLength = number('ideal length', 30);
    //     const orientationAngle = number('orientation angle', 45, { range: true, min: 0, max: 360, step:  1 })
    //     const orientationStrength = number('orientation strength', 100);
    //     const layout = makeLayout(
    //         kGraphTwo.nodes,
    //         kGraphTwo.edges,
    //         { idealLength,
    //           extraForces: function* (storage) {
    //             for(let edge of storage.edges()) {
    //                 yield nudgeAngle(edge.source.node.center, edge.target.node.center, orientationAngle, orientationStrength);
    //             }
    //           }
    //         },
    //     );
    //     return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    // })
    // .add('alignment', () => {
    //     const idealLength = number('ideal length', 30);
    //     const layout = makeLayout(
    //         kGraphFive.nodesUnequal,
    //         kGraphFive.edgesTree,
    //         { idealLength,
    //           extraConstraints: function* (storage) {
    //             function* align(nodes: NodeId[], axis: [number, number]) {
    //                 yield* generateNodeAlignmentConstraints(nodes.map((n) => storage.node(n)), axis);
    //             }

    //             yield* align(['n0', 'n1'], [1, 0]);
    //             yield* align(['n1', 'n2', 'n4'], [0, 1]);
    //             yield* align(['n2', 'n3'], [1, 0]);
    //           }
    //         },
    //     );
    //     return <Graph key={`${Math.random()}`} layout={layout} animated interactive />;
    // })
    .add('computational graph', () => {
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