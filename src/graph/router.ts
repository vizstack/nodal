import { Node, Edge, NodeId, EdgeId } from './elements';
import { StructuredStorage } from './storage';
import { Vector } from '../optim';
import PriorityQueue from 'fastpriorityqueue';

type RouteVertex = {
    /** Horizontal location of vertex. */
    x: number,
    
    /** Vertical location of vertex. */
    y: number,

    /** Immediate neighbor vertices on grid. */
    neighbors: {
        north?: RouteVertex,
        south?: RouteVertex,
        east?: RouteVertex,
        west?: RouteVertex,
    },

    /** Frontmost node that contains this vertex, if any. */
    node?: Node,
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
function boundsContain(
    bounds: { x: number, y: number, X: number, Y: number },
    x: number,
    y: number,
){
    return bounds.x <= x && x <= bounds.X && bounds.y <= y && y <= bounds.Y;
}
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
        //     horizontal/vertical line segments
        // (2) the optimal routes are found using A* search
        // (3) any overlapping routes are ordered and nudged apart
        //
        // Design decisions:
        // (1) Ports at 'center' are treated specially because the corresponding lines need
        //     to emanate in both directions, along both vertical and horizontal axes. Other port 
        //     lines only emanate in a single direction along the axis perpendicular to the side.
        // (2) Edges with endpoints at ports on 'boundary' keep the same port, rather than be
        //     retargeted to a more convenient side. This is because: (a) multiple edges may target
        //     the same port, so routing cannot proceed independently, (b) ports can't be moved
        //     as that would break their constraint on the shape boundary.

        if(Array.from(this.storage.nodes()).length === 0) return;

        // =========================================================================================
        // Phase 1: Get visibility graph.

        console.log("Phase 1: Get visibility graph.");
        
        const vertices: RouteVertex[] = [];
        const portToVertex: Map<Vector, RouteVertex> = new Map();
        const hlines: HorizontalSegment[] = [];
        const vlines: VerticalSegment[] = [];

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

        for(let u of this.storage.nodes()) {
            // Add node bound lines.
            const { x, X, y, Y } = u.shape.bounds();
            hlines.push({
                y: y - this._config.nodeMargin,
                x0: graphBounds.x,
                x1: graphBounds.X,
                vertices: [],
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
                x: X + this._config.nodeMargin,
                y0: graphBounds.y,
                y1: graphBounds.Y,
                vertices: [],
            });

            // Add node midpoint lines.
            const cx = u.center.x, cy = u.center.y;
            const center: RouteVertex = { x: cx, y: cy, neighbors: {}, node: u };
            vertices.push(center);
            hlines.push({
                y: cy,
                x0: graphBounds.x,
                x1: graphBounds.X,
                vertices: [center],
            });
            vlines.push({
                x: cx,
                y0: graphBounds.y,
                y1: graphBounds.Y,
                vertices: [center],
            });
            portToVertex.set(u.center, center);

            // Add port lines.
            Object.values(u.ports).forEach(({ point, location }) => {
                if(location === "center") {
                    // For all 'center' ports, add to existing center vertex.
                    portToVertex.set(point, center);
                } else {
                    // For all other ports, create new vertex and line emanating outwards.
                    // TODO: Make emanate outwards.
                    const v: RouteVertex = { x: point.x, y: point.y, neighbors: {}, node: u };
                    vertices.push(v);
                    hlines.push({
                        y: point.y,
                        x0: graphBounds.x,
                        x1: graphBounds.X,
                        vertices: [v],
                    });
                    vlines.push({
                        x: point.x,
                        y0: graphBounds.y,
                        y1: graphBounds.Y,
                        vertices: [v],
                    });
                    portToVertex.set(point, v);
                }
            });
        }

        // // Add alley midpoint lines.
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
        // TODO: Prioritize alleys.
        // TODO: Alley computation is too expensive rn.
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
                    if(boundsContain(u.shape.bounds(), vertex.x, vertex.y)) {
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

        console.log(vertices, portToVertex);

        // =========================================================================================
        // Phase 2: Get optimal routes.

        console.log("Phase 2: Get optimal routes.");

        const routes: Map<Edge, RouteVertex[]> = new Map();

        this.storage.edges().forEach((edge) => {
            // Routes may only pass through vertices that are attached to (1) direct ancestors of
            // the source/target node, or (2) nodes that contain the source/target point.
            const traversableNodes: Set<Node> = new Set([
                edge.source.node,
                edge.target.node,
                ...this.storage.ancestors([edge.source.node, edge.target.node]),
                ...this.storage.nodes().filter((n) => {
                    const nbounds = n.shape.bounds();
                    return (
                        boundsContain(nbounds, edge.source.point.x, edge.source.point.y) ||
                        boundsContain(nbounds, edge.target.point.x, edge.target.point.y)
                    );
                })
            ]);
            function isVertexTraversable(vertex: RouteVertex) {
                return vertex.node === undefined || traversableNodes.has(vertex.node)
            }
            const traversableVertices = vertices.filter(isVertexTraversable);
            const traversableVerticesIdx = new Map(traversableVertices.map((vertex, idx) => [vertex,idx]));

            // Perform A* search for optimal routes.
            const start = portToVertex.get(edge.source.point);
            const end = portToVertex.get(edge.target.point);
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
                    if(neighbor === undefined || !isVertexTraversable(neighbor)) return;
                    const neighborKey = `${traversableVerticesIdx.get(neighbor)!}-${dir}`;
                    const neighborLength = manhattanDistance(vertex, neighbor);
                    const neighborBends = dir === direction ? 0 : 1;
                    const neighborCost = costFn(
                        length + neighborLength + lengthHeuristic(neighbor, end),
                        bends + neighborBends + bendsHeuristic(neighbor, end),
                    );
                    const existing = cache.get(neighborKey);
                    if(!existing || existing.cost > neighborCost) {
                        // For every (vertex, direction) tuple, ensure only the one with the lowest
                        // cost stays in frontier open set.
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
            console.warn(`No route found for edge: ${edge.id}`, );
        });

        console.log(routes);

        // =========================================================================================
        // Phase 3: Get nudged routes.

        // TODO

        // =========================================================================================
        // Phase 4: Convert routes to edge paths.
        
        this.storage.edges().forEach((edge) => {
            const route = routes.get(edge);
            if(!route) return;
            edge.path = route.map((v) => {
                // Keep original port endpoints and create new points for intermediate vertices.
                if (portToVertex.get(edge.source.point) === v) {
                    return edge.source.point;
                } else if (portToVertex.get(edge.target.point) === v) {
                    return edge.target.point;
                } else {
                    return new Vector(v.x, v.y);
                }
            });
        })
    }
}