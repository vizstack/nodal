import { NodeSchema, EdgeSchema } from '../src';

const kSize = 15;

const numNodes = 80;
const edges = [
    { t: 1, s: 0 },
    { t: 2, s: 0 },
    { t: 9, s: 0 },
    { t: 11, s: 0 },
    { t: 78, s: 1 },
    { t: 3, s: 2 },
    { t: 4, s: 3 },
    { t: 5, s: 4 },
    { t: 6, s: 5 },
    { t: 10, s: 6 },
    { t: 8, s: 7 },
    { t: 11, s: 7 },
    { t: 12, s: 8 },
    { t: 18, s: 9 },
    { t: 35, s: 10 },
    { t: 13, s: 12 },
    { t: 14, s: 12 },
    { t: 15, s: 12 },
    { t: 16, s: 12 },
    { t: 17, s: 12 },
    { t: 19, s: 12 },
    { t: 20, s: 12 },
    { t: 21, s: 12 },
    { t: 23, s: 12 },
    { t: 25, s: 12 },
    { t: 26, s: 12 },
    { t: 28, s: 12 },
    { t: 29, s: 12 },
    { t: 31, s: 12 },
    { t: 24, s: 13 },
    { t: 45, s: 14 },
    { t: 22, s: 15 },
    { t: 49, s: 16 },
    { t: 30, s: 18 },
    { t: 39, s: 19 },
    { t: 40, s: 20 },
    { t: 50, s: 21 },
    { t: 27, s: 22 },
    { t: 63, s: 23 },
    { t: 72, s: 24 },
    { t: 60, s: 26 },
    { t: 68, s: 27 },
    { t: 59, s: 29 },
    { t: 32, s: 31 },
    { t: 33, s: 31 },
    { t: 34, s: 31 },
    { t: 36, s: 31 },
    { t: 37, s: 31 },
    { t: 38, s: 31 },
    { t: 58, s: 32 },
    { t: 75, s: 33 },
    { t: 41, s: 34 },
    { t: 48, s: 35 },
    { t: 76, s: 36 },
    { t: 42, s: 37 },
    { t: 44, s: 38 },
    { t: 46, s: 38 },
    { t: 47, s: 38 },
    { t: 43, s: 39 },
    { t: 57, s: 40 },
    { t: 67, s: 41 },
    { t: 74, s: 42 },
    { t: 51, s: 43 },
    { t: 52, s: 48 },
    { t: 53, s: 48 },
    { t: 54, s: 48 },
    { t: 55, s: 48 },
    { t: 56, s: 48 },
    { t: 61, s: 48 },
    { t: 62, s: 48 },
    { t: 64, s: 62 },
    { t: 65, s: 62 },
    { t: 66, s: 62 },
    { t: 69, s: 62 },
    { t: 70, s: 69 },
    { t: 71, s: 69 },
    { t: 73, s: 69 },
    { t: 77, s: 69 },
    { t: 79, s: 78 },
];

const kGraphSimple: {
    nodes: NodeSchema[],
    edges: EdgeSchema[],
} = {
    nodes: [],
    edges: [],
};

for(let n = 0; n < numNodes; n++) {
    kGraphSimple.nodes.push({ id: `n${n}`, shape: { width: kSize, height: kSize } });
}

edges.forEach(({ s, t }) => {
    kGraphSimple.edges.push(
        { id: `e${s}->${t}`, source: { id: `n${s}` }, target: { id: `n${t}` } }
    );
});

export { kGraphSimple };