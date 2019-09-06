import * as React from 'react';
import { Node, Edge } from '../src/graph';

type GraphProps = {
    nodes?: Node[];
    edges?: Edge[];
};

export class Graph extends React.Component<GraphProps> {
    render() {
        const { nodes = [], edges = [] } = this.props;
        return (
            <svg>
                {nodes.map((node) => (
                    <g>
                        <rect
                            x={node.center.x}
                            y={node.center.y}
                            width={node.shape.width}
                            height={node.shape.height}
                            fill={Color.blue.base}
                            rx={4}
                        />
                    </g>
                ))}
            </svg>
        );
    }
}

const Color = {
    white: '#FFFFFF',
    black: '#000000',
    grey: { l2: '#F1F3F5', l1: '#E9ECEE', base: '#DEE2E6', d1: '#B8C4CF', d2: '#8895A7' },
    blue: { l2: '#EFF8FF', l1: '#AAD4F6', base: '#3183C8', d1: '#2368A2', d2: '#194971' },
    teal: { l2: '#E7FFFE', l1: '#A8EEEC', base: '#3CAEA3', d1: '#2A9187', d2: '#1B655E' },
    green: { l2: '#E3FCEC', l1: '#A8EEC1', base: '#38C172', d1: '#249D57', d2: '#187741' },
    yellow: { l2: '#FFFCF4', l1: '#FDF3D7', base: '#F4CA64', d1: '#CAA53D', d2: '#8C6D1F' },
    red: { l2: '#FCE8E8', l1: '#F4AAAA', base: '#DC3030', d1: '#B82020', d2: '#881B1B' },
};
