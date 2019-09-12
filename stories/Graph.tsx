import * as React from 'react';
import { Node, Edge, Storage, ForceConstraintLayout, NodeId } from '../src/graph';

type GraphProps = {
    storage: Storage;
    layout: ForceConstraintLayout;

    /** Whether to run animation during layout process. */
    animated?: boolean;

    /** Whether to allow mouse interaction.  */
    interactive?: boolean;
};

type GraphState = {
    nodes: Iterable<Node>;
    edges: Iterable<Edge>;
    bounds: ReturnType<Storage['bounds']>;
    drag?: {
        node: Node,
        origin: { x: number, y: number },
        center: { x: number, y: number },
        fixed: boolean,
        bounds: ReturnType<Storage['bounds']>;
    };
};

const kAnimationTick = 0;
const kLayoutSteps = 250;

export class Graph extends React.Component<GraphProps, GraphState> {
    static defaultProps: Partial<GraphProps> = {
        animated: false,
        interactive: false,
    };
    constructor(props: GraphProps) {
        super(props);
        const { layout, storage, animated} = this.props;
        this.state = {
            nodes: storage.nodes(),
            edges: storage.edges(),
            bounds: storage.bounds(),
            drag: undefined,
        };
        if(animated) layout.onStep((elems) => {
            this.setState({
                nodes: elems.nodes(),
                edges: elems.edges(),
                bounds: elems.bounds(),
            });
            setTimeout(() => layout.start(), kAnimationTick);
            return false;
        });
        layout.onEnd((elems) => {
            this.setState({
                nodes: elems.nodes(),
                edges: elems.edges(),
                bounds: elems.bounds(),
            });
        });
    }
    componentDidMount() {
        const { layout } = this.props;
        layout.start();
    }

    onMouseDown = (node: Node, x: number, y: number) => {
        if(!this.props.interactive) return;
        if(this.state.drag !== undefined) this.onMouseUp();
        this.setState((state) => ({ drag: {
            node: node,
            origin: { x, y },
            center: { x: node.center.x, y: node.center.y },
            fixed: node.fixed,
            bounds: state.bounds,
        } }));
        node.fixed = true;
        this.doLayout(kLayoutSteps);
    }

    onMouseUp = () => {
        if(!this.props.interactive) return;
        if(this.state.drag !== undefined) {
            const { storage } = this.props;
            const { node, fixed } = this.state.drag;
            node.fixed = fixed;
            this.setState({ drag: undefined });
            this.setState({
                nodes: storage.nodes(),
                edges: storage.edges(),
                bounds: storage.bounds(),
            });
        }
    }

    onMouseMove = (x: number, y: number) => {
        if(!this.props.interactive) return;
        if(this.state.drag !== undefined) {
            const { node, origin, center } = this.state.drag;
            node.center.set(x - origin.x + center.x, y - origin.y + center.y);
            this.forceUpdate();
        }
    }

    doLayout(steps: number) {
        if(steps <= 0) return;
        setTimeout(() => {
            this.props.layout.step();
            this.forceUpdate();
            this.doLayout(steps-1);
        }, 0);
    }

    render() {
        const { nodes = [], edges = [], drag } = this.state;
        const bounds = drag ? drag.bounds : this.state.bounds;
        const compoundNodeComponents = [];
        for(let node of nodes) {
            if(node.children.length > 0) {
                compoundNodeComponents.push(
                    <g key={node.id} id={node.id}>
                        <rect
                            x={node.center.x - node.shape.width / 2}
                            y={node.center.y - node.shape.height / 2}
                            width={node.shape.width}
                            height={node.shape.height}
                            fill={Color.blue.base}
                            stroke={Color.white}
                            strokeWidth={1.5}
                            rx={4}
                            opacity={0.3}
                        />
                        <text x={node.center.x} y={node.center.y} textAnchor="middle" dominantBaseline="middle"
                            style={{
                                fontFamily: '"Helvetica Neue", sans-serif',
                                fontSize: '10',
                                fill: Color.blue.l1,
                            }}>
                            {node.id.substring(1)}
                        </text>
                    </g>
                );
            }
        }

        const simpleNodeComponents = [];
        for(let node of nodes) {
            if(node.children.length == 0) {
                simpleNodeComponents.push(
                    <g key={node.id} id={node.id}>
                        <rect
                            x={node.center.x - node.shape.width / 2}
                            y={node.center.y - node.shape.height / 2}
                            width={node.shape.width}
                            height={node.shape.height}
                            fill={Color.blue.base}
                            stroke={Color.white}
                            strokeWidth={1.5}
                            rx={4}
                            onMouseDown={(e) => this.onMouseDown(node, e.clientX, e.clientY)}
                        />
                        <text x={node.center.x} y={node.center.y} textAnchor="middle" dominantBaseline="middle"
                            style={{
                                fontFamily: '"Helvetica Neue", sans-serif',
                                fontSize: '10',
                                fill: Color.blue.l1,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}>
                            {node.id.substring(1)}
                        </text>
                    </g>
                );
            }
        }

        const edgeComponents = [];
        for(let edge of edges) {
            edgeComponents.push(
                <g key={edge.id} id={edge.id}>
                    <path
                        d={'M ' + edge.path.map(({ x, y }) => `${x} ${y}`).join(' L ')}
                        style={{
                            fill: 'none',
                            stroke: Color.gray.d1,
                            strokeWidth: 3,
                            opacity: 0.8,
                        }}
                    />
                </g>
            )
        }
        
        return (
            <svg
                viewBox={bounds ? `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}` : undefined}
                width={bounds ? `${bounds.width}` : '100%'}
                height={bounds ? `${bounds.height}` : '100%'}
                onMouseMove={(e) => this.onMouseMove(e.clientX, e.clientY)}
                onMouseUp={(e) => this.onMouseUp()}
            >
                {edgeComponents}
                {compoundNodeComponents}
                {simpleNodeComponents}
            </svg>
        );
    }
}

const Color = {
    white: '#FFFFFF',
    black: '#000000',
    gray: { l2: '#F1F3F5', l1: '#E9ECEE', base: '#DEE2E6', d1: '#B8C4CF', d2: '#8895A7' },
    blue: { l2: '#EFF8FF', l1: '#AAD4F6', base: '#3183C8', d1: '#2368A2', d2: '#194971' },
    teal: { l2: '#E7FFFE', l1: '#A8EEEC', base: '#3CAEA3', d1: '#2A9187', d2: '#1B655E' },
    green: { l2: '#E3FCEC', l1: '#A8EEC1', base: '#38C172', d1: '#249D57', d2: '#187741' },
    yellow: { l2: '#FFFCF4', l1: '#FDF3D7', base: '#F4CA64', d1: '#CAA53D', d2: '#8C6D1F' },
    red: { l2: '#FCE8E8', l1: '#F4AAAA', base: '#DC3030', d1: '#B82020', d2: '#881B1B' },
};
