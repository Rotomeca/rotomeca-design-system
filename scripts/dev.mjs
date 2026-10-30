import { mkdirSync, watch } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import less from 'less';
import { context } from 'esbuild';

const entry = 'src/core/styles/design-system.less';
const buildDir = 'playground/.build';
const cssFile = `${buildDir}/design-system.css`;

async function buildCss() {
  try {
    const source = await readFile(entry, 'utf8');
    const { css } = await less.render(source, { filename: entry });
    await writeFile(cssFile, css);
    console.log('[less] compilé');
  } catch (e) {
    console.error('[less] erreur :', e.message);
  }
}

mkdirSync(buildDir, { recursive: true });
await buildCss();

let timer;
watch('src', { recursive: true }, (_, name) => {
  if (!name?.endsWith('.less')) return;
  clearTimeout(timer);
  timer = setTimeout(buildCss, 50);
});

// esbuild ne sert que des fichiers sous servedir : on sert playground/ (le CSS est dans .build)
const ctx = await context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'playground/.build/index.js',
  logLevel: 'info',
});
await ctx.watch();
const { port } = await ctx.serve({ servedir: 'playground', port: 5173 });
console.log(`Playground : http://localhost:${port}`);
