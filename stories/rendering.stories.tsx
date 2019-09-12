import React from 'react';
import { storiesOf } from '@storybook/react';
import { text, boolean, number } from '@storybook/addon-knobs';
import { Graph } from './Graph';
import {
    fromSchema,
    ForceConstraintLayout,
    BasicStorage,
} from '../src';


storiesOf('rendering', module)
    .add('simple nodes/edges', () => {
        const [nodes, edges] = fromSchema([
            { id: 'n0', shape: { width: 20, height: 20 }, center: { x: 10, y: 30 } },
            { id: 'n1', shape: { width: 20, height: 40 }, center: { x: 60, y: 30 } },
        ], [
            { id: 'e0->1', source: { id: 'n0' }, target: { id: 'n1' } },
        ]);
        const storage = new BasicStorage(nodes, edges);
        const layout = new ForceConstraintLayout(storage, function*(){}, function*(){});
        return (
            <Graph storage={storage} layout={layout}/>
        );
    });
