import { Point, Gradient } from '../optim';

/** Unique string identifier among all `Node`s in a layout. */
export type NodeId = string & { readonly brand?: unique symbol };

/** Unique string identifier among all `Edge`s in a layout. */
export type EdgeId = string & { readonly brand?: unique symbol };

/**
 * A `Node` is a visual representation of an entity in a graph.
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
export class Node {
    public id: NodeId;
    public center: Point;
    public shape: {
        width: number;
        height: number;
    };
    public fixed: boolean;
    public children: NodeId[];
    public ports: Record<
        string,
        {
            location?: 'north' | 'south' | 'east' | 'west';
            order?: number;
            point: Point;
        }
    >;

    constructor(
        id: NodeId,
        {
            center = new Point(),
            shape = { width: 0, height: 0 },
            fixed = false,
            children = [],
            ports = {},
        },
    ) {
        this.id = id;
        this.center = center;
        this.shape = shape;
        this.fixed = fixed;
        this.children = children;
        this.ports = ports;
    }
}

/**
 * An `Edge` is a visual representation of a relation in a graph.
 *
 * It is defined by 'source' and 'target' IDs of the `Node`s that form the endpoints. Both directed
 * and undirected edges may be specified in this way; any special properties based on directionality
 * are imposed elsewhere, e.g. through constraints acting in only one direction.
 *
 * Optionally, 'sourcePort' and 'targetPort' names can specify which ports to serve as endpoints on
 * the 'source' and 'target' nodes, respectively. If unspecified, an endpoint will default to an
 * arbitrarly placed exclusive port on the `Node` 'shape'.
 */
export class Edge {
    public id: EdgeId;
    public source: NodeId;
    public target: NodeId;
    public sourcePort?: string;
    public targetPort?: string;

    constructor(
        id: EdgeId,
        source: NodeId,
        target: NodeId,
        { sourcePort = undefined, targetPort = undefined },
    ) {
        this.id = id;
        this.source = source;
        this.target = target;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
    }
}

// TODO: Node getPort creates point if not exists, so each edge can live on own port.
