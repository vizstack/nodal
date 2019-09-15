import { Vector, Gradient } from '../optim';
import { mapValues } from 'lodash';
import seedrandom from 'seedrandom';

/** Unique string identifier among all `Node`s in a layout. */
export type NodeId = string & { readonly brand?: unique symbol };

/** Unique string identifier among all `Edge`s in a layout. */
export type EdgeId = string & { readonly brand?: unique symbol };

/**
 * A `Node` is a visual representation of an entity in a graph, with a unique 'id' string.
 *
 * It is defined by a 'center' point and boundary 'shape'; if 'fixed', the 'center' point will not
 * move during the layout process.
 *
 * It may have 'children' which are contained within it (i.e. it may be a compound node). If so,
 * its actual 'shape' dimensions may be enlarged relative to its preferred dimensions.
 *
 * Its 'ports' are named points on the 'shape' boundary that an `Edge` may connect to. Optionally,
 * a port can be constrained to a particular 'location' on the 'shape' and/or a particular 'order'
 * relative to the other ports at its 'location'.
 */
export type Node = {
    id: NodeId;
    center: Vector;
    shape: { width: number, height: number };
    fixed: boolean;
    children: Node[];
    ports: Record<
        string,
        {
            location?: 'north' | 'south' | 'east' | 'west';
            order?: number;
            point: Vector;
        }
    >;
    meta?: Record<string, any>;
};

/**
 * A lightweight specification that is transformed into a `Node`.
 * 
 * It is mostly for convenience to use with `fromSchema`, doing things like:
 * 
 * - populating full references to children `Node` objects
 * - initializing `Vector` values randomly to promote initial separation
 * - error checking IDs to ensure existence and uniqueness
 */
export type NodeSchema = {
    id: NodeId;
    center?: { x: number, y: number };
    shape?: { width: number, height: number },
    fixed?: boolean,
    children?: NodeId[];
    ports?: Record<
        string,
        {
            location?: 'north' | 'south' | 'east' | 'west';
            order?: number;  // TODO: Update type to reflect order's dependency on location.
            point?: { x: number, y: number };
        }
    >;
    meta?: Record<string, any>;
};

/**
 * An `Edge` is a visual representation of a relation in a graph, with a unique 'id' string.
 *
 * It is defined by 'source' and 'target' `Node`s that form the endpoints. Both directed and 
 * undirected edges may be specified in this way; any special properties based on directionality
 * are imposed elsewhere, e.g. through constraints acting in only one direction.
 *
 * Optionally, 'port' names can describe more specific endpoints on the endpoint `Node`s. If
 * unspecified, an endpoint will default to an arbitrarly placed exclusive port on the `Node`.
 */
export type Edge = {
    id: EdgeId;
    source: { id: NodeId, port: string, node: Node, point: Vector };
    target: { id: NodeId, port: string, node: Node, point: Vector };
    path: Vector[];
    meta?: Record<string, any>;
};

/**
 * A lightweight specification that is transformed into a `Edge`.
 * 
 * It is mostly for convenience to use with `fromSchema`, doing things like:
 * 
 * - populating full references to endpoint `Node` objects
 * - creating a unique port on each endpoint `Node` if none is specified
 * - error checking IDs to ensure existence and uniqueness
 */
export type EdgeSchema = {
    id: EdgeId;
    source: { id: NodeId, port?: string };
    target: { id: NodeId, port?: string };
    path?: { x: number, y: number }[];
    meta?: Record<string, any>;
};

const kPortOffset = 0.2;

/**
 * Transform lightweight `NodeSchema` and `EdgeSchema` data structures into `Node` and `Edge`
 * objects. See documentation for `NodeSchema` and `EdgeSchema` for more details.
 * @param nodeSchemas 
 * @param edgeSchemas 
 */
