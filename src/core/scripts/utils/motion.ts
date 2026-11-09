/**
 * Indique si l'utilisateur demande une réduction des animations.
 *
 * @remarks
 * Pour les animations Web Animations API ; le CSS gère le reste via `@media (prefers-reduced-motion)`.
 *
 * @returns `true` si `prefers-reduced-motion: reduce` est actif.
 */
export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
