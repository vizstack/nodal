import { Node, Edge, NodeId, EdgeId } from './elements';
import { StructuredStorage } from './storage';
import { Vector } from '../optim';
import PriorityQueue from 'fastpriorityqueue';

type RouteVertex = {
    x: number,
    y: number,
    neighbors: {
        north?: RouteVertex,
        south?: RouteVertex,
        east?: RouteVertex,
        west?: RouteVertex,
    },
    node?: Node,
    port?: Vector,
};
type RoutePartial = {
    /** Latest node on partial path. */
    vertex: RouteVertex,

    /** Direction of entry into latest node. */
    direction: CardinalDirection,

    /** Length so far of partial path. */
    length: number,

    /** Bends so far in partial path. */
    bends: number,

    /** Combined actual and expected (heuristic) cost of partial path. */
    cost: number,
    
    /** Key of previous vertex on partial path. */
    backlink?: string,
};
type HorizontalSegment = { y: number, x0: number, x1: number, vertices: RouteVertex[] };
type VerticalSegment = { x: number, y0: number, y1: number, vertices: RouteVertex[] };

type OrthogonalRouterConfig = {
    nodeMargin: number,
    edgeGap: number,
    outerGap: number,
};

type CardinalDirection = "north" | "south" | "east" | "west";
const directionRight = { north: "east", east: "south", south: "west", west: "north" };
const directionLeft = { north: "west", east: "north", south: "east", west: "south" };
const directionReverse = { north: "south", east: "west", south: "north", west: "east" };
function manhattanDistance(u: RouteVertex, v: RouteVertex) {
    return Math.abs(u.x - v.x) + Math.abs(u.y - v.y);
} 
function costFn(length: number, bends: number) {
    return length + 1000*bends;
}
function lengthHeuristic(vertex: RouteVertex, end: RouteVertex) {
    return manhattanDistance(vertex, end);
}
function bendsHeuristic(vertex: RouteVertex, end: RouteVertex) {
    return 0; // TODO
}


/**
 * An `OrthogonalRouter` converts edge paths from straight segments of any orientation into
 * orthogonal routes of only horizontal/vertical segments.
 */
export class OrthogonalRouter {
    protected _config: OrthogonalRouterConfig;
    constructor(
        public storage: StructuredStorage,
        {
            nodeMargin = 8,
            edgeGap = 4,
            outerGap = 8,
        }: Partial<OrthogonalRouterConfig> = {},
    ) {
        this._config = {
            nodeMargin,
            edgeGap,
            outerGap,
        }
    }

    /**
     * Runs the routing procedure on the edges, making in-place changes.
     */
    public route(): void {
        // This code implements the algorithms described in "Orthogonal Connector Routing"
        // (Wybrow et al, 2009). It uses a 3-phase approach:
        // (1) an orthogonal visibility graph is constructed by intersecting "interesting"
        //     horizontal/vertical line segments.
        // (2) the optimal routes are found using A* search
        // (3) any overlapping routes are ordered and nudged apart
        if(Array.from(this.storage.nodes()).length === 0) return;
        const graph = this._getVisibilityGraph();        
        const routes = this._getOptimalRoutes(graph);
        // const nudged = this._getNudgedRoutes(optimal);
        
        this.storage.edges().forEach((edge) => {
            const route = routes.get(edge);
            if(!route) return;
            edge.path = route.map((v) => v.port || new Vector(v.x, v.y));
        })
    }

