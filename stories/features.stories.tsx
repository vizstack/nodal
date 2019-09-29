import React from 'react';
import { storiesOf } from '@storybook/react';
import { number, boolean } from '@storybook/addon-knobs';

import { kGraphFive } from './schemas-five';
import {
    Node,
    Edge,
    NodeId,
    NodeSchema,
    EdgeSchema,
    fromSchema,
    StructuredStorage,
    ForceConstraintLayout,
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
    Vector
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';
import { Rectangle } from '../src/graph/shapes';

function* forceSpringModel(
    elems: StructuredStorage,
    shortestPath: (u: Node, v: Node) => number | undefined,
    idealLength: number,
    compactness: number,
) {
    const visited: Set<Node> = new Set();
    for(let u of elems.nodes()) {
        visited.add(u);
        // Compound nodes should pull children closer.
        if(u.children.length > 0) {
            for(let child of u.children) {
                yield nudgePair(u.center, child.center, -compactness*(u.center.distanceTo(child.center)));
            };
        }
        for(let v of elems.nodes()) {
            if(visited.has(v)) continue;
            if(u.fixed && v.fixed) continue;
            const [wu, wv] = [u.fixed ? 0 : 1, v.fixed ? 0 : 1];

            // Spring force. Attempt to reach ideal distance between all pairs,
            // except unconnected pairs that are farther away than ideal.
            const uvPath = shortestPath(u, v);
            if(uvPath === undefined) continue; // Ignore disconnected components.
            const idealDistance = idealLength * uvPath;
            const actualDistance = u.center.distanceTo(v.center);
            // const actualDistance = separation({ center: u.center, width: u.shape.width, height: u.shape.height}, { center: v.center, width: v.shape.width, height: v.shape.height});
            if(elems.existsEdge(u, v, true) && actualDistance > idealDistance) {
                // Attractive force between edges if too far.
                const delta = actualDistance - idealDistance;
                yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
            } else {
                // Repulsive force between node pairs if too close.
                // console.log("repulsive", actualDistance, idealDistance);
                if(actualDistance < idealDistance) {
                    const delta = idealDistance - actualDistance;
                    yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
                }
            }
        }
    }
}

function* constrainNodes(elems: StructuredStorage, step: number) {
    for (let u of elems.nodes()) {
        // Apply no-overlap to all siblings.
        if(step > 15) {
            for(let sibling of elems.siblings(u)) {
                yield constrainNodeNonoverlap(u, sibling);
            }
        }
        yield constrainNodeChildren(u);
        yield constrainNodePorts(u);
    }
}

const configForceElectrical = {
    numSteps: 100, numConstraintIters: 5, numForceIters: 5,
    forceOptimizer: new EnergyOptimizer({ lrInitial: 0.8, lrMax: 0.8, lrMin: 0.01  })
};

storiesOf('features', module)
    .add('simple nodes', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('simple nodes (unequal)', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('disconnected components', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesUnequal, []);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('compound nodes', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesNested, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 0.5);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel((elems as StructuredStorage), shortestPath, idealLength, compactness);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('unidirectional flow', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel((elems as StructuredStorage), shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);

                // Constrain targets to be at larger y-position.
                if(step > 10) {
                    for (let e of elems.edges()) {
                        yield constrainOffset(e.source.node.center, e.target.node.center, ">=", 50, [0, 1], { masses: [e.source.node.fixed ? 1e9 : 1, e.target.node.fixed ? 1e9 : 1] });
                    }
                }
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('multidirectional flow', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesTree);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel((elems as StructuredStorage), shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);

                function constrain(uid: NodeId, vid: NodeId, direction: [number, number]) {
                    const u = elems.node(uid);
                    const v = elems.node(vid);
                    return constrainOffset(u.center, v.center, ">=", 50, direction, { masses: [u.fixed ? 1e9 : 1, v.fixed ? 1e9 : 1] });
                }

                // Constrain targets along different axes.
                yield constrain('n0', 'n1', [1, 0]);
                yield constrain('n1', 'n2', [0, 1]);
                yield constrain('n2', 'n3', [1, 0]);
                yield constrain('n2', 'n4', [0, 1]);
                
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('named ports', () => {
        console.log('named ports');
        const nodesUnequalWithPorts = kGraphFive.nodesUnequal.map((n) => Object.assign({ ports: {
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
        const { nodes, edges } = fromSchema(nodesUnequalWithPorts, edgesTreeWithPorts);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel((elems as StructuredStorage), shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);

                function constrain(uid: NodeId, vid: NodeId, direction: [number, number]) {
                    const u = elems.node(uid);
                    const v = elems.node(vid);
                    return constrainOffset(u.center, v.center, ">=", 50, direction, { masses: [u.fixed ? 1e9 : 1, v.fixed ? 1e9 : 1] });
                }

                // Constrain targets along different axes.
                yield constrain('n0', 'n1', [1, 0]);
                yield constrain('n1', 'n2', [0, 1]);
                yield constrain('n2', 'n3', [1, 0]);
                yield constrain('n2', 'n4', [0, 1]);
                
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('oriented edges', () => {
        const { nodes, edges } = fromSchema(kGraphTwo.nodes, kGraphTwo.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 100);
        const orientationAngle = number('orientation angle', 45, { range: true, min: 0, max: 360, step:  1 })
        const orientationStrength = number('orientation strength', 10);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
                
                for(let edge of elems.edges()) {
                    yield nudgeAngle(edge.source.node.center, edge.target.node.center, orientationAngle, orientationStrength);
                }
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('node distance and offset', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesTree);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);

                yield constrainNodeOffset(elems.node('n0'), elems.node('n1'), '>=', 100, [1, 1]);
                yield constrainNodeDistance(elems.node('n1'), elems.node('n2'), '>=', 100);
                yield constrainNodeOffset(elems.node('n2'), elems.node('n3'), '>=', 100, [-1, 1]);
                yield constrainNodeDistance(elems.node('n2'), elems.node('n4'), '>=', 100, {axis: [1, 0]});
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('alignment', () => {
        const { nodes, edges } = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesTree);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);

                function align(u: NodeId, v: NodeId, axis: [number, number]) {
                    return constrainNodeAlignment([elems.node(u), elems.node(v)], axis);
                }

                yield align('n0', 'n1', [1, 0]);
                yield align('n1', 'n2', [0, 1]);
                yield align('n2', 'n3', [1, 0]);
                yield align('n2', 'n4', [0, 1]);
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('grid snap', () => {
        // TODO: Need global grid snap transformation, so nudges don't cause overlap.
        const { nodes, edges } = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const gridSnap = boolean('grid snap', true);
        const gridX = number('grid x', 5);
        const gridY = number('grid y', 10);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);
                if(gridSnap && step > 100) {
                    for(let u of elems.nodes()) {
                        yield constrainNodeGrid(u, gridX, gridY);
                    }
                }
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('limp noodle', () => {
        const fire: (idx: number) => {nodes: NodeSchema[], edges: EdgeSchema[]} = (idx: number) => {
            return {
                nodes: [
                    {
                        id: `n${idx}:group`,
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
        const nodeSchemas = [...fire(0).nodes, ...fire(1).nodes, ...fire(2).nodes, ...fire(3).nodes, ]; //...fire(4).nodes, ...fire(5).nodes];
        const edgeSchemas = [...fire(0).edges, ...fire(1).edges, ...fire(2).edges, ...fire(3).edges, ]; // ...fire(4).edges, ...fire(5).edges];
        // nodeSchemas.push({
        //     id: "maxpool",
        //     shape: {
        //         width: 71,
        //         height: 21,
        //     }
        // });
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
        // edgeSchemas.push({
        //     id: "3:cat1:maxpool",
        //     source: {
        //         id: "n3:cat",
        //     },
        //     target: {
        //         id: "maxpool",
        //     },
        // })
        // edgeSchemas.push({
        //     id: "maxpool:4conv1",
        //     source: {
        //         id: "maxpool",
        //     },
        //     target: {
        //         id: "n4:conv1",
        //     },
        // })
        // edgeSchemas.push({
        //     id: "4:cat1:5conv1",
        //     source: {
        //         id: "n4:cat",
        //     },
        //     target: {
        //         id: "n5:conv1",
        //     },
        // })
        const { nodes, edges } = fromSchema(nodeSchemas, edgeSchemas);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const flowSpacing = number('flow spacing', 30);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, 0);
            },
            function* (elems, step) {
                yield* constrainNodes(elems as StructuredStorage, step);

                console.log('foo');
                if (step > 0) {
                    for(let { source, target } of elems.edges()) {
                        const sourceShape = (source.node.shape as Rectangle).toSchema();
                        const targetShape = (target.node.shape as Rectangle).toSchema();
                        const offset = (sourceShape.height + targetShape.height) / 2;
                        const portLocations: ["south", "north"] = ['south', 'north'];
                        const flowAxis: [number, number] = [0, 1];
                        yield constrainOffset(source.node.center, target.node.center, '>=', flowSpacing + offset, flowAxis);
                        source.node.ports[source.port].location = portLocations[0];  // TODO: Remove this lol!
                        target.node.ports[target.port].location = portLocations[1];
                    }
                }
            },
            configForceElectrical,
        );
        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })