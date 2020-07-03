import { NodeSchema, EdgeSchema } from '../src/graph';

const kRadius = 10;

const nodes: NodeSchema[] = [];
for (let i = 0; i < 20; i++) {
    nodes.push({ id: `r${i}`, shape: { type: 'circle', radius: kRadius } });
}
for (let i = 0; i < 20; i++) {
    nodes.push({ id: `g${i}`, shape: { type: 'circle', radius: kRadius } });
}
nodes.push({ id: `rg0`, shape: { type: 'circle', radius: kRadius } });
nodes.push({ id: `rg1`, shape: { type: 'circle', radius: kRadius } });

// for (let i = 0; i < 20; i++) {
//     nodes.push(
//         { id: `y${i}`, shape: { type: 'circle', radius: kRadius } }
//     );
// }
for (let i = 0; i < 20; i++) {
    nodes.push({ id: `o${i}`, shape: { type: 'circle', radius: kRadius } });
}
// for (let i = 0; i < 20; i++) {
//     nodes.push(
//         { id: `p${i}`, shape: { type: 'circle', radius: kRadius } }
//     );
// }

const edges: EdgeSchema[] = [];
// Red route
for (let i = 1; i <= 10; i++) {
    edges.push({ id: `r${i - 1}->r${i}`, source: { id: `r${i - 1}` }, target: { id: `r${i}` } });
}
edges.push({ id: `r10->rg0`, source: { id: `r10` }, target: { id: `rg0` } });
edges.push({ id: `rg0->r11`, source: { id: `rg0` }, target: { id: `r11` } });
for (let i = 12; i < 16; i++) {
    edges.push({ id: `r${i - 1}->r${i}`, source: { id: `r${i - 1}` }, target: { id: `r${i}` } });
}
edges.push({ id: `r15->rg1`, source: { id: `r15` }, target: { id: `rg1` } });
edges.push({ id: `rg1->r16`, source: { id: `rg1` }, target: { id: `r16` } });
for (let i = 17; i < 20; i++) {
    edges.push({ id: `r${i - 1}->r${i}`, source: { id: `r${i - 1}` }, target: { id: `r${i}` } });
}

// Green route
for (let i = 1; i <= 10; i++) {
    edges.push({ id: `g${i - 1}->g${i}`, source: { id: `g${i - 1}` }, target: { id: `g${i}` } });
}
edges.push({ id: `g10->rg0`, source: { id: `g10` }, target: { id: `rg0` } });
edges.push({ id: `rg0->g11`, source: { id: `rg0` }, target: { id: `g11` } });
for (let i = 12; i < 16; i++) {
    edges.push({ id: `g${i - 1}->g${i}`, source: { id: `g${i - 1}` }, target: { id: `g${i}` } });
}
edges.push({ id: `g15->rg1`, source: { id: `g15` }, target: { id: `rg1` } });
edges.push({ id: `rg1->g16`, source: { id: `rg1` }, target: { id: `g16` } });
for (let i = 17; i < 20; i++) {
    edges.push({ id: `g${i - 1}->g${i}`, source: { id: `g${i - 1}` }, target: { id: `g${i}` } });
}

// Orange route
for (let i = 1; i <= 10; i++) {
    edges.push({ id: `o${i - 1}->o${i}`, source: { id: `o${i - 1}` }, target: { id: `o${i}` } });
}
edges.push({ id: `o10->r10`, source: { id: `o10` }, target: { id: `r10` } });
edges.push({ id: `r10->o11`, source: { id: `r10` }, target: { id: `o11` } });
for (let i = 12; i <= 14; i++) {
    edges.push({ id: `o${i - 1}->o${i}`, source: { id: `o${i - 1}` }, target: { id: `o${i}` } });
}
edges.push({ id: `o14->g8`, source: { id: `o14` }, target: { id: `g8` } });
edges.push({ id: `g8->o15`, source: { id: `g8` }, target: { id: `o15` } });
for (let i = 16; i < 20; i++) {
    edges.push({ id: `o${i - 1}->o${i}`, source: { id: `o${i - 1}` }, target: { id: `o${i}` } });
}

export const kGraphMetro = { nodes, edges };
