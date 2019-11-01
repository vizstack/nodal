import { Node, Edge, NodeId, EdgeId } from './elements';
import { Storage } from './storage';
import { Vector } from '../optim';

/**
 * An `OrthogonalRouter` converts edge paths from straight segments of any orientation into
 * orthogonal routes of only horizontal/vertical segments.
 */
export class OrthogonalRouter {
    constructor(public storage: Storage) {}

    /**
     * Runs the routing procedure on the edges, making in-place changes.
     */
    public route(): void {
        // This code implements the algorithms described in "Orthogonal Connector Routing"
        // (Wybrow et al, 2009). It uses a 3-phase approach through which:
        // (1) an orthogonal visibility graph is constructed by intersecting "interesting"
        //     horizontal/vertical line segments
        // (2) the optimal routes are found using A* search
        // (3) the route appearance is improved by ordering and nudging them apart

        // // TODO: Temp.
        // for(let e of this.storage.edges()) {
        //     e.path = [e.path[0], new Vector(0, 0), e.path[e.path.length - 1]];
        // }
        
        // 1: Get interesting h/v rays.
        // 2: Cut off rays at obstacles / edge of graph.
        // 3: Intersect segments to make graph.
        // 4: Perform A* for initial routing.
        // 
    }
}