import React from 'react';
import { storiesOf } from '@storybook/react';
import { number } from '@storybook/addon-knobs';

import { kGraphFive } from './schemas-five';
import {
    Node,
    Edge,
    NodeId,
    fromSchema,
    StructuredStorage,
    ForceConstraintLayout,
    constrainDistance,
    forcePairwisePower,
    forcePairwise,
    forcePairwiseNodes,
    forceVector,
    positionChildren,
    positionPorts,
    positionNoOverlap,
    constrainOffset,
    constrainAngle,
    BasicOptimizer,
    TrustRegionOptimizer,
    EdgeSchema,
    Vector
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';

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
                yield forcePairwiseNodes(u, child, -compactness*(u.center.distanceTo(child.center)));
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
            if(elems.existsEdge(u, v, true) && actualDistance > idealLength) {
                // Attractive force between edges if too far.
                const delta = actualDistance - idealLength;
                yield forcePairwiseNodes(u, v, [-wu*delta, -wv*delta]);
            } else {
                // Repulsive force between node pairs if too close.
                // console.log("repulsive", actualDistance, idealDistance);
                if(actualDistance < idealDistance) {
                    const delta = idealDistance - actualDistance;
                    // console.log("too close", wu, wv, delta);
                    yield forcePairwiseNodes(u, v, [wu*delta, wv*delta]);
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
                yield positionNoOverlap(u, sibling);
            }
        }
        yield positionChildren(u);
        yield positionPorts(u);
    }
}

const configForceElectrical = {
    numSteps: 200, numConstraintIters: 5, numForceIters: 5,
    forceOptimizer: new TrustRegionOptimizer({ lrInitial: 0.4, lrMax: 0.8, lrMin: 0.001 })
};

storiesOf('features', module)
    .add('simple nodes', () => {
        const [nodes, edges] = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 0.5);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, compactness);
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
        const [nodes, edges] = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesAcyclic);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 0.5);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, compactness);
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
        const [nodes, edges] = fromSchema(kGraphFive.nodesUnequal, []);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 0.5);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, compactness);
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
        const [nodes, edges] = fromSchema(kGraphFive.nodesNested, kGraphFive.edgesAcyclic);
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
        const [nodes, edges] = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
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
        const [nodes, edges] = fromSchema(kGraphFive.nodesUnequal, kGraphFive.edgesTree);
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
            e1: { location: 'east', order: 1 }, e2: { location: 'east', order: 2 },
            w1: { location: 'west', order: 1 }, w2: { location: 'west', order: 2 },
            n1: { location: 'north', order: 1 }, n2: { location: 'north', order: 2 },
            s1: { location: 'south', order: 1 }, s2: { location: 'south', order: 2 },
        } }, n))
        const edgesTreeWithPorts: EdgeSchema[] = [
            { id: 'e0->1', source: { id: 'n0', port: 'e1' }, target: { id: 'n1' } },
            { id: 'e1->2:1', source: { id: 'n1', port: 's1' }, target: { id: 'n2', port: 'n1' } },
            { id: 'e1->2:2', source: { id: 'n1', port: 's2' }, target: { id: 'n2', port: 'n2' } },
            { id: 'e2->3', source: { id: 'n2' }, target: { id: 'n3' } },
            { id: 'e2->4', source: { id: 'n2' }, target: { id: 'n4' } },
        ];
        const [nodes, edges] = fromSchema(nodesUnequalWithPorts, edgesTreeWithPorts);
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
        const [nodes, edges] = fromSchema(kGraphTwo.nodes, kGraphTwo.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const idealLength = number('ideal length', 100);
        const compactness = number('group compactness', 0.5);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                yield* forceSpringModel(elems as StructuredStorage, shortestPath, idealLength, compactness);
                
                for(let edge of elems.edges()) {
                    yield constrainAngle(edge.source.node.center, edge.target.node.center, -Math.PI/4);
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