import { Node, Edge, NodeId, EdgeId } from './elements';

/**
 * A `Storage` is a data structure that stores `Node` and `Edge` elements, with different speed/
 * memory characteristics and methods for lookup and iteration.
 */
export abstract class Storage {
    public abstract nodes(): Iterable<Node>;
    public abstract edges(): Iterable<Edge>;
    public abstract node(id: NodeId): Node;
    public abstract edge(id: EdgeId): Edge;
    public abstract bounds(): { x: number, X: number, y: number, Y: number, width: number, height: number };
}

/**
 * A `BasicStorage` utilizes a flat representation to enable Node/Edge lookup by ID in O(1)/O(1) and
 * traversal in O(n)/O(m).
 */
export class BasicStorage extends Storage {
    private _nodes: Node[];
    private _edges: Edge[];
    private _nodeIdToIdx: Map<NodeId, number>;
    private _edgeIdToIdx: Map<EdgeId, number>;

    constructor(nodes: Node[], edges: Edge[]) {
        super();
        this._nodes = nodes;
        this._edges = edges;
        this._nodeIdToIdx = new Map(nodes.map(({ id }, idx) => [id, idx]));
        this._edgeIdToIdx = new Map(edges.map(({ id }, idx) => [id, idx]));
    }
    public nodes() {
        return this._nodes;
    }
    public edges() {
        return this._edges;
    }
    public node(id: NodeId) {
        const idx = this._nodeIdToIdx.get(id);
        if (idx === undefined) throw Error(`Could not find Node with specified NodeId: ${id}`);
        return this._nodes[idx];
    }
    public edge(id: EdgeId) {
        const idx = this._edgeIdToIdx.get(id);
        if (idx === undefined) throw Error(`Could not find Edge with specified EdgeId: ${id}`);
        return this._edges[idx];
    }
    public bounds() {
        if(this._nodes.length == 0) return { x: 0, y: 0, X: 0, Y: 0, width: 0, height: 0 };
        let x = Number.MAX_VALUE, y = Number.MAX_VALUE, X = Number.MIN_VALUE, Y = Number.MIN_VALUE;
        this._nodes.forEach((node) => {
            x = Math.min(x, node.center.x - node.shape.width / 2);
            y = Math.min(y, node.center.y - node.shape.height / 2);
            X = Math.max(X, node.center.x + node.shape.width / 2);
            Y = Math.max(Y, node.center.y + node.shape.height / 2);
        });
        this._edges.forEach((edge) => {
            const xs = edge.path.map((pt) => pt.x);
            const ys = edge.path.map((pt) => pt.y);
            x = Math.min(x, ...xs);
            y = Math.min(y, ...ys);
            X = Math.max(X, ...xs);
            Y = Math.max(Y, ...ys);
        });
        return { x, y, X, Y, width: X - x, height: Y - y };
    }
}

// TODO: export class TreeStorage extends Storage
// TODO: export class QuadTreeStorage extends Storage