    protected _getVisibilityGraph(): RouteVertex[] {
        console.log("Get visibility graph");
        const hlines: HorizontalSegment[] = [];
        const vlines: VerticalSegment[] = [];
        const vertices: RouteVertex[] = [];

         // Add graph bound lines.
        const graphBounds = {
            x: Number.POSITIVE_INFINITY,
            X: Number.NEGATIVE_INFINITY,
            y: Number.POSITIVE_INFINITY, 
            Y: Number.NEGATIVE_INFINITY,
        };
        for(let node of this.storage.nodes()) {
            const { x, X, y, Y } = node.shape.bounds();
            graphBounds.x = Math.min(x - this._config.outerGap, graphBounds.x);
            graphBounds.y = Math.min(y - this._config.outerGap, graphBounds.y);
            graphBounds.X = Math.max(X + this._config.outerGap, graphBounds.X);
            graphBounds.Y = Math.max(Y + this._config.outerGap, graphBounds.Y);
        }
        hlines.push({ y: graphBounds.y, x0: graphBounds.x, x1: graphBounds.X, vertices: [] });
        hlines.push({ y: graphBounds.Y, x0: graphBounds.x, x1: graphBounds.X, vertices: [] });
        vlines.push({ x: graphBounds.x, y0: graphBounds.y, y1: graphBounds.Y, vertices: [] });
        vlines.push({ x: graphBounds.X, y0: graphBounds.y, y1: graphBounds.Y, vertices: [] });

        // Add node extent and midpoint lines.
        for(let u of this.storage.nodes()) {
            const { x, X, y, Y } = u.shape.bounds();
            const center = { x: (x+X)/2, y: (y+Y)/2, neighbors: {}, node: u, port: u.center };
            vertices.push(center);
            hlines.push({
                y: y - this._config.nodeMargin,
                x0: graphBounds.x,
                x1: graphBounds.X,
                vertices: [],
            });
            hlines.push({
                y: (y + Y) / 2,
                x0: graphBounds.x,
                x1: graphBounds.X,
                vertices: [center],
            });
            hlines.push({
                y: Y + this._config.nodeMargin,
                x0: graphBounds.x,
                x1: graphBounds.X,
                vertices: [],
            });
            vlines.push({
                x: x - this._config.nodeMargin,
                y0: graphBounds.y,
                y1: graphBounds.Y,
                vertices: [],
            });
            vlines.push({
                x: (x + X) / 2,
                y0: graphBounds.y,
                y1: graphBounds.Y,
                vertices: [center],
            });
            vlines.push({
                x: X + this._config.nodeMargin,
                y0: graphBounds.y,
                y1: graphBounds.Y,
                vertices: [],
            });
        }

        // Add alley midpoint lines.
        // const visited: Set<Node> = new Set();
        // for(let u of this.storage.nodes()) {
        //     visited.add(u);
        //     for(let v of this.storage.nodes()) {
        //         if(visited.has(v)) continue;
        //         const ubounds = u.shape.bounds();
        //         const vbounds = v.shape.bounds();

        //         if(ubounds.X < vbounds.x) {
        //             // Vertical alley between u and v.
        //             if(vbounds.x - ubounds.X < 2 * this._config.nodeMargin) continue;
        //             vlines.push({
        //                 x: (ubounds.X + vbounds.x) / 2,
        //                 y0: graphBounds.y,
        //                 y1: graphBounds.Y,
        //                 vertices: [],
        //             });

        //         } else if(vbounds.X < ubounds.x) {
        //             // Vertical alley between v and u.
        //             if(ubounds.x - vbounds.X < 2 * this._config.nodeMargin) continue;
        //             vlines.push({
        //                 x: (vbounds.X + ubounds.x) / 2,
        //                 y0: graphBounds.y,
        //                 y1: graphBounds.Y,
        //                 vertices: [],
        //             });
        //         }

        //         if(ubounds.Y < vbounds.y) {
        //             // Horizontal alley between u and v.
        //             if(vbounds.y - ubounds.Y < 2 * this._config.nodeMargin) continue;
        //             hlines.push({
        //                 y: (ubounds.Y + vbounds.y) / 2,
        //                 x0: graphBounds.x,
        //                 x1: graphBounds.X,
        //                 vertices: [],
        //             });
        //         } else if(vbounds.Y < ubounds.y) {
        //             // Horizontal alley between v and u.
        //             if(ubounds.y - vbounds.Y < 2 * this._config.nodeMargin) continue;
        //             hlines.push({
        //                 y: (vbounds.Y + ubounds.y) / 2,
        //                 x0: graphBounds.x,
        //                 x1: graphBounds.X,
        //                 vertices: [],
        //             });
        //         }
        //     }
        // }

        // DONE?: Add midpoint lines -> 'center' ports.
        // TODO: Add port lines --> 'side'/'north'/... ports.
        // TODO: Cut off rays at obstacles / edge of graph.
       
        // Intersect lines and assign to nodes.
        const frontToBack = this.storage.hierarchicalSort().reverse();
        hlines.forEach((hline) => {
            vlines.forEach((vline) => {
                if(hline.y < vline.y0 || hline.y > vline.y1 ||
                   vline.x < hline.x0 || vline.x > hline.x1) return;
                const vertex: RouteVertex = { x: vline.x, y: hline.y, neighbors: {} };

                // Assign vertex to frontmost node that contains it.
                for(let u of frontToBack) {
                    const { x, X, y, Y } = u.shape.bounds();
                    if(x <= vertex.x && vertex.x <= X && y <= vertex.y && vertex.y <= Y) {
                        vertex.node = u;
                        break;
                    }
                }

                vertices.push(vertex);
                hline.vertices.push(vertex);
                vline.vertices.push(vertex);
            });
        });

        // Connect adjacent vertices.
        hlines.forEach((hline) => {
            hline.vertices.sort((a, b) => a.x - b.x);
            for(let i = 1; i < hline.vertices.length; i++) {
                const a = hline.vertices[i-1], b = hline.vertices[i];
                a.neighbors.east = b;
                b.neighbors.west = a;
            }
        });
        vlines.forEach((vline) => {
            vline.vertices.sort((a, b) => a.y - b.y);
            for(let i = 1; i < vline.vertices.length; i++) {
                const a = vline.vertices[i-1], b = vline.vertices[i];
                a.neighbors.south = b;
                b.neighbors.north = a;
            }
        });

        return vertices;
    }

