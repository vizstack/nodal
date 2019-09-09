import { NodeSchema, EdgeSchema } from '../src';

const kSize = 20;

export const kGraphTwo: {
    nodes: NodeSchema[],
    edges: EdgeSchema[],
} = {
    nodes: [
        { id: 'n0', shape: { width: kSize, height: kSize } },
        { id: 'n1', shape: { width: kSize, height: kSize } },
    ],
    edges: [
        { id: 'e0->1', source: { id: 'n0' }, target: { id: 'n1' } },
    ],
};