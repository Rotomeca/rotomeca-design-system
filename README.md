# @rotomeca/design-system

Design system de **Web Components** (custom elements, Shadow DOM) écrit en TypeScript + LESS.
Esthétique Material 3, palette automnale (marron / cuivre / ocre), thème clair et thème sombre « Sous-bois ».

## Installation et inclusion

### CSS général (tokens `--ds-*`, polices, styles de base)

```js
import '@rotomeca/design-system/css'; // bundler (vite, webpack, esbuild…)
```

```html
<link rel="stylesheet" href="node_modules/@rotomeca/design-system/dist/design-system.css" />
```

```less
@import '@rotomeca/design-system/less'; // dans un projet LESS
```

Version minifiée : `out/rotomeca-design-system.css`.

### Composants

```js
import '@rotomeca/design-system'; // enregistre tous les custom elements `rds-*`
import { toast, setTheme } from '@rotomeca/design-system';
```

```html
<rds-primary-button icon-before="house">Accueil</rds-primary-button>
<rds-input name="nom" required>Nom <span slot="hint">Obligatoire</span></rds-input>
```

Bundle ESM minifié : `out/rotomeca-design-system.js`. Les icônes (SVG `lucide-static`) sont copiées dans `out/icons` au build.

### Éviter le flash au chargement

Chargez le CSS général **avant** le script, et placez le `<script type="module">` dans le `<head>` (avec un `<link rel="modulepreload">`). Tant que les composants ne sont pas définis, le CSS les masque en réservant leur place (rendu visible après 2 s si le JS échoue).

### Thème

Le thème sombre s'active avec `data-theme="dark"` sur `<html>` (ou via `setTheme('light' | 'dark' | 'system')`).
Le thème se personnalise uniquement en redéfinissant des propriétés `--ds-*`.

## Briques (64)

**Atomes** : `rds-icon`, `rds-button`, `rds-primary-button`, `rds-secondary-button`, `rds-tertiary-button`,
`rds-danger-button`, `rds-icon-button`, `rds-link`, `rds-tag`, `rds-badge`, `rds-divider`, `rds-spinner`,
`rds-progress`, `rds-placeholder`, `rds-avatar`, `rds-picture`, `rds-date`, `rds-flexbox`, `rds-fragment`,
`rds-message`, `rds-input` et variantes (`-text`, `-number`, `-date`, `-time`, `-datetime`, `-search`,
`-password`, `-email`, `-tel`, `-url`, `-color`, `-range`), `rds-textarea`, `rds-select`, `rds-checkbox`,
`rds-radio`, `rds-switch`, `rds-segmented-control`, `rds-input-file`, `rds-tooltip`, `rds-helper`.

**Molécules** : `rds-alert`, `rds-callout`, `rds-quote`, `rds-card`, `rds-breadcrumb`, `rds-pagination`,
`rds-tabs` (+ `rds-tab-panel`), `rds-accordion` (+ `rds-accordion-item`), `rds-toast` (+ API `toast()`),
`rds-fieldset`, `rds-button-group`, `rds-menu` (+ `rds-menu-item`), `rds-stepper`, `rds-skip-links`,
`rds-back-to-top`.

**Organismes** : `rds-dialog`, `rds-drawer`, `rds-header`, `rds-footer`, `rds-sidenav`, `rds-table`,
`rds-theme-switcher` (+ API `setTheme()`).

Les tags sont définis dans `src/core/scripts/utils/tags.ts`. Les attributs, slots, `part`, états `:state()` et
événements de chaque brique sont documentés en TSDoc dans son fichier source.

## Documentation

Le site (un exemple vivant + son code HTML pour chacune des briques, API extraite du TSDoc) est construit avec le design system lui-même et publié sur GitHub Pages par `.github/workflows/docs.yml` à chaque push sur `main`.
Activer une fois : Settings → Pages → Source « GitHub Actions ». Pour ajouter une brique : `docs/examples/<nom>.html` + entrée dans `docs/site.config.mjs` (le build échoue si une brique n'est pas documentée).

## Développement

- `pnpm dev` : playground sur http://localhost:5173 (recompilation LESS + live reload), une section par brique
- `pnpm docs:dev` : site de documentation sur http://localhost:5174 (live reload)
- `pnpm docs:build` : génère le site de documentation dans `site/` (variable `DOCS_BASE` = préfixe d'URL)
- `pnpm build` : génère `dist/` et `out/` (JS + CSS + icônes)
- `pnpm test` : typecheck + lint + build (porte de validation)
- `pnpm format` / `pnpm format:check` : Prettier

### Poids du bundle (`out/`)

| Fichier | Minifié | Gzip |
| --- | --- | --- |
| `rotomeca-design-system.js` (64 briques) | ≈ 269 ko | ≈ 60 ko |
| `rotomeca-design-system.css` | ≈ 23,3 ko | ≈ 4,2 ko |

Les styles des composants sont embarqués dans le JS (constructed stylesheets partagées).
