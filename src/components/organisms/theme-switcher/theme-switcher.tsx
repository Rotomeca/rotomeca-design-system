import { Define } from '../../../core/scripts/decorators';
import { TAG_THEME_SWITCHER } from '../../../core/scripts/utils/tags';
import { RotomecaSegmentedControl } from '../../atoms/segmented-control/segmented-control';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { applyTheme, setTheme, storedTheme, type ThemeMode } from './theme';
import style from './theme-switcher.less';

export { RotomecaThemeSwitcher };

const TEMPLATE = (
  <RotomecaSegmentedControl id="seg" part="control">
    <option value="light" data-icon="sun">
      Clair
    </option>
    <option value="dark" data-icon="moon">
      Sombre
    </option>
    <option value="system" data-icon="monitor">
      Système
    </option>
  </RotomecaSegmentedControl>
);

/**
 * Paramètres d'affichage : bascule Clair / Sombre / Système, appliquée à `<html data-theme>` et
 * mémorisée dans ce navigateur. Organisme bâti sur `rds-segmented-control`.
 *
 * @remarks
 * En mode Système, le thème suit `prefers-color-scheme` en direct. API globale : {@link setTheme}.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte (défaut « Thème d'affichage ») | Nom accessible du groupe. |
 * | `icon-only` | booléen | Icônes seules. |
 * | `size` | `lg` | Segments plus grands. |
 * | `default` | `light` · `dark` · `system` (défaut) | Mode sans préférence enregistrée. |
 * | `no-apply` | booléen | N'applique rien tant que l'utilisateur n'a pas choisi. |
 * | `full` | booléen | Occupe toute la largeur. |
 *
 * @csspart control - Le contrôle segmenté.
 * @fires rds-theme:change - Mode choisi ; `detail: { mode, theme }`.
 *
 * @example
 * ```html
 * <rds-theme-switcher icon-only></rds-theme-switcher>
 * ```
 */
@Define({ tag: TAG_THEME_SWITCHER, template: TEMPLATE, styles: style })
class RotomecaThemeSwitcher extends BaseElementInternal {
  static observedAttributes: string[] = ['label', 'icon-only', 'size'];

  protected onConnect(): void {
    const control = this.require<RotomecaSegmentedControl>('#seg');
    const stored = storedTheme();
    const mode: ThemeMode =
      stored ??
      (this.#_mode(this.getAttribute('default')) ||
        this.#_mode(document.documentElement.dataset.themeMode) ||
        'system');
    if (!this.hasAttribute('no-apply') || stored) applyTheme(mode);
    control.value = mode;
    this.resources.listen(control, 'rds-segmented-control:change', (event) => {
      const value = (event as CustomEvent<{ value: ThemeMode }>).detail.value;
      const theme = setTheme(value);
      this.emit('rds-theme:change', { mode: value, theme });
    });
  }

  protected update(): void {
    const control = this.require('#seg');
    control.setAttribute('label', this.getAttribute('label') || "Thème d'affichage");
    const iconOnly = this.hasAttribute('icon-only');
    control.querySelectorAll('option').forEach((option) => {
      option.toggleAttribute('data-icon-only', iconOnly);
    });
    if (this.hasAttribute('size')) control.setAttribute('size', this.getAttribute('size') ?? '');
    else control.removeAttribute('size');
  }

  #_mode(value: string | null | undefined): ThemeMode | null {
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  }
}
