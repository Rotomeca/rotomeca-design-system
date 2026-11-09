# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Vision & principes

Design system de **Web Components** (custom elements, Shadow DOM), écrit en TypeScript + LESS.

- **Moderne** : esthétique type Material 3 / Google — surfaces douces, rayons arrondis, élévation légère, typographie claire, états (hover/focus/active/disabled/erreur) toujours soignés.
- **Animé mais sobre** : les animations servent le feedback (survol, focus, ouverture/fermeture, validation), jamais la décoration gratuite. Si un doute existe, ne pas animer.
- **Optimisé au maximum** : poids du bundle, coût de rendu et mémoire sont des critères de revue (voir « Optimisation »).
- **Palette automnale** (marron / cuivre / ocre) comme identité visuelle (voir « Tokens & thème »).
- Documentation et commentaires en **français** (TSDoc) ; respecter cette convention.

## Commands

Package manager is pnpm (`pnpm@12.15.0`).

- `pnpm dev` — cleans, runs `test`, then starts the playground (http://localhost:5173, LESS recompilation + live reload; `scripts/dev.mjs`)
- `pnpm test` — `typecheck` + `lint` + `build` (there is no unit-test runner; this is the validation gate — à lancer avant de conclure toute modification)
- `pnpm typecheck` / `pnpm lint` / `pnpm lint:fix` / `pnpm format` / `pnpm format:check`
- `pnpm build` — `dist/` (tsc output + `design-system.css` via lessc), `out/` (esbuild-minified ESM bundle + minified CSS), then copies lucide icons (`scripts/copy-icons.mjs`)

## Dépendances

- **Runtime : uniquement les packages de l'auteur `@rotomeca/*`** (`@rotomeca/event`, `@rotomeca/rop`, `@rotomeca/utils`). **Ne jamais ajouter une librairie tierce** (UI, animation, icônes JS, utilitaires type lodash/date-fns…). Si un besoin apparaît, utiliser d'abord `@rotomeca/utils` ou `src/core/scripts/utils/`, sinon l'implémenter en natif (Web APIs).
- Les devDependencies (build, lint, types) restent possibles mais doivent rester minimales.
- Icônes : fichiers SVG `lucide-static` copiés au build, pas de code runtime associé.

## Architecture

- **Entry point**: `src/index.ts` re-exports everything public. New components/utilities must be added there.
- **Base classes** (`src/components/base/`): `BaseElement` (batched attribute-change updates via `update`/`afterUpdate` hooks, constructed-stylesheet cache with `<style>` fallback, connect hooks, `ResourceScope` for cleanup on disconnect), `BaseElementInternal` (adds `ElementInternals`), `BaseFormElement` (form-associated controls; derived class owns value/reset/validity).
- **Decorators** (`src/core/scripts/decorators/`): components are declared with TC39 standard decorators — `@Define({ tag, template, styles })` (must sit above other class decorators like `@Observe`, `@Light`, `@UpdateAll`), `@Attr()` accessors for reflected attributes, plus `@Listen`, `@Query`, `@Event`, etc. Prefer these over hand-written lifecycle code.
- **JSX** (`src/core/scripts/jsx/`): the custom runtime (`jsxImportSource: @rotomeca/ds-jsx`, mapped in `tsconfig.json` `paths`) turns JSX into **HTML strings**, not DOM nodes. It is used for `@Define` templates (compiled once into a `HTMLTemplateElement`). Hence components using JSX are `.tsx`.
- **Styles**: `import style from './x.less'` yields compiled CSS as a string (esbuild `scripts/less-plugin.mjs`; ambient typing in `src/types/less.d.ts`). The package also exports `./less`, `./css`, `./jsx-runtime`.
- **Build outputs** `dist/` and `out/` and `playground/.build` are generated — don't edit them.

## Hiérarchie des composants (Atomic Design)

Chemin : `src/components/{atoms,molecules,organisms}/<name>/<name>.{ts,tsx,less}`. Tags `rds-*` définis comme constantes dans `src/core/scripts/utils/tags.ts`.

- **atoms** : élément indivisible, sans dépendance vers un autre composant (ex. `button`, `input`, `date`, icône).
- **molecules** : composition d'atoms avec une responsabilité unique (ex. champ + label + message d'aide).
- **organisms** : sections autonomes composant molecules/atoms (formulaires, barres, dialogues).
- **Règle de dépendance** : un niveau n'importe que des niveaux inférieurs, jamais l'inverse ni un pair du même niveau (hors atoms utilitaires comme `fragment`).
- Ne pas créer une molecule/organism si un atom suffit ; ne pas dupliquer de logique, la remonter dans `base/` ou `core/scripts/utils/`.

### Checklist nouveau composant

1. Dossier au bon niveau, fichiers `.ts`/`.tsx`/`.less` de même nom.
2. Constante de tag dans `tags.ts` + export dans `src/index.ts`.
3. Déclaration via `@Define` + décorateurs (`@Attr`, `@Listen`…), TSDoc en français.
4. Styles uniquement via tokens `--ds-*` ; états hover/focus/active/disabled.
5. Accessibilité (voir plus bas), animation sobre.
6. `pnpm test` vert.

## Tokens & thème

Deux couches, dans `src/core/styles/tokens/` :

