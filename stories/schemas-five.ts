import { NodeSchema, EdgeSchema } from '../src';

const kSize = 20;

export const kGraphFive: {
    nodesEqual: NodeSchema[],
    nodesUnequal: NodeSchema[],
    nodesNested: NodeSchema[],
    edgesAcyclic: EdgeSchema[],
    edgesCyclic: EdgeSchema[],
    edgesTree: EdgeSchema[],
} = {
    nodesEqual: [
        { id: 'n0', shape: { type: 'rectangle', width: kSize, height: kSize } },
        { id: 'n1', shape: { type: 'rectangle', width: kSize, height: kSize } },
        { id: 'n2', shape: { type: 'rectangle', width: kSize, height: kSize } },
        { id: 'n3', shape: { type: 'rectangle', width: kSize, height: kSize } },
        { id: 'n4', shape: { type: 'rectangle', width: kSize, height: kSize } },
    ],
    nodesUnequal: [
        { id: 'n0', shape: { type: 'rectangle', width: kSize, height: kSize }},
        { id: 'n1', shape: { type: 'rectangle', width: kSize * 2, height: kSize }},
        { id: 'n2', shape: { type: 'rectangle', width: kSize * 2, height: kSize * 2 }},
        { id: 'n3', shape: { type: 'rectangle', width: kSize, height: kSize * 2 }},
        { id: 'n4', shape: { type: 'rectangle', width: kSize, height: kSize }},
    ],
    nodesNested: [
        { id: 'n0', shape: { type: 'rectangle', width: kSize, height: kSize }},
        { id: 'n1', shape: { type: 'rectangle', width: kSize, height: kSize }, children: ['n2', 'n3'] },
        { id: 'n2', shape: { type: 'rectangle', width: kSize, height: kSize }},
        { id: 'n3', shape: { type: 'rectangle', width: kSize, height: kSize }},
        { id: 'n4', shape: { type: 'rectangle', width: kSize, height: kSize }},
    ],
    edgesAcyclic: [
        { id: 'e0->1', source: { id: 'n0' }, target: { id: 'n1' } },
        { id: 'e0->2', source: { id: 'n0' }, target: { id: 'n2' } },
        { id: 'e0->3', source: { id: 'n0' }, target: { id: 'n3' } },
        { id: 'e0->4', source: { id: 'n0' }, target: { id: 'n4' } },
        { id: 'e2->3', source: { id: 'n2' }, target: { id: 'n3' } },
    ],
    edgesCyclic: [
        { id: 'e0->1', source: { id: 'n0' }, target: { id: 'n1' } },
        { id: 'e1->2', source: { id: 'n1' }, target: { id: 'n2' } },
        { id: 'e2->3', source: { id: 'n2' }, target: { id: 'n3' } },
        { id: 'e3->0', source: { id: 'n3' }, target: { id: 'n0' } },
        { id: 'e3->4', source: { id: 'n3' }, target: { id: 'n4' } },
    ],
    edgesTree: [
        { id: 'e0->1', source: { id: 'n0' }, target: { id: 'n1' } },
        { id: 'e1->2', source: { id: 'n1' }, target: { id: 'n2' } },
        { id: 'e2->3', source: { id: 'n2' }, target: { id: 'n3' } },
        { id: 'e2->4', source: { id: 'n2' }, target: { id: 'n4' } },
    ],
};