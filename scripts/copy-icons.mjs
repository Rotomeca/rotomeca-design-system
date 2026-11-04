import { cp } from 'node:fs/promises';

/** Copie les SVG de Lucide à côté des bundles (`dist/icons`, `out/icons`) : `<rds-icon>` les charge par nom. */
for (const target of ['dist/icons', 'out/icons']) {
  await cp('node_modules/lucide-static/icons', target, {
    recursive: true,
    filter: (source) => !source.endsWith('.json'),
  });
}
