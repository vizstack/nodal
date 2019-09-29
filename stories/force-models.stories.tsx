import React from 'react';
import { storiesOf } from '@storybook/react';
import { number, select } from '@storybook/addon-knobs';
import { Vector2, Box2 } from 'three';
import {
    Node,
    Edge,
    NodeSchema,
    EdgeSchema,
    Vector,
    Gradient,
    Storage,
    BasicStorage,
    StructuredStorage,
    ForceConstraintLayout,
    constrainDistance,
    fromSchema,
    nudgePair,
    constrainNodeChildren,
    constrainNodePorts,
    constrainNodeNonoverlap,
    constrainOffset,
    Optimizer,
    BasicOptimizer,
    EnergyOptimizer,
    RMSPropOptimizer,
    TrustRegionOptimizer,
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';
import { kGraphFive } from './schemas-five';
import { kGraphSimple } from './schemas-simple';
import { kGraphCompound } from './schemas-compound';


storiesOf('force models', module)
    .add('spring-electrical w/ simple nodes', () => {
        const { nodes, edges } = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const elems = new BasicStorage(nodes, edges);
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const repulsive = number('repulsive', 50);
        const attractive = number('attractive', 1);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    visited.add(u);
                    for(let v of elems.nodes()) {
                        if(visited.has(v)) continue;
                        if(u.fixed && v.fixed) continue;
                        // TODO: What if only one is fixed?
                        // Repulsive force between nodes (hyperbolic).
                        const dist = (new Vector()).subVectors(v.center, u.center).length();
                        yield nudgePair(u.center, v.center, repulsive * Math.pow(dist, -1))
                        // yield forcePairwisePower(u, v, { power: -1, scalar: repulsive });
                    }
                }
                for(let e of elems.edges()) {
                    // Attractive force along edges (linear).
                    const p = e.source.node.center, q = e.target.node.center;
                    const dist = (new Vector()).subVectors(p, q).length();
                    yield nudgePair(p, q, -attractive * Math.pow(dist, 1))
                    // yield forcePairwisePower(
                    //     e.source.node, e.target.node, { power: 1, scalar: -attractive },
                    // );
                }
            },
            function* (elems) {
                for (let u of elems.nodes()) {
                    yield constrainNodePorts(u);
                }
            },
            { numSteps, numConstraintIters: 3, forceOptimizer: new EnergyOptimizer({ lrInitial: 0.4, lrMax: 0.6, lrMin: 0.001 }) }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('spring-electrical w/ compound nodes', () => {
        const { nodes, edges } = fromSchema([...kGraphCompound.nodesChildren, ...kGraphCompound.nodesParents], kGraphCompound.edges);
        const elems = new StructuredStorage(nodes, edges);
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const repulsive = number('repulsive', 50);
        const attractive = number('attractive', 0.5);
        const compactness = number('group compactness', 0.5);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    visited.add(u);

                    // Compound nodes should pull children closer.
                    if(u.children.length > 0) {
                        for(let child of u.children) {
                            const dist = (new Vector()).subVectors(child.center, u.center).length();
                            yield nudgePair(u.center, child.center, -compactness*dist)
                        };
                    }

                    for(let v of elems.nodes()) {
                        if(!visited.has(v)) {
                            // Repulsive force between nodes (hyperbolic).
                            const dist = (new Vector()).subVectors(v.center, u.center).length();
                            yield nudgePair(u.center, v.center, repulsive * Math.pow(dist, -1))
                            // yield forcePairwisePower(u, v, { power: -1, scalar: repulsive });
                        }
                    }
                }
                for(let e of elems.edges()) {
                    // Attractive force along edges (linear).
                    const p = e.source.node.center, q = e.target.node.center;
                    const dist = (new Vector()).subVectors(p, q).length();
                    yield nudgePair(p, q, -attractive * Math.pow(dist, 1))
                    // yield forcePairwisePower(
                    //         e.source.node, e.target.node, { power: 1, scalar: -attractive },
                    //     );;
                }
            },
            function* (elems, step) {
                for (let u of elems.nodes()) {
                    // Apply no-overlap to all siblings.
                    if(step > 15) {
                        for(let sibling of (elems as StructuredStorage).siblings(u)) {
                            yield constrainNodeNonoverlap(u, sibling);
                        }
                    }

                    yield constrainNodeChildren(u);
                    yield constrainNodePorts(u);
                }
            },
            { numSteps, numConstraintIters: 3, forceOptimizer: new EnergyOptimizer({ lrInitial: 0.4, lrMax: 0.6, lrMin: 0.001 }) }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive
            nodeColor={(n) => (n.meta && n.meta.group) || 0}/>
        );
    })
    .add('spring w/ simple nodes', () => {
        // const { nodes, edges } = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
        const { nodes, edges } = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 25);
        const optimizerType = select('optimizer', ['EnergyOptimizer', 'RMSPropOptimizer', 'BasicOptimizer', 'TrustRegionOptimizer'], 'EnergyOptimizer');
        let forceOptimizer: Optimizer;
        switch(optimizerType) {
            
            case 'BasicOptimizer': forceOptimizer = new BasicOptimizer(0.5, 1); break;
            case 'RMSPropOptimizer': forceOptimizer = new RMSPropOptimizer(2.0, 0.8); break;
            case 'TrustRegionOptimizer': forceOptimizer = new TrustRegionOptimizer(1, 0.01, 0.9, 10, 0.01); break;
            default:
            case 'EnergyOptimizer': forceOptimizer = new EnergyOptimizer({ lrInitial: 0.3, lrMax: 0.5, lrMin: 0.01, wait: 20, decay: 0.9, growth: 1.1, smoothing: 0.5 }); break;
        }
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    visited.add(u);
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

                        if((elems as StructuredStorage).existsEdge(u, v, true) && actualDistance > idealDistance) {
                            // Attractive force between edges if too far.
                            const delta = actualDistance - idealLength;
                            yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
                        } else if(actualDistance < idealDistance) {
                            // Repulsive force between node pairs if too close.
                            const delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                            yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
                        }
                    }
                }
            },
            function* (elems) {
                for (let u of elems.nodes()) {
                    yield constrainNodePorts(u);
                }
            },
            { numSteps, numConstraintIters: 5, numForceIters: 5, forceOptimizer }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('spring w/ compound nodes', () => {
        const { nodes, edges } = fromSchema([...kGraphCompound.nodesChildren, ...kGraphCompound.nodesParents], kGraphCompound.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 4);
        const optimizerType = select('optimizer', ['EnergyOptimizer', 'BasicOptimizer'], 'EnergyOptimizer');
        let forceOptimizer: Optimizer;
        switch(optimizerType) {
            case 'BasicOptimizer': forceOptimizer = new BasicOptimizer(0.8, 0.9); break;
            default:
            case 'EnergyOptimizer': forceOptimizer = new EnergyOptimizer({ lrInitial: 0.4, lrMax: 0.8, lrMin: 0.01 }); break;
        }


        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
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
                        if((elems as StructuredStorage).existsEdge(u, v, true) && actualDistance > idealLength) {
                            // Attractive force between edges if too far.
                            const delta = actualDistance - idealLength;
                            yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
                        } else if(actualDistance < idealDistance) {
                            // Repulsive force between node pairs if too close.
                            const delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                            yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
                        }
                    }
                }
            },
            function* (elems, step) {
                for (let u of elems.nodes()) {
                    // Apply no-overlap to all siblings.
                    if(step > 20) {
                        for(let sibling of (elems as StructuredStorage).siblings(u)) {
                            yield constrainNodeNonoverlap(u, sibling);
                        }
                    }

                    yield constrainNodeChildren(u);
                    yield constrainNodePorts(u);
                }
            },
            { numSteps, numConstraintIters: 5, numForceIters: 5, forceOptimizer }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive
                nodeColor={(n) => (n.meta && n.meta.group) || 0} />
        );
    })
    .add('spring w/ simple nodes (second-order)', () => {
        const { nodes, edges } = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 25);
        let forceOptimizer = new BasicOptimizer(0.6, 1);
        // let forceOptimizer = new EnergyOptimizer({ lrInitial: 0.4, lrMax: 0.8, lrMin: 0.001 });
        
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    visited.add(u);
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

                        if((elems as StructuredStorage).existsEdge(u, v, true) && actualDistance > idealDistance) {
                            // Attractive force between edge pairs if too far.
                            let delta = (actualDistance - idealDistance);
                            yield nudgePair(u.center, v.center, [-wu*delta, -wv*delta]);
                        } else if(actualDistance < idealDistance) {
                            // Repulsive force between any pair if too close.
                            let delta = (idealDistance - actualDistance) / Math.pow(uvPath, 2);
                            yield nudgePair(u.center, v.center, [wu*delta, wv*delta]);
                        }
                    }
                }
            },
            function* (elems) {
                for (let u of elems.nodes()) {
                    yield constrainNodePorts(u);
                }
            },
            { numSteps, numConstraintIters: 5, numForceIters: 5, forceOptimizer }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    });