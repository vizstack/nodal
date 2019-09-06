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
        this._nodeIdToIdx = new Map();
        nodes.forEach(({ id }, idx) => {
            if (this._nodeIdToIdx.has(id)) throw Error(`Duplicate NodeId specified: ${id}`);
            this._nodeIdToIdx.set(id, idx);
        });
        this._edgeIdToIdx = new Map();
        edges.forEach(({ id }, idx) => {
            if (this._edgeIdToIdx.has(id)) throw Error(`Duplicate EdgeId specified: ${id}`);
            this._edgeIdToIdx.set(id, idx);
        });
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
}

// TODO: export class TreeStorage extends Storage
// TODO: export class QuadTreeStorage extends Storage
