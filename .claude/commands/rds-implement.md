---
description: Porte une brique du design system Rotomeca depuis le kit de référence (ex. /rds-implement Checkbox)
argument-hint: <NomDuComposant>
---

Porte la brique **$ARGUMENTS** du design system Rotomeca dans ce dépôt.

Le kit de référence est dans `rotomeca-ds-handoff/` (chemins ci-dessous relatifs à ce dossier). Avant d'écrire du code :

1. Lis `docs/HANDOFF.md` (sections 2, 4 et 5) si ce n'est pas déjà fait dans cette session, et `docs/MAPPING.md`.
2. Trouve la ligne `$ARGUMENTS` dans `docs/INVENTORY.md` : dossier cible, classe de base, dépendances, état actuel. Si une dépendance n'est pas encore portée, arrête-toi et dis-le.
3. Lis la spec `docs/components/$ARGUMENTS.md`.
4. Dans `reference/rotomeca-reference.js`, lis la classe `Rotomeca$ARGUMENTS` et sa constante CSS (`*_CSS`), ainsi que les utilitaires qu'elle appelle.
5. Regarde `reference/previews/$ARGUMENTS.html` et les captures `reference/screenshots/$ARGUMENTS-light.png` / `-dark.png`.

Puis implémente en suivant la procédure de la section 4 du brief : `.ts(x)` + `.less` au bon niveau, `@Define` + décorateurs, TSDoc en français, uniquement des tokens `--ds-*`, animations `transform` / `opacity` avec bloc `prefers-reduced-motion`, constante dans `tags.ts`, export dans `src/index.ts`, section dans le playground (reprendre le contenu de la preview).

Conserve exactement l'API publique de la spec (attributs, slots, parts, états `:state()`, événements, méthodes). S'il te manque un token, ajoute-le dans les deux thèmes de `src/core/styles/tokens/design-system-base.less` et signale-le.

Termine par `pnpm test` (doit être vert), puis mets à jour la colonne « État » de la ligne dans `docs/INVENTORY.md` (« fait »). Résume en quelques lignes : fichiers créés ou modifiés, écarts éventuels avec la référence et pourquoi.
