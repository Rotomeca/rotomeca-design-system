import { build } from 'esbuild';
import { lessPlugin } from './less-plugin.mjs';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'esm',
  target: 'es2022',
  outfile: 'out/rotomeca-design-system.js',
  plugins: [lessPlugin()],
  logLevel: 'info',
});
