import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';
import { text, boolean, number } from '@storybook/addon-knobs';
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
    ForceConstraintLayout,
    forcePairwisePower,
    forceVector,
    fromSchema,
    positionPorts,
    positionNoOverlap,
} from '../src';
import { Graph } from './Graph';
import { kGraphTwo } from './schemas-two';
import { kGraphFive } from './schemas-five';
import { kGraphSimple } from './schemas-simple';
import { kGraphCompound } from './schemas-compound';


storiesOf('interactive examples', module)
    .add('spring-electrical model w/ simple nodes', () => {
        const [nodes, edges] = fromSchema(kGraphSimple.nodes, kGraphSimple.edges);
        const elems = new BasicStorage(nodes, edges);
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 100, step: 1 });
        const repulsive = number('repulsive', 50);
        const attractive = number('attractive', 1);
        const layout = new ForceConstraintLayout(
            elems,
            (elems, step) => {
                const grads: Gradient[][] = [];
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    // console.debug('node center', {
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    // })
                    visited.add(u);
                    for(let v of elems.nodes()) {
                        if(!visited.has(v)) {
                            // Repulsive force (hyperbolic).
                            grads.push(
                                forcePairwisePower(u, v, { power: -1, scalar: repulsive })
                            );
                            // console.debug('repulsive', {
                            //     step, uid: u.id, vid: v.id,
                            //     ugrad: grads[grads.length - 1][0].grad.clone(),
                            //     vgrad: grads[grads.length - 1][1].grad.clone(),
                            // });
                        }
                    }
                }
                for(let e of elems.edges()) {
                    // Attractive force (linear).
                    grads.push(
                        forcePairwisePower(
                            e.source.node, e.target.node, { power: 1, scalar: -attractive },
                        )
                    );
                    // console.debug('attractive', {
                    //     step, eid: e.id, sourcegrad: grads[grads.length - 1][0].grad, targetgrad: grads[grads.length - 1][1].grad, sourceid: e.source.id, targetid: e.target.id
                    // });
                }
                return grads.flat();
            },
            (elems, step, iter) => {
                const grads: Gradient[][] = [];
                for (let u of elems.nodes()) {
                    grads.push(positionPorts(u));
                    // console.debug('ports', { step, iter,
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    //     grads: grads[0].map(({ point, grad }) => ({ point: point.clone(), grad })),
                    // });
                }
                return grads.flat();
            },
            { numSteps, numConstraintIters: 3 }
        );
        layout.start();

        return (
            <Graph nodes={elems.nodes()}
                   edges={elems.edges()}
                   bounds={elems.bounds()} />
        );
    })
    .add('spring-electrical model w/ compound nodes', () => {
        const [nodes, edges] = fromSchema([...kGraphCompound.nodesChildren, ...kGraphCompound.nodesParents], kGraphCompound.edges);
        const elems = new BasicStorage(nodes, edges);
        const numSteps = number('# timesteps', 100, { range: true, min: 0, max: 100, step: 1 });
        const repulsive = number('repulsive', 50);
        const attractive = number('attractive', 0.2);
        const compactness = number('group compactness', 0.2);

        // Build up parents data structure.
        const parents: Map<Node, Node> = new Map();
        elems.nodes().forEach((parent) => {
            parent.children.forEach((child) => {
                parents.set(child, parent);
            });
        });

        const layout = new ForceConstraintLayout(
            elems,
            (elems, step) => {
                const grads: Gradient[][] = [];
                const visited: Set<Node> = new Set();
                for(let u of elems.nodes()) {
                    // console.debug('node center', {
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    // })
                    visited.add(u);

                    // Compound nodes should pull children closer.
                    if(u.children.length > 0) {
                        u.children.forEach((child) => {
                            grads.push(
                                forcePairwisePower(u, child, { power: 1, scalar: -compactness})
                            )
                        });
                    }

                    for(let v of elems.nodes()) {
                        if(!visited.has(v)) {
                            // Repulsive force (hyperbolic).
                            grads.push(
                                forcePairwisePower(u, v, { power: -1, scalar: repulsive })
                            );
                            // console.debug('repulsive', {
                            //     step, uid: u.id, vid: v.id,
                            //     ugrad: grads[grads.length - 1][0].grad.clone(),
                            //     vgrad: grads[grads.length - 1][1].grad.clone(),
                            // });
                        }
                    }
                }
                for(let e of elems.edges()) {
                    // Attractive force (linear).
                    grads.push(
                        forcePairwisePower(
                            e.source.node, e.target.node, { power: 1, scalar: -attractive },
                        )
                    );
                    // console.debug('attractive', {
                    //     step, eid: e.id, sourcegrad: grads[grads.length - 1][0].grad, targetgrad: grads[grads.length - 1][1].grad, sourceid: e.source.id, targetid: e.target.id
                    // });
                }
                return grads.flat();
            },
            (elems, step, iter) => {
                const grads: Gradient[][] = [];
                for (let u of elems.nodes()) {

                    // Compute new group bounds, and
                    if(u.children.length > 0) {
                        const box = new Box2();
                        u.children.forEach((child) => {
                            box.expandByPoint(new Vector2(
                                child.center.x - child.shape.width /2,
                                child.center.y - child.shape.height/2,
                            ));
                            box.expandByPoint(new Vector2(
                                child.center.x + child.shape.width /2,
                                child.center.y + child.shape.height/2,
                            ))
                        });
                        box.getCenter(u.center);
                        const dims = new Vector2();
                        box.getSize(dims);
                        u.shape.width = dims.x;
                        u.shape.height = dims.y;
                    }

                    grads.push(positionPorts(u));
                    // console.debug('ports', { step, iter,
                    //     uid: u.id,
                    //     ucenter: u.center.clone(),
                    //     grads: grads[0].map(({ point, grad }) => ({ point: point.clone(), grad })),
                    // });
                }

                // Apply no-overlap to all siblings.
                for (let u of elems.nodes()) {
                    const parent = parents.get(u);
                    if(parent) {
                        parent.children.forEach((child) => {
                            grads.push(positionNoOverlap(u, child))
                        });
                    }
                }

                return grads.flat();
            },
            { numSteps, numConstraintIters: 3 }
        );
        layout.start();

        return (
            <Graph nodes={elems.nodes()}
                   edges={elems.edges()}
                   bounds={elems.bounds()} />
        );
    });

storiesOf('tests', module)
    .add('render nodes/edges', () => {
        const [nodes, edges] = fromSchema([
            { id: 'n0', shape: { width: 50, height: 50 }, center: { x: 50, y: 75 } },
            { id: 'n1', shape: { width: 50, height: 100 }, center: { x: 150, y: 75 } },
        ], [
            { id: 'e0->1', source: { id: 'n0' }, target: { id: 'n1' } },
        ])
        return (
            <Graph nodes={nodes} edges={edges}/>
        );
    });
