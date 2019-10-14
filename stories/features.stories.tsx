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
import { kGraphTwo } from './schemas-two';



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
    .add('simple nodes (shapes)', () => {
        const idealLength = number('ideal length', 30);
        const layout = makeLayout(
            kGraphFive.nodesShapes,
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
    .add('compound nodes (shapes)', () => {
        const idealLength = number('ideal length', 30);
        const compactness = number('group compactness', 0.5);
        const layout = makeLayout(
            kGraphFive.nodesNestedShapes,
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
                function* align(nodes: NodeId[], axis: [number, number]) {
                    yield* generateNodeAlignmentConstraints(nodes.map((n) => storage.node(n)), axis);
                }

                yield* align(['n0', 'n1'], [1, 0]);
                yield* align(['n1', 'n2', 'n4'], [0, 1]);
                yield* align(['n2', 'n3'], [1, 0]);
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
    });