    protected _getOptimalRoutes(graph: RouteVertex[]): Map<Edge, RouteVertex[]> {
        console.log("Get optimal routes", graph);
        const routes: Map<Edge, RouteVertex[]> = new Map();
        this.storage.edges().forEach((edge) => {
            // Routes may only pass through direct ancestors of the source/target.
            const traversableNodes: Set<Node> = new Set([
                edge.source.node,
                edge.target.node,
                ...this.storage.ancestors([edge.source.node, edge.target.node]),
            ]);
            function isTraversable(vertex: RouteVertex) {
                return vertex.node === undefined || traversableNodes.has(vertex.node)
            }
            const traversableVertices = graph.filter(isTraversable);
            const traversableVerticesIdx = new Map(traversableVertices.map((vertex, idx) => [vertex,idx]));

            // Perform A* search for optimal routes.
            // TODO: Change start/end find methodology.
            const start = traversableVertices.find((vertex) => vertex.node === edge.source.node);
            const end = traversableVertices.find((vertex) => vertex.node === edge.target.node);
            if(start === undefined || end === undefined) throw new Error("Vertex not found");

            const cache = new Map<string, RoutePartial>();
            const frontier = new PriorityQueue<string>((a, b) => cache.get(a)!.cost < cache.get(b)!.cost);
            Object.entries(start.neighbors).forEach(([dir, _]) => {
                const startKey = `${traversableVerticesIdx.get(start)!}-${dir}`;
                cache.set(startKey, {
                    vertex: start,
                    direction: dir as CardinalDirection,
                    length: 0,
                    bends: 0,
                    cost: costFn(lengthHeuristic(start, end), bendsHeuristic(start, end)),
                    backlink: undefined,
                });
                frontier.add(startKey);
            })
            while(!frontier.isEmpty()) {
                const currKey = frontier.poll();
                if(currKey === undefined) break;
                const { vertex, direction, length, bends } = cache.get(currKey)!;
                if(vertex === end) {
                    // Reconstruct path for the edge.
                    let ptr: string | undefined = currKey;
                    const route: RouteVertex[] = [];
                    while(ptr !== undefined) {
                        const { vertex, backlink } = cache.get(ptr)! as RoutePartial;
                        route.push(vertex);
                        ptr = backlink;
                    }
                    routes.set(edge, route);
                    return;
                }
                Object.entries(vertex.neighbors).forEach(([dir, neighbor]) => {
                    if(dir === directionReverse[direction]) return;
                    if(neighbor === undefined || !isTraversable(neighbor)) return;
                    const neighborKey = `${traversableVerticesIdx.get(neighbor)!}-${dir}`;
                    const neighborLength = manhattanDistance(vertex, neighbor);
                    const neighborBends = dir === direction ? 0 : 1;
                    const neighborCost = costFn(
                        length + neighborLength + lengthHeuristic(neighbor, end),
                        bends + neighborBends + bendsHeuristic(neighbor, end),
                    );
                    const existing = cache.get(neighborKey);
                    if(!existing || existing.cost > neighborCost) {
                        cache.set(neighborKey, {
                            vertex: neighbor,
                            direction: dir as CardinalDirection,
                            length: length + neighborLength,
                            bends: bends + neighborBends,
                            cost: neighborCost,
                            backlink: currKey,
                        });
                        frontier.add(neighborKey);
                    }
                })
            }
            console.warn(`No route found for edge: ${edge.id}`);
        });
        return routes;
    }

    protected _getNudgedRoutes() {

    }
}