1. **Tokens bruts (palette)** — `tokens.less` : variables LESS `@<couleur>-<n>` avec variantes `-hover` et `-active` (ex. `@marron-100`, `@marron-100-hover`).
2. **Tokens sémantiques** — `design-system-base.less` : propriétés CSS `--ds-*` sur `:root`, générées par le mixin `.create-token(nom, variable)` → `--ds-<nom>`, `--ds-<nom>-hover`, `--ds-<nom>-active`.

**Règles**

- **Un composant ne référence que `var(--ds-*)`** : jamais d'hex, jamais de variable LESS de palette. Besoin d'une valeur manquante → créer d'abord le token sémantique.
- Nommage : `--ds-<rôle>-<propriété>` (ex. `--ds-background-action-primary`, `--ds-input-border`), variantes `-hover` / `-active`.
- Tout ce qui est répété devient un token : couleurs, rayons (`--ds-radius-*`), espacements (`--ds-space-*`), ombres (`--ds-shadow-*`), durées et easings (`--ds-duration-*`, `--ds-ease-*`), typographie. Créer la famille si elle n'existe pas encore.
- Le thème se surcharge uniquement en redéfinissant des `--ds-*` (permet un mode sombre/alternatif sans toucher aux composants).
- Contraste texte/fond conforme WCAG AA minimum.

**Palette automnale (référence)**

| Nom | Hex | Rôle |
| --- | --- | --- |
| Marron (principal) | `#6b4226` | Action primaire |
| Châtaigne | `#8b5e3c` | Hover du marron |
| Écorce | `#3e2723` | Active du marron |
| Cuivre | `#b85c38` | Accent, texte d'action secondaire |
| Terracotta | `#c87552` | Accent doux |
| Ocre | `#d6a23d` | Accent chaud, mise en avant |
| Bordeaux | `#7a3545` | Accent profond |
| Olive | `#77794e` | Accent naturel / succès doux |
| Crème | `#f5ebdd` | Surfaces, fond des champs |
| Lin | `#e7d5be` | Surfaces secondaires, bordures |
| Encre brune | `#2d211b` | Texte principal |

États sémantiques : `warning`, `danger`, `success` (voir `tokens.less`). Respecter l'ambiance chaleureuse et naturelle : pas de couleurs froides/saturées hors états sémantiques.

## Animation

- Animations en **CSS** (transitions, `@keyframes`) ; Web Animations API native si nécessaire. Aucune lib d'animation.
- N'animer que `transform` et `opacity` (pas de `width`/`height`/`top`/`left`), `will-change` seulement ponctuellement.
- Durées courtes (≈ 150–300 ms) et easings via tokens (courbe Material « standard »/« emphasized »).
- Feedback attendu : transitions hover/focus/active, anneau de focus animé, apparition/disparition douce, états de validation.
- **Toujours** prévoir `@media (prefers-reduced-motion: reduce)` qui neutralise les animations non essentielles.

## Optimisation

- Styles : constructed stylesheets partagées via `BaseElement` (pas de `<style>` dupliqué par instance), un fichier LESS par composant, sélecteurs simples (`:host`, `::part`), pas de `!important`, pas de sélecteurs profonds.
- Rendu : templates JSX compilés **une seule fois** dans `@Define` ; mises à jour ciblées (`@Attr`, `update`/`afterUpdate`), jamais de re-création complète du DOM interne.
- Mémoire : listeners et ressources via `@Listen` / `ResourceScope`, nettoyés au disconnect ; pas de références persistantes aux nœuds détachés.
- Bundle : code tree-shakable (`sideEffects` limité à `*.css`/`*.less`), aucune dépendance ajoutée, imports ciblés ; vérifier le poids de `out/` après `pnpm build`.
- Éviter le travail inutile : pas de calcul dans les getters appelés fréquemment, utiliser `Scheduler`/`@Defer`/`@Schedule` pour regrouper les mises à jour.

## Accessibilité

- Rôles/ARIA corrects, navigation clavier complète, focus visible (tokens d'anneau `--ds-input-ring-*`).
- Contrôles de formulaire : `BaseFormElement` / `ElementInternals` (valeur, validité, reset, états).
- Libellés via attributs/slots, pas de texte codé en dur dans les composants.

## Kit de portage du design system

Le dossier `design-system-handoff/` contient la conception validée du design system (64 briques) : specs, implémentation de référence en JS natif, previews, captures et tokens. **Point d'entrée : `design-system-handoff/docs/HANDOFF.md`.**

- Ce dossier est une référence en lecture seule : ne pas l'importer depuis `src/`, ne pas le modifier (sauf la colonne « État » de `docs/INVENTORY.md`). Il est exclu du lint, de Prettier, du typecheck et du paquet publié.
- Pour porter une brique : `/rds-implement <Nom>` ; une phase entière : `/rds-phase <n>` ; vérifier une brique : `/rds-check <Nom>`.
- Ordre de priorité en cas de conflit : ce `CLAUDE.md` > spec du composant (`docs/components/<Nom>.md`) > référence JS > captures.
- Atomes utilitaires (importables par d'autres atomes) : `fragment`, `icon`, `message`, `button` / `icon-button`.
- Thème sombre « Sous-bois » : `[data-theme='dark']` sur `<html>` ; tout composant se vérifie dans les deux thèmes.
- Polices : `--ds-font-display` (Fraunces), `--ds-font-sans` (Figtree), `--ds-font-mono`.
