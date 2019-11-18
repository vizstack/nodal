import { NodeSchema, EdgeSchema } from '../src';

const kSize = 20;

export const kGraphPorts: {
    nodes: NodeSchema[],
    edges: EdgeSchema[],
} = {
    nodes: [
        { id: 'n0', shape: { type: 'rectangle', width: kSize, height: kSize }, ports: { south: { location: 'south' } } },
        { id: 'n1', shape: { type: 'rectangle', width: kSize, height: kSize }, ports: { south: { location: 'south' }, east: { location: 'east' } } },
        { id: 'n2',
          shape: { type: 'rectangle', width: kSize, height: kSize },
          ports: { north: { location: 'north' }, south: { location: 'south'}, east: { location: 'east' } },
        },
        { id: 'n3', shape: { type: 'rectangle', width: kSize, height: kSize } },
        { id: 'p0',
          children: ['n2'],
          shape: { type: 'rectangle', width: kSize, height: kSize },
          ports: { south: { location: 'south' } },
        },
    ],
    edges: [
        { id: 'e0s->2n', source: { id: 'n0', port: 'south' }, target: { id: 'n2', port: 'north' } },
        { id: 'e1s->2n', source: { id: 'n1', port: 'south' }, target: { id: 'n2', port: 'north' } },
        { id: 'e1e->2e', source: { id: 'n1', port: 'east' }, target: { id: 'n2', port: 'east' } },
        { id: 'e2s->p0s', source: { id: 'n2', port: 'south' }, target: { id: 'p0', port: 'south' } },
        { id: 'ep0s->3', source: { id: 'p0', port: 'south' }, target: { id: 'n3' } },
    ],
};