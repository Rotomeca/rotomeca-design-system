# rotomeca-design-system

## Inclure le CSS général

```js
import 'rotomeca-design-system/css'; // bundler (vite, webpack, esbuild…)
```

```html
<link rel="stylesheet" href="node_modules/rotomeca-design-system/dist/design-system.css" />
```

```less
@import 'rotomeca-design-system/less'; // dans un projet LESS
```

Version minifiée : `out/rotomeca-design-system.css`.

## Développement

- `pnpm dev` : playground sur http://localhost:5173 (recompilation LESS + live reload)
- `pnpm build` : génère `dist/` et `out/` (JS + CSS)
- `pnpm test` : typecheck + build
