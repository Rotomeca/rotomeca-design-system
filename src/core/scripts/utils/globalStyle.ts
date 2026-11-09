/**
 * Adopte une feuille de style globale (composants light DOM), une seule fois par document.
 *
 * @remarks
 * La clé est le tag du composant : stable à la minification, contrairement au nom de classe.
 * Même registre (`window.rotomeca.rds.styles`) que `rds-flexbox`.
 *
 * @param key - Tag du composant propriétaire de la feuille.
 * @param css - CSS déjà compilé.
 */
export function adoptGlobalStyle(key: string, css: string): void {
  window.rotomeca ??= {};
  window.rotomeca.rds ??= {};
  window.rotomeca.rds.styles ??= {};

  if (window.rotomeca.rds.styles[key]) return;
  window.rotomeca.rds.styles[key] = true;

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}
