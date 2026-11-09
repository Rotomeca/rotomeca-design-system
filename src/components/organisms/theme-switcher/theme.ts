export { applyTheme, setTheme, storedTheme };
export type { ThemeMode, ResolvedTheme };

/** Mode choisi par l'utilisateur. */
type ThemeMode = 'light' | 'dark' | 'system';

/** Thème effectivement appliqué à `<html data-theme>`. */
type ResolvedTheme = 'light' | 'dark';

const THEME_KEY = 'rds-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

let watching = false;

/** Suit `prefers-color-scheme` tant que le mode est `system` (abonnement posé une seule fois). */
function watchSystem(): void {
  if (watching) return;
  watching = true;
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (document.documentElement.dataset.themeMode === 'system') applyTheme('system');
  });
}

/**
 * Applique un thème à `<html>` (`data-theme` et `data-theme-mode`) sans le mémoriser.
 *
 * @param mode - `light`, `dark` ou `system` (suit la préférence du système, en direct).
 * @returns Le thème effectivement appliqué.
 */
function applyTheme(mode: ThemeMode): ResolvedTheme {
  watchSystem();
  const resolved: ResolvedTheme =
    mode === 'system' ? (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.dataset.themeMode = mode;
  return resolved;
}

/**
 * Change le thème et le mémorise pour ce navigateur.
 *
 * @param mode - `light`, `dark` ou `system`.
 * @returns Le thème effectivement appliqué.
 */
function setTheme(mode: ThemeMode): ResolvedTheme {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // Stockage indisponible : le thème s'applique quand même, sans être mémorisé.
  }
  return applyTheme(mode);
}

/**
 * Lit le mode mémorisé.
 *
 * @returns Le mode enregistré, ou `null` si aucun.
 */
function storedTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  } catch {
    return null;
  }
}
