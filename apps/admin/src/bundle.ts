/**
 * Prebuild AdminJS frontend assets for production.
 * Run during Docker build stage to avoid runtime bundling.
 *
 * Usage: pnpm run bundle
 */
import { bundle } from '@adminjs/bundler';
import componentLoader from './component-loader.js';

(async () => {
  console.log('📦 Bundling AdminJS assets...');

  const files = await bundle({
    componentLoader,
    destinationDir: 'public', // relative to CWD
  });

  console.log('✅ AdminJS assets bundled successfully:');
  console.log(`   Generated ${files.length} files`);
})();
