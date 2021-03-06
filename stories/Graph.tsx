import * as React from 'react';
import { Node, Edge, Storage, StagedLayout } from '../src/graph';

// @ts-ignore
import { roundCorners } from 'svg-path-round-corners/dist/es6/index';
// @ts-ignore
import { parse } from 'svg-path-round-corners/dist/es6/parse';
// @ts-ignore
import { serialize } from 'svg-path-round-corners/dist/es6/serialize';

type GraphProps<S extends Storage> = {
    /** The layout to run. */
    layout: StagedLayout<S>;

    /** Whether to run animation during layout process. */
    animated?: boolean;

    /** Whether to allow mouse interaction.  */
    interactive?: boolean;

    /** Function to specify color, as a string or an index into the default color palette. */
    nodeColor?: (n: Node) => string | number;
    edgeColor?: (e: Edge) => string | number;

    /** Minimum graph size. */
    size?: [number, number];

    /** Postprocessing function run each time layout completes. */
    postprocess?: (storage: S) => void;
};

type GraphState = {
    nodes: Iterable<Node>;
    edges: Iterable<Edge>;
    bounds: ReturnType<Storage['bounds']>;
    drag?: {
        node: Node;
        origin: { x: number; y: number };
        center: { x: number; y: number };
        fixed: boolean;
        bounds: ReturnType<Storage['bounds']>;
    };
};

const kEdgeCurveRadius = 8;
const kPortRadius = 2;
const kAnimationTick = 0;
const kLayoutSteps = 250;

export class Graph<S extends Storage> extends React.Component<GraphProps<S>, GraphState> {
    static defaultProps: Partial<GraphProps<Storage>> = {
        animated: false,
        interactive: false,
        size: [500, 500],
    };

    constructor(props: GraphProps<S>) {
        super(props);
        const { layout, animated, postprocess } = this.props;
        this.state = {
            nodes: layout.storage.nodes(),
            edges: layout.storage.edges(),
            bounds: layout.storage.bounds(),
            drag: undefined,
        };
        if (animated) {
            // Animated graphs should repeatedly stop after after every step in order to give React
            // time to rerender. This will continue until all iterations are done.
            layout.onEnd = (storage, step) => {
                if (postprocess) postprocess(storage);
                this.forceUpdate();

                // Remove call to `start` after initial layout is finished.
                layout.onStep = (storage) => {
                    this.setState({
                        nodes: storage.nodes(),
                        edges: storage.edges(),
                        bounds: storage.bounds(),
                    });
                    return false;
                };
            };
            layout.onStep = (storage) => {
                this.setState({
                    nodes: storage.nodes(),
                    edges: storage.edges(),
                    bounds: storage.bounds(),
                });
                setTimeout(() => layout.start(), kAnimationTick);
                return false;
            };
        } else {
            // Unanimated graphs should only update state after the initial layout ends, and on
            // every step afterwards, when the user manipulates the graph.
            layout.onEnd = (storage) => {
                if (postprocess) postprocess(storage);
                this.setState({
                    nodes: storage.nodes(),
                    edges: storage.edges(),
                    bounds: storage.bounds(),
                });
                layout.onStep = (storage) => {
                    this.setState({
                        nodes: storage.nodes(),
                        edges: storage.edges(),
                        bounds: storage.bounds(),
                    });
                    return true;
                };
            };
        }
    }
    componentDidMount() {
        const { layout } = this.props;
        setTimeout(() => layout.start(), 0);
    }

    onMouseDown = (node: Node, x: number, y: number) => {
        if (!this.props.interactive) return;
        if (this.state.drag !== undefined) this.onMouseUp();
        const fixed = node.fixed;
        this.setState((state) => ({
            drag: {
                node: node,
                origin: { x, y },
                center: { x: node.center.x, y: node.center.y },
                fixed: fixed,
                bounds: state.bounds,
            },
        }));
        node.fixed = true;
        this.doLayout(kLayoutSteps);
    };

    onMouseUp = () => {
        if (!this.props.interactive) return;
        if (this.state.drag !== undefined) {
            const { layout } = this.props;
            const { node, fixed } = this.state.drag;
            node.fixed = fixed;
            this.setState({ drag: undefined });
            this.setState({
                nodes: layout.storage.nodes(),
                edges: layout.storage.edges(),
                bounds: layout.storage.bounds(),
            });
        }
    };

    onMouseMove = (x: number, y: number) => {
        if (!this.props.interactive) return;
        if (this.state.drag !== undefined) {
            const { node, origin, center } = this.state.drag;
            node.center.set(x - origin.x + center.x, y - origin.y + center.y);
            this.forceUpdate();
        }
    };

    doLayout(steps: number) {
        const { layout, postprocess } = this.props;
        if (steps <= 0) {
            if (postprocess) postprocess(layout.storage);
            this.forceUpdate();
            return;
        }
        setTimeout(() => {
            layout.step();
            this.forceUpdate();
            if (this.state.drag === undefined) {
                this.doLayout(steps - 1);
            } else {
                this.doLayout(kLayoutSteps);
            }
        }, kAnimationTick);
    }

    render() {
        const { nodes = [], edges = [], drag } = this.state;
        const bounds = drag ? drag.bounds : this.state.bounds;
        const { size = [0, 0] } = this.props;

        const nodeColor = (n: Node) => {
            if (!this.props.nodeColor) return Palette[0]; // Blue
            const value = this.props.nodeColor(n);
            return typeof value === 'number' ? Palette[value % Palette.length] : value;
        };

        const edgeColor = (e: Edge) => {
            if (!this.props.edgeColor) return Palette[13]; // Gray
            const value = this.props.edgeColor(e);
            return typeof value === 'number' ? Palette[value % Palette.length] : value;
        };

        const compoundNodeComponents = [];
        for (let node of nodes) {
            if (node.children.length > 0) {
                const shapeSchema = node.shape.toSchema();
                let shape;
                switch (shapeSchema.type) {
                    case 'rectangle':
                        const { width, height } = shapeSchema;
                        shape = (
                            <rect
                                x={node.shape.bounds().x}
                                y={node.shape.bounds().y}
                                width={width}
                                height={height}
                                fill={nodeColor(node)}
                                stroke={Color.white}
                                strokeWidth={1.5}
                                rx={4}
                                opacity={0.3}
                            />
                        );
                        break;
                    case 'circle':
                        const { radius } = shapeSchema;
                        shape = (
                            <circle
                                cx={node.shape.center.x}
                                cy={node.shape.center.y}
                                r={radius}
                                fill={nodeColor(node)}
                                stroke={Color.white}
                                strokeWidth={1.5}
                                rx={4}
                                opacity={0.3}
                            />
                        );
                        break;
                }
                compoundNodeComponents.push(
                    <g key={node.id} id={node.id}>
                        {shape}
                        <text
                            x={node.center.x}
                            y={node.center.y}
                            textAnchor='middle'
                            dominantBaseline='middle'
                            style={{
                                fontFamily: '"Helvetica Neue", sans-serif',
                                fontWeight: 'bold',
                                fontSize: '10',
                                fill: nodeColor(node),
                                opacity: 1,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}
                        >
                            {node.id}
                        </text>
                        {Object.entries(node.ports).map(([name, port]) =>
                            name.startsWith('_') ? null : (
                                <circle
                                    cx={port.point.x}
                                    cy={port.point.y}
                                    r={kPortRadius}
                                    fill={nodeColor(node)}
                                    stroke={Color.white}
                                    strokeWidth={0.75}
                                />
                            ),
                        )}
                    </g>,
                );
            }
        }

        const simpleNodeComponents = [];
        for (let node of nodes) {
            if (node.children.length == 0) {
                const shapeSchema = node.shape.toSchema();
                let shape;
                switch (shapeSchema.type) {
                    case 'rectangle':
                        const { width, height } = shapeSchema;
                        shape = (
                            <rect
                                x={node.shape.bounds().x}
                                y={node.shape.bounds().y}
                                width={width}
                                height={height}
                                fill={nodeColor(node)}
                                stroke={Color.white}
                                strokeWidth={1}
                                rx={4}
                                onMouseDown={(e) => this.onMouseDown(node, e.clientX, e.clientY)}
                            />
                        );
                        break;
                    case 'circle':
                        const { radius } = shapeSchema;
                        shape = (
                            <circle
                                cx={node.shape.center.x}
                                cy={node.shape.center.y}
                                r={radius}
                                fill={nodeColor(node)}
                                stroke={Color.white}
                                strokeWidth={1}
                                onMouseDown={(e) => this.onMouseDown(node, e.clientX, e.clientY)}
                            />
                        );
                        break;
                }
                simpleNodeComponents.push(
                    <g key={node.id} id={node.id}>
                        {shape}
                        <text
                            x={node.center.x}
                            y={node.center.y}
                            textAnchor='middle'
                            dominantBaseline='middle'
                            style={{
                                fontFamily: '"Helvetica Neue", sans-serif',
                                fontSize: '10',
                                fill: Color.white,
                                opacity: 0.75,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}
                        >
                            {node.id.startsWith('n') ? node.id.substring(1) : node.id}
                        </text>
                        {Object.entries(node.ports).map(([name, port]) =>
                            name.startsWith('_') ? null : (
                                <circle
                                    cx={port.point.x}
                                    cy={port.point.y}
                                    r={kPortRadius}
                                    fill={nodeColor(node)}
                                    stroke={Color.white}
                                    strokeWidth={0.75}
                                />
                            ),
                        )}
                    </g>,
                );
            }
        }

        const edgeComponents = [];
        for (let edge of edges) {
            // const start = edge.path[0];
            // const end = edge.path[edge.path.length - 1];
            // if (edge.source.node.ports[edge.source.port].location === 'center') {
            //     start.copy(edge.source.node.shape.boundary((new Vector()).subVectors(end, start)));
            // }
            // if (edge.target.node.ports[edge.target.port].location === 'center') {
            //     end.copy(edge.target.node.shape.boundary((new Vector()).subVectors(start, end)));
            // }
            let path = 'M ' + edge.path.map(({ x, y }) => `${x} ${y}`).join(' L ');
            if (path) {
                path = serialize(roundCorners(parse(path), kEdgeCurveRadius));
            }

            edgeComponents.push(
                <g key={edge.id} id={edge.id}>
                    <path
                        d={path}
                        style={{
                            fill: 'none',
                            stroke: edgeColor(edge),
                            strokeWidth: 1.5,
                            opacity: 0.75,
                        }}
                    />
                </g>,
            );
        }

        return (
            <svg
                viewBox={
                    bounds
                        ? `${bounds.x} ${bounds.y} ${Math.max(bounds.width, size[0])} ${Math.max(
                              bounds.height,
                              size[1],
                          )}`
                        : undefined
                }
                width={bounds ? `${Math.max(bounds.width, size[0])}` : '100%'}
                height={bounds ? `${Math.max(bounds.height, size[1])}` : '100%'}
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

const Palette = [
    '#4E79A7',
    '#A0CBE8',
    '#F28E2B',
    '#FFBE7D',
    '#59A14F',
    '#8CD17D',
    '#B6992D',
    '#F1CE63',
    '#499894',
    '#86BCB6',
    '#E15759',
    '#FF9D9A',
    '#79706E',
    '#BAB0AC',
    '#D37295',
    '#FABFD2',
    '#B07AA1',
    '#D4A6C8',
    '#9D7660',
    '#D7B5A6',
];
