import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { linkTo } from '@storybook/addon-links';

import { Node, Edge, Point, BasicStorage, ForceConstraintLayout } from '../src';
import { Graph } from './Graph';

storiesOf('Graphs', module).add('basic', () => (
    <Graph nodes={[
        new Node('foo', { shape: { width: 50, height: 50 } }),
        new Node('bar', { shape: { width: 50, height: 100 }, center: new Point(50, 50) }),
    ]} />
));
