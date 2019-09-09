import * as React from 'react';
import { Node, Edge } from '../src/graph';

type GraphProps = {
    nodes?: Iterable<Node>;
    edges?: Iterable<Edge>;
    bounds?: { x: number, X: number, y: number, Y: number, width: number, height: number };
};

export class Graph extends React.Component<GraphProps> {
    render() {
        const { nodes = [], edges = [], bounds } = this.props;
        const groupComponents = [];
        for(let node of nodes) {
            if(node.children.length > 0) {
                groupComponents.push(
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

        const leafComponents = [];
        for(let node of nodes) {
            if(node.children.length == 0) {
                leafComponents.push(
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
            >
                {edgeComponents}
                {groupComponents}
                {leafComponents}
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
