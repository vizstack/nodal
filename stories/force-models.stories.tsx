import React from 'react';
import { storiesOf } from '@storybook/react';
import { number } from '@storybook/addon-knobs';
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
    forcePairwisePower,
    forcePairwise,
    forcePairwiseNodes,
    forceVector,
    fromSchema,
    positionChildren,
    positionPorts,
    positionNoOverlap,
    constrainOffset,
    BasicOptimizer,
    TrustRegionOptimizer,
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';
import { kGraphFive } from './schemas-five';
import { kGraphSimple } from './schemas-simple';
import { kGraphCompound } from './schemas-compound';


storiesOf('force models', module)
    .add('spring-electrical w/ simple nodes', () => {
        const [nodes, edges] = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const elems = new BasicStorage(nodes, edges);
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const repulsive = number('repulsive', 50);
        const attractive = number('attractive', 1);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    // console.debug('node center', {
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    // })
                    visited.add(u);
                    for(let v of elems.nodes()) {
                        if(visited.has(v)) continue;
                        if(u.fixed && v.fixed) continue;
                        // TODO: What if fixed?

                        // Repulsive force (hyperbolic).
                        yield forcePairwisePower(u, v, { power: -1, scalar: repulsive });
                        // console.debug('repulsive', {
                        //     step, uid: u.id, vid: v.id,
                        //     ugrad: grads[grads.length - 1][0].grad.clone(),
                        //     vgrad: grads[grads.length - 1][1].grad.clone(),
                        // });
                    }
                }
                for(let e of elems.edges()) {
                    // Attractive force (linear).
                    yield forcePairwisePower(
                        e.source.node, e.target.node, { power: 1, scalar: -attractive },
                    );
                    // console.debug('attractive', {
                    //     step, eid: e.id,
                    //     sourcegrad: grads[grads.length - 1][0].grad,
                    //     targetgrad: grads[grads.length - 1][1].grad,
                    //     sourceid: e.source.id,
                    //     targetid: e.target.id
                    // });
                }
            },
            function* (elems) {
                for (let u of elems.nodes()) {
                    yield positionPorts(u);
                    // console.debug('ports', { step, iter,
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    //     grads: grads[0].map(({ point, grad }) => ({ point: point.clone(), grad })),
                    // });
                }
            },
            { numSteps, numConstraintIters: 3, forceOptimizer: new TrustRegionOptimizer({ lrInitial: 0.4, lrMax: 0.6, lrMin: 0.001 }) }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('spring-electrical w/ compound nodes', () => {
        const [nodes, edges] = fromSchema([...kGraphCompound.nodesChildren, ...kGraphCompound.nodesParents], kGraphCompound.edges);
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
                            yield forcePairwisePower(u, child, { power: 1, scalar: -compactness});
                        };
                    }

                    for(let v of elems.nodes()) {
                        if(!visited.has(v)) {
                            // Repulsive force (hyperbolic).
                            yield forcePairwisePower(u, v, { power: -1, scalar: repulsive });
                        }
                    }
                }
                for(let e of elems.edges()) {
                    // Attractive force (linear).
                    yield forcePairwisePower(
                            e.source.node, e.target.node, { power: 1, scalar: -attractive },
                        );;
                }
            },
            function* (elems, step) {
                for (let u of elems.nodes()) {
                    // Apply no-overlap to all siblings.
                    if(step > 15) {
                        for(let sibling of (elems as StructuredStorage).siblings(u)) {
                            yield positionNoOverlap(u, sibling);
                        }
                    }

                    yield positionChildren(u);
                    yield positionPorts(u);
                }
            },
            { numSteps, numConstraintIters: 3, forceOptimizer: new TrustRegionOptimizer({ lrInitial: 0.4, lrMax: 0.6, lrMin: 0.001 }) }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive
            nodeColor={(n) => (n.meta && n.meta.group) || 0}/>
        );
    })
    .add('spring w/ simple nodes', () => {
        // const [nodes, edges] = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
        const [nodes, edges] = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 15);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    // console.debug('node center', {
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    // });
                    visited.add(u);
                    for(let v of elems.nodes()) {
                        if(visited.has(v)) continue;
                        if(u.fixed && v.fixed) continue;
                        const masses: [number, number] = [u.fixed ? 1e8 : 1, v.fixed ? 1e8 : 1];  // TODO

                        // Spring force. Attempt to reach ideal distance between all pairs,
                        // except unconnected pairs that are farther away than ideal.
                        const uvPath = shortestPath(u, v);
                        if(uvPath === undefined) continue; // Ignore disconnected components.
                        const idealDistance = idealLength * uvPath;
                        const actualDistance = u.center.distanceTo(v.center);

                        // if(actualDistance > idealDistance && !(elems as StructuredStorage).existsEdge(u, v)) {
                        //     continue;
                        // } else {
                        //     yield forcePairwisePower(u, v, { power: 1, control: idealDistance, scalar: -2*Math.pow(1, -2) });
                        // }

                        if((elems as StructuredStorage).existsEdge(u, v, true)) {
                            // Attractive force between edges if too far.
                            
                            // yield constrainDistance(u.center, v.center, "<=", idealLength, { masses });
                            if(actualDistance > idealLength) {
                                // let grads = forcePairwisePower(u, v, { power: 1, control: idealLength, scalar: -2*Math.pow(idealLength, -2)/ });  // TODO: Scale by idealLength
                                // // console.log('spring force', {
                                // //     uid: u.id,
                                // //     vid: v.id,
                                // //     ugrad: grads[0]!.grad,
                                // //     vgrad: grads[1]!.grad,
                                // //     upoint: grads[0]!.point.clone(),
                                // //     vpoint: grads[1]!.point.clone(),
                                // //     actualDistance,
                                // //     idealDistance,
                                // //     uvPath,
                                // // });
                                // yield grads;
                                yield forcePairwise(u.center, v.center, -(actualDistance - idealLength))
                            }
                            
                        } else {
                            // Repulsive force between node pairs if too close.
                            if(actualDistance < idealDistance) {
                                // yield forcePairwisePower(u, v, { power: 1, control: idealDistance, scalar: -2*Math.pow(uvPath, -2) });  // TODO: Scale by idealDistance
                                yield forcePairwiseNodes(u, v, (idealDistance - actualDistance))
                            }
                            // yield constrainDistance(u.center, v.center, ">=", idealDistance, { masses });
                        }

                        // if(actualDistance < idealDistance || (elems as StructuredStorage).existsEdge(u, v)) {
                        //     let grads: Gradient[] = forcePairwisePower(u, v, { power: 1, control: idealDistance, scalar: -1 });
                        //     yield grads;
                        //     // console.log('spring force', {
                        //     //     uid: u.id,
                        //     //     vid: v.id,
                        //     //     ugrad: grads[0]!.grad,
                        //     //     vgrad: grads[1]!.grad,
                        //     //     actualDistance,
                        //     //     idealDistance,
                        //     //     uvPath,
                        //     // });
                        // }
                    }
                }
            },
            function* (elems, step) {
                for (let u of elems.nodes()) {
                    yield positionPorts(u);
                    // console.debug('ports', { step, iter,
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    //     grads: grads[0].map(({ point, grad }) => ({ point: point.clone(), grad })),
                    // });
                }
            },
            { numSteps, numConstraintIters: 5, numForceIters: 5,
                // forceOptimizer: new BasicOptimizer(0.8, 0.9)
                forceOptimizer: new TrustRegionOptimizer({ lrInitial: 0.4, lrMax: 0.8, lrMin: 0.001 })
            }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive />
        );
    })
    .add('spring w/ compound nodes', () => {
        // const [nodes, edges] = fromSchema(kGraphFive.nodesEqual, kGraphFive.edgesAcyclic);
        const [nodes, edges] = fromSchema([...kGraphCompound.nodesChildren, ...kGraphCompound.nodesParents], kGraphCompound.edges);
        const elems = new StructuredStorage(nodes, edges);
        const shortestPath = elems.shortestPaths();
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 200, step: 1 });
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 2);
        const layout = new ForceConstraintLayout(
            elems,
            function* (elems) {
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
                        if((elems as StructuredStorage).existsEdge(u, v, true) && actualDistance > idealLength) {
                            // Attractive force between edges if too far.
                            const delta = actualDistance - idealLength;
                            yield forcePairwiseNodes(u, v, [-wu*delta, -wv*delta]);
                        } else {
                            if(actualDistance < idealDistance) {
                                // Repulsive force between node pairs if too close.
                                const delta = idealDistance - actualDistance;
                                yield forcePairwiseNodes(u, v, [wu*delta, wv*delta]);
                            }
                        }
                    }
                }
            },
            function* (elems, step) {
                for (let u of elems.nodes()) {
                    // Apply no-overlap to all siblings.
                    if(step > 20) {
                        for(let sibling of (elems as StructuredStorage).siblings(u)) {
                            yield positionNoOverlap(u, sibling);
                        }
                    }

                    yield positionChildren(u);
                    yield positionPorts(u);
                }

                // if(step > 10) {
                //     for (let e of elems.edges()) {
                //         yield constrainOffset(e.source.node.center, e.target.node.center, "=", 50, [0, 1], { masses: [e.source.node.fixed ? 1e9 : 1, e.target.node.fixed ? 1e9 : 1] });
                //     }
                // }

                
            },
            { numSteps, numConstraintIters: 5, numForceIters: 5,
                forceOptimizer: new TrustRegionOptimizer({ lrInitial: 0.4, lrMax: 0.8, lrMin: 0.001 })
            }
        );

        return (
            <Graph key={`${Math.random()}`} layout={layout} storage={elems} animated interactive
                nodeColor={(n) => (n.meta && n.meta.group) || 0} />
        );
    });