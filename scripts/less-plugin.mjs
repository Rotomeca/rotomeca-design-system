import { readFile } from 'node:fs/promises';
import less from 'less';

/**
 * Plugin esbuild : `import styles from './x.less'` donne le CSS compilé sous forme de chaîne.
 *
 * @returns {import('esbuild').Plugin}
 */
export function lessPlugin() {
  return {
    name: 'less',
    setup(build) {
      build.onLoad({ filter: /\.less$/ }, async ({ path }) => {
        try {
          const source = await readFile(path, 'utf8');
          const { css, imports } = await less.render(source, { filename: path });
          return { contents: css, loader: 'text', watchFiles: [path, ...imports] };
        } catch (error) {
          return {
            errors: [
              {
                text: error.message,
                location: error.line
                  ? { file: error.filename ?? path, line: error.line, column: error.column ?? 0 }
                  : { file: path },
              },
            ],
          };
        }
      });
    },
  };
}
