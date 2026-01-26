import { ComponentLoader } from 'adminjs';

// ComponentLoader is required even without custom components
// It's needed for @adminjs/bundler to work
const componentLoader = new ComponentLoader();

export default componentLoader;
