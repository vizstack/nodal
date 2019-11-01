import { NodeSchema, EdgeSchema } from '../src';

const kSize = 30;

const kGraphGrid: {
    nodes: NodeSchema[],
    edges: EdgeSchema[],
} = {
    nodes: [
        { id: 'p0', children: ['p7', '6', '4'], meta: { group: 0 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        // { id: 'p0', children: ['6', '4'], meta: { group: 0 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p1', children: ['2', '20', '7'], meta: { group: 1 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        // { id: 'p1', children: ['2', '7'], meta: { group: 1 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p2', children: ['15', '24'], meta: { group: 2 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        // { id: 'p2', children: ['15'], meta: { group: 2 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p3', children: ['11', '1'], meta: { group: 3 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p4', children: ['0', '13'], meta: { group: 4 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p5', children: ['p8', '23', '12'], meta: { group: 5 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        // { id: 'p5', children: ['23', '12'], meta: { group: 5 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p6', children: ['16', '14'], meta: { group: 6 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p7', children: ['17', '10'], meta: { group: 7 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p8', children: ['p9', '19'], meta: { group: 8 } },
        // { id: 'p8', children: ['9', '19'], meta: { group: 8 }, shape: { type: 'rectangle', width: 100, height: 100 } },
        { id: 'p9', children: ['9'], meta: { group: 9 } },
    ],
    edges: [],
};

const numLeafNodes = 26;  // 0 ... 25
const edges: any[] = [
    { s: '10', t: '21' },
    { s: '6', t: '11' },
    // { s: 'p0', t: '2' },
    { s: '2', t: '1' },
    { s: '7', t: '2' },
    { s: '7', t: '9' },
    { s: '15', t: '7' },
    { s: '24', t: '11' },
    { s: '1', t: '16' },
    { s: '0', t: '25' },
    { s: '3', t: '0' },
    { s: '13', t: '2' },
    { s: '13', t: '14' },
    // { s: 'p4', t: 'p3' },
    // { s: '12', t: 'p6' },
    // { s: '5', t: 'p5' },
    { s: '5', t: '4' },
    { s: '8', t: '13' },
    // { s: '8', t: 'p1' },
    { s: '18', t: '14' },
    { s: '18', t: '22' },
];

for(let n = 0; n < numLeafNodes; n++) {
    kGraphGrid.nodes.push(
        { id: `${n}`, shape: { type: 'rectangle', width: kSize, height: kSize } }
    );
}

edges.forEach(({ s, t }) => {
    kGraphGrid.edges.push(
        { id: `e${s}->${t}`, source: { id: s }, target: { id: t } }
    );
});

export { kGraphGrid };