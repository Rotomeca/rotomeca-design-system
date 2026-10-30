// src/types/global.d.ts

/**
 * Déclarations globales du design system.
 *
 * Le design system stocke son état partagé dans `window.rotomeca.rds`.
 * Tous les champs sont optionnels : chaque module initialise ce dont il a besoin avec `??=`.
 *
 * @example
 * ```typescript
 * window.rotomeca ??= {};
 * window.rotomeca.rds ??= {};
 * window.rotomeca.rds.styles ??= {};
 * ```
 */
export {};

declare global {
  /** État partagé du design system (`window.rotomeca.rds`). */
  interface RotomecaDesignSystemGlobals {
    /**
     * Feuilles de style globales déjà adoptées par le document, par clé de composant.
     * Utilisé par les composants en Light DOM (pas de Shadow DOM pour porter leur style),
     * afin de n'injecter leur feuille qu'une seule fois.
     */
    styles?: Record<string, boolean>;
  }

  /** Espace de noms global `window.rotomeca`. */
  interface RotomecaGlobals {
    /** Design system Rotomeca. */
    rds?: RotomecaDesignSystemGlobals;
  }

  interface Window {
    /** Espace de noms global des librairies Rotomeca. */
    rotomeca?: RotomecaGlobals;
  }
}