export function fromSchema(nodeSchemas: NodeSchema[], edgeSchemas: EdgeSchema[]): [Node[], Edge[]] {
    // Build nodes, initializing points and dimensions if needed.
    const nodeIdToIdx: Map<NodeId, number> = new Map();
    const nodes: Node[] = nodeSchemas.map(({ id, center, shape, fixed, children, ports, meta }, idx) => {
        if (!id) throw Error(`Invalid NodeId: ${id}`);
        if (nodeIdToIdx.has(id)) throw Error(`Duplicate NodeId: ${id}`);
        nodeIdToIdx.set(id, idx);
        
        // Generate pseudprandom point for center based on NodeId.
        const rand = seedrandom(id);
        const centerpt = center ? new Vector(center.x, center.y) : new Vector(rand(), rand());

        return {
            id,
            center: centerpt,
            shape: shape || { width: 0, height: 0 }, // TODO: Generalize.
            fixed: fixed || false,
            children: (children as any) || [],
            ports: ports ? mapValues(ports, ({ location, order, point }) => ({
                location,
                order,
                point: point ? new Vector(point.x, point.y) : new Vector(centerpt.x + kPortOffset*rand(), centerpt.y + kPortOffset*rand()),
            })) : {},
            meta,
        };
    });
    nodes.forEach((node) => node.children = node.children.map((id: any) => {
        const childIdx = nodeIdToIdx.get(id);
        if (childIdx === undefined) throw Error(`Invalid child NodeId: ${id}, parent ${node.id}`);
        return nodes[childIdx];
    }))

    // Get the endpoint on the source/target node, or create a new one exclusively for the edge.
    function processEndpoint(edgeId: EdgeId, type: 'source' | 'target', nodeId: NodeId, port?: string) {
        const idx = nodeIdToIdx.get(nodeId);
        if (idx === undefined) throw Error(`Invalid ${type} NodeId: ${nodeId}, edge ${edgeId}`);
        const node = nodes[idx];
        let point: Vector;
        if (port) {
            if(port in node.ports) {
                point = node.ports[port].point;
            } else {
                throw Error(`Invalid ${type} port name: ${port}, ${type} ${nodeId}, edge ${edgeId}`);
            }
        } else {
            const rand = seedrandom(`${edgeId}-${type}`);
            port = `_${edgeId}`;
            point = new Vector(node.center.x + kPortOffset*rand(), node.center.y + kPortOffset*rand());
            node.ports[port] = { point };
        }
        return { id: nodeId, port, node, point };
    }
    
    // Build edges, establishing references to endpoints.
    const edgeIdToIdx: Set<EdgeId> = new Set();
    const edges: Edge[] = edgeSchemas.map(({ id, source, target, path, meta }) => {
        if (!id) throw Error(`Invalid EdgeId: ${id}`);
        if (edgeIdToIdx.has(id)) throw Error(`Duplicate EdgeId: ${id}`);
        edgeIdToIdx.add(id);
        const s = processEndpoint(id, 'source', source.id, source.port);
        const t = processEndpoint(id, 'target', target.id, target.port);
        return {
            id,
            source: s,
            target: t,
            path: path ? path.map(({ x, y }) => new Vector(x, y)) : [s.point, t.point],
            meta,
        };
    });

    return [nodes, edges];
}

// TODO: Allow taking any Iterator<Node>, Iterator<Edge>.
export function toSchema(nodes: Node[], edges: Edge[]): [NodeSchema[], EdgeSchema[]] {
    const nodeSchema = nodes.map((node) => ({
        id: node.id,
        center: { x: node.center.x, y: node.center.y },
        shape: node.shape,
        fixed: node.fixed,
        children: node.children.map((child) => child.id),
        ports: Object.fromEntries(
            Object.entries(node.ports).map(([name, { location, order, point }]) => [name, { location, order, point: { x: point.x, y: point.y }}]),
        ),
        meta: node.meta,
    }));
    const edgeSchema = edges.map((edge) => ({
        id: edge.id,
        source: { id: edge.source.id, port: edge.source.port },
        target: { id: edge.target.id, port: edge.target.port },
        path: edge.path.map((point) => ({ x: point.x, y: point.y })),
        meta: edge.meta,
    }));

    return [nodeSchema, edgeSchema]
}