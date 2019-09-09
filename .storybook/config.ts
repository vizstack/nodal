import { configure, addDecorator } from '@storybook/react';
import { withInfo } from '@storybook/addon-info';
import { withKnobs } from '@storybook/addon-knobs';

// Install addons.
addDecorator(withInfo); 
addDecorator(withKnobs);

// Automatically import all files ending in *.stories.tsx
const req = require.context('../stories', true, /\.stories\.tsx$/);
function loadStories() {
  req.keys().forEach(req);
}
configure(loadStories, module);