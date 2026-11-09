import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_ICON_BUTTON } from '../../../core/scripts/utils/tags';
import { BUTTON_VARIANTS, RotomecaButton, type ButtonVariant } from '../button/button';

export { RotomecaIconButton };

/**
 * Bouton icône seule : rond par défaut, variante `tertiary` par défaut, `label` obligatoire.
 *
 * @remarks
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `icon` | nom Lucide | **Obligatoire.** L'icône. |
 * | `label` | texte | **Obligatoire.** Nom accessible. |
 * | `variant` | `tertiary` (défaut) · `primary` · `secondary` · `danger`… | Comme `rds-button`. |
 * | `square` | booléen | Carré au lieu de rond. |
 * | `size` | `sm` · `md` · `lg` | 32 / 40 / 48 px. |
 * | `toggle` | booléen | Bouton bascule : `aria-pressed`, un clic bascule `selected`. |
 * | `selected` / `selected-icon` | booléen / nom | État sélectionné et icône alternative. |
 *
 * @fires rds-icon-button:toggle - Bascule d'un bouton `toggle` ; `detail: { selected }`.
 * @cssstate selected - Bouton bascule sélectionné.
 *
 * @example
 * ```html
 * <rds-icon-button icon="x" label="Fermer"></rds-icon-button>
 * <rds-icon-button icon="heart" label="Ajouter aux favoris" toggle></rds-icon-button>
 * ```
 */
@Define({ tag: TAG_ICON_BUTTON })
class RotomecaIconButton extends RotomecaButton {
  /** Nom de l'icône Lucide affichée. */
  @Attr() accessor icon: string = '';
  /** Icône affichée quand le bouton bascule est sélectionné. */
  @Attr('selected-icon') accessor selectedIcon: string = '';
  /** Bouton bascule (`aria-pressed`). */
  @Attr() accessor toggle: boolean = false;
  /** État sélectionné d'un bouton bascule. */
  @Attr() accessor selected: boolean = false;
  /** Bouton carré au lieu de rond. */
  @Attr() accessor square: boolean = false;

  static observedAttributes: string[] = [
    ...RotomecaButton.observedAttributes,
    'icon',
    'selected-icon',
    'toggle',
    'selected',
  ];

  connectedCallback(): void {
    if (!this.hasAttribute('rounded') && !this.hasAttribute('square'))
      this.toggleAttribute('rounded', true);
    super.connectedCallback();
  }

  protected get _p_resolvedVariant(): ButtonVariant {
    const variant = this.getAttribute('variant') as ButtonVariant | null;
    return variant && BUTTON_VARIANTS.includes(variant) ? variant : 'tertiary';
  }

  protected _p_resolveIcons(): [string, string] {
    const icon = this.toggle && this.selected && this.selectedIcon ? this.selectedIcon : this.icon;
    return [String(icon), ''];
  }

  protected _p_afterButtonUpdate(button: HTMLButtonElement): void {
    if (this.toggle) button.setAttribute('aria-pressed', String(this.selected));
    else button.removeAttribute('aria-pressed');
    if (this.toggle && this.selected) this._p_addState('selected');
    else this._p_removeState('selected');
  }

  protected _p_onActivate(): void {
    if (!this.toggle) return;
    this.selected = !this.selected;
    this.emit('rds-icon-button:toggle', { selected: this.selected });
  }
}
