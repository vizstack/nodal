import { Node, Edge, NodeId, EdgeId } from './elements';
import { isIterable, setIntersection, setUnion } from './utils';

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
    protected _nodes: Node[];
    protected _edges: Edge[];
    protected _nodeIdToIdx: Map<NodeId, number>;
    protected _edgeIdToIdx: Map<EdgeId, number>;

    constructor(nodes: Node[], edges: Edge[]) {
        super();
        this._nodes = nodes;
        this._edges = edges;
        this._nodeIdToIdx = new Map(nodes.map(({ id }, idx) => [id, idx]));
        this._edgeIdToIdx = new Map(edges.map(({ id }, idx) => [id, idx]));
    }
    public nodes(): Array<Node> {
        return Array.from(this._nodes);
    }
    public edges(): Array<Edge> {
        return Array.from(this._edges);
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

/**
 * A `StructuredStorage` maintaing data structures to make node hierarchy and edge traversal easier.
 */
export class StructuredStorage extends BasicStorage {
    protected _edgesTo: Map<Node, Edge[]>;
    protected _edgesFrom: Map<Node, Edge[]>;
    protected _roots: Set<Node>;
    protected _parents: Map<Node, Node>;

    constructor(nodes: Node[], edges: Edge[]) {
        super(nodes, edges);
        this._roots = new Set();
        this._parents = new Map();
        nodes.forEach((node) => {
            this._roots.add(node);
            node.children.forEach((child) =>{
                if (this._parents.has(child)) throw Error(`Node can only have 1 parent: child NodeId ${child.id}, parent NodeId ${node.id}`);
                this._parents.set(child, node);
            });
        });
        for(let child of this._parents.keys()) this._roots.delete(child);

        this._edgesFrom = new Map();
        this._edgesTo = new Map();
        edges.forEach((edge) => {
            const edgesFromSource = this._edgesFrom.get(edge.source.node);
            if(edgesFromSource === undefined) {
                this._edgesFrom.set(edge.source.node, [edge]);
            } else {
                edgesFromSource.push(edge);
            }
            const edgesToTarget = this._edgesTo.get(edge.target.node);
            if(edgesToTarget === undefined) {
                this._edgesTo.set(edge.target.node, [edge]);
            } else {
                edgesToTarget.push(edge);
            }
        });
    }

    // =============================================================================================
    // Traversal of compound node hierachy.

    public parents(ns: Node | Array<Node> | Set<Node>): Set<Node> {
        if(!isIterable<Node>(ns)) ns = [ns];
        const parents: Set<Node> = new Set();
        for(let node of ns) {
            const parent = this._parents.get(node);
            if(parent) parents.add(parent);
        }
        return parents;
    }
    public siblings(ns: Node | Array<Node> | Set<Node>): Set<Node> {
        if(!isIterable<Node>(ns)) ns = [ns];
        const siblings: Set<Node> = new Set();
        for(let node of ns) {
            const parent = this._parents.get(node);
            if(parent) {
                // Is non-root node.
                parent.children.forEach((root) => siblings.add(root));
            } else {
                // Is root node.
                this._roots.forEach((root) => siblings.add(root));
            }
            siblings.delete(node);
        }
        return siblings;
    }
    public children(ns: Node | Array<Node> | Set<Node>): Set<Node> {
        if(!isIterable<Node>(ns)) return new Set(ns.children);
        return new Set(Array.from(ns).flatMap((n) => n.children));
    }
    public roots(): Set<Node> {
        return this._roots;
    }
    public ancestors(
        ns: Node | Array<Node> | Set<Node>,
        { levels, until }: { levels?: number, until?: Node } = {},
    ): Set<Node> {
        if(!isIterable<Node>(ns)) ns = [ns];
        const ancestors: Set<Node> = new Set();
        const visited: Set<Node> = new Set();
        const traverse = (u: Node | undefined, level: number) => {
            if(u === undefined) return;
            if(levels !== undefined && level > levels) return;
            if(visited.has(u)) return;
            visited.add(u);
            ancestors.add(u);
            if(u === until) return;
            traverse(this._parents.get(u), level + 1);
        }
        for(let node of ns) {
            traverse(this._parents.get(node), 1);
        }
        return ancestors;
    }
    public descendants(ns: Node | Array<Node> | Set<Node>, levels?: number): Set<Node> {
        if(!isIterable<Node>(ns)) ns = [ns];
        const descendants: Set<Node> = new Set();
        const visited: Set<Node> = new Set();
        const traverse = (u: Node, level: number) => {
            if(levels !== undefined && level > levels) return;
            if(visited.has(u)) return;
            visited.add(u);
            descendants.add(u);
            u.children.forEach((child) => traverse(child, level + 1));
        }
        for(let node of ns) {
            node.children.forEach((child) => traverse(child, 1));
        }
        return descendants;
    }
    public hasAncestor(n: Node, ancestor: Node): boolean {
        let curr: Node | undefined = this._parents.get(n);
        while(true) {
            if (curr === undefined) return false;
            if (curr === ancestor) return true;
            curr = this._parents.get(curr);
        }
    }
    public hasDescendant(n: Node, descendant: Node): boolean {
        return this.hasAncestor(descendant, n);
    }
    public leastCommonAncestor(u: Node, v: Node): Node | undefined {
        const visited: Set<Node> = new Set();
        let left: Node | undefined = u;
        let right: Node | undefined = v;
        while (left || right) {
            // Alternate between advancing left and right pointers up the ancestor tree. The first
            // node that is visited a second time is the lca.
            if (left) {
                if (visited.has(left)) return left;
                visited.add(left);
                left = this._parents.get(left);
            }
            if (right) {
                if (visited.has(right)) return right;
                visited.add(right);
                right = this._parents.get(right);
            }
        }
        return undefined;
    }
    

    // =============================================================================================
    // Traversal of edge structure.

    public neighbors(ns: Node | Array<Node> | Set<Node>): Set<Node> {
        return setUnion(this.sources(ns), this.targets(ns));
    }
    public sources(ns: Node | Array<Node> | Set<Node>): Set<Node> {
        const sources: Set<Node> = new Set();
        this.edgesTo(ns).forEach((e) => sources.add(e.source.node));
        return sources;
    }
    public targets(ns: Node | Array<Node> | Set<Node>): Set<Node> {
        const targets: Set<Node> = new Set();
        this.edgesFrom(ns).forEach((e) => targets.add(e.target.node));
        return targets;
    }
    public edgesTo(ns: Node | Array<Node> | Set<Node>): Set<Edge> {
        if(!isIterable<Node>(ns)) ns = [ns];
        const edgesTo: Set<Edge> = new Set();
        for(let node of ns) {
            const es = this._edgesTo.get(node)
            if(es) es.forEach((e) => edgesTo.add(e));
        }
        return edgesTo;
    }
    public edgesFrom(ns: Node | Array<Node> | Set<Node>): Set<Edge> {
        if(!isIterable<Node>(ns)) ns = [ns];
        const edgesFrom: Set<Edge> = new Set();
        for(let node of ns) {
            const es = this._edgesFrom.get(node)
            if(es) es.forEach((e) => edgesFrom.add(e));
        }
        return edgesFrom;
    }
    public existsEdge(u: Node, v: Node, undirected: boolean = false): boolean {
        const edgesFrom = this._edgesFrom.get(u);
        if(edgesFrom) {
            for(let e of edgesFrom) {
                if(e.target.node === v) return true;
            }
        }
        if(undirected) {
            const edgesTo = this._edgesTo.get(u);
            if(edgesTo) {
                for(let e of edgesTo) {
                    if(e.source.node === v) return true;
                }
            }
        }
        return false;
    }
    public connectedComponents(): Set<Set<Node>> {
        // TODO
        return new Set();
    }
    public shortestPaths(directed: boolean = false): ((u: Node, v: Node) => number | undefined) {
        // Initialize distances with 1 for directly connected edges. If undefined, the distance is 
        // assumed to be infinity if source and target are different, and 0 if source and target
        // are the same.
        const dist: Map<string, number> = new Map();
        this._edges.forEach((edge) => {
            dist.set(`${edge.source.id}|${edge.target.id}`, 1);
            if(!directed) dist.set(`${edge.target.id}|${edge.source.id}`, 1);
        });

        // Run Floyd-Warshall algorithm to find all-pairs shortest paths.
        let sources: Set<Node>, targets: Set<Node>, intermediates: Set<Node>;
        if(directed) {
            sources = this.sources(this.nodes());
            targets = this.targets(this.nodes());
            intermediates = setIntersection(sources, targets);
        } else {
            sources = targets = intermediates = this.neighbors(this.nodes());
        }
        for(let k of intermediates) {
            for(let i of sources) {
                for(let j of targets) {
                    let dist_ij = i === j ? 0 : dist.get(`${i.id}|${j.id}`) || Number.POSITIVE_INFINITY;
                    let dist_ik = i === k ? 0 : dist.get(`${i.id}|${k.id}`) || Number.POSITIVE_INFINITY;
                    let dist_kj = k === j ? 0 : dist.get(`${k.id}|${j.id}`) || Number.POSITIVE_INFINITY;
                    const dist_ij_new = Math.min(dist_ij, dist_ik + dist_kj);
                    if(Number.isFinite(dist_ij_new)) {
                        dist.set(`${i.id}|${j.id}`, dist_ij_new);
                    }
                }
            }
        }

        return (u, v) => u === v ? 0 : dist.get(`${u.id}|${v.id}`);
    }
}

// TODO: export class QuadTreeStorage extends Storage
