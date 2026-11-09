---
description: Vérifie une brique portée contre la référence du kit Rotomeca (ex. /rds-check Tabs)
argument-hint: <NomDuComposant>
---

Vérifie la brique **$ARGUMENTS** déjà portée, par rapport au kit `rotomeca-ds-handoff/`. Ne modifie rien sans le dire.

Contrôles :

1. **API** : compare attributs, slots, parts, états `:state()`, événements et méthodes publiques avec `docs/components/$ARGUMENTS.md` et la classe `Rotomeca$ARGUMENTS` de `reference/rotomeca-reference.js`. Liste les écarts.
2. **Tokens** : aucun hex, aucune variable de palette dans le `.less` du composant ; chaque `var(--ds-*)` utilisé existe dans `src/core/styles/tokens/design-system-base.less`, dans les deux thèmes si c'est une couleur.
3. **Animation** : seulement `transform`, `opacity` et des couleurs ; durées et courbes par tokens ; bloc `@media (prefers-reduced-motion: reduce)` présent.
4. **Accessibilité** : rôle et états ARIA via `ElementInternals`, clavier conforme à la spec, focus visible, nom accessible requis signalé par `Log.warn`.
5. **Charte** : `@Define` en premier décorateur, TSDoc en français, écouteurs via `resources`, pas de recréation du DOM interne à chaque update, pas de dépendance ajoutée, règle de dépendance Atomic Design respectée.
6. **Rendu** : avec `pnpm dev`, compare la section du playground à `reference/previews/$ARGUMENTS.html` et aux captures, en clair et en sombre.
7. `pnpm test`.

Rends un tableau Sévérité | Fichier | Problème | Recommandation, trié du plus grave au plus mineur.
