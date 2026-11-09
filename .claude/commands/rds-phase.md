---
description: Enchaîne toutes les briques d'une phase du kit Rotomeca (ex. /rds-phase 1)
argument-hint: <0-6>
---

Réalise la **phase $ARGUMENTS** du brief `design-system-handoff/docs/HANDOFF.md`.

1. Lis la section 3 du brief pour la phase $ARGUMENTS, puis `docs/INVENTORY.md` pour la liste et l'ordre des briques de cette phase (colonne « Phase »).
2. Phase 0 : applique directement les étapes de fondation (tokens, utilitaires et mixins partagés, bascule de thème dans le playground), puis `pnpm test`.
3. Phases 1 à 5 : pour chaque brique dans l'ordre de l'inventaire dont l'état n'est pas « fait », applique intégralement la procédure de `/rds-implement` (`.claude/commands/rds-implement.md`), avec un commit par brique (message en français). Si `pnpm test` échoue et que tu ne sais pas le corriger proprement, arrête-toi et explique le blocage.
4. Phase 6 : finition (playground complet, README, poids de `out/`).

À la fin : liste des briques terminées, tokens ajoutés, écarts avec la référence, et ce qui reste.
