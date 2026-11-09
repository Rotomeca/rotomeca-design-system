import { Attr, Define } from '../../../core/scripts/decorators';
import { Log } from '../../../core/scripts/utils/Log';
import { TAG_BUTTON } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import { RotomecaIcon } from '../icon/icon';
import style from './button.less';

export { RotomecaButton };
export { BUTTON_VARIANTS };
export type { ButtonVariant, ButtonType, ButtonSize };

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'warning' | 'danger' | 'success';
type ButtonType = 'button' | 'submit' | 'reset';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: readonly ButtonVariant[] = [
  'primary',
  'secondary',
  'tertiary',
  'warning',
  'danger',
  'success',
];

const TEMPLATE = (
  <button id="button" part="button" type="button">
    <slot name="icon-before">
      <RotomecaIcon id="icon-before" hidden />
    </slot>
    <RotomecaIcon id="spinner" name="loader-circle" hidden />
    <span class="label">
      <slot id="text"></slot>
    </span>
    <slot name="icon-after">
      <RotomecaIcon id="icon-after" hidden />
    </slot>
  </button>
);

/**
 * Bouton du design system.
 *
 * @remarks
 * Un vrai `<button>` natif est rendu dans le Shadow DOM (rôle, clavier, focus et état désactivé
 * natifs). Le focus du composant est délégué à ce bouton.
 *
 * Un bouton `loading` bloque le clic mais garde le focus, et expose `aria-busy` / `aria-disabled`.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `variant` | `primary` (défaut) · `secondary` · `tertiary` · `warning` · `danger` · `success` | Hiérarchie / intention. |
 * | `size` | `sm` (32 px) · `md` (40 px, défaut) · `lg` (48 px) | Hauteur et cible tactile. |
 * | `rounded` | booléen | Forme pilule. |
 * | `icon-before` / `icon-after` | nom Lucide | Icône avant / après le texte. |
 * | `icon-gap` | longueur CSS | Écart icône ↔ texte. |
 * | `loading` · `disabled` | booléen | Chargement (focus conservé) / désactivé. |
 * | `type` | `button` · `submit` · `reset` | Comportement dans le formulaire parent. |
 * | `label` | texte | Nom accessible, obligatoire sans texte. |
 *
 * @slot - Texte du bouton.
 * @slot icon-before - Icône personnalisée avant le texte.
 * @slot icon-after - Icône personnalisée après le texte.
 * @csspart button - Le `<button>` natif.
 * @cssstate icon-only - Bouton sans texte, avec au moins une icône.
 * @cssprop --_radius - Rayon imposé par `rds-button-group` (usage interne).
 *
 * @example
 * ```html
 * <rds-button variant="danger" icon-before="trash-2">Supprimer</rds-button>
 * <rds-button variant="tertiary" rounded icon-before="x" label="Fermer"></rds-button>
 * ```
 */
@Define({ tag: TAG_BUTTON, template: TEMPLATE, styles: style })
class RotomecaButton extends BaseElementInternal {
  /** Variation : `primary` (défaut), `secondary`, `tertiary`, `warning`, `danger`, `success`. */
  @Attr() accessor variant: ButtonVariant = 'primary';
  /** Taille : `sm` (32 px), `md` (40 px, défaut), `lg` (48 px). */
  @Attr() accessor size: ButtonSize = 'md';
  /** Bords arrondis (forme pilule). */
  @Attr() accessor rounded: boolean = false;
  @Attr() accessor disabled: boolean = false;
  /** Chargement : bouton inactif (clic bloqué, focus conservé) avec une icône qui tourne. */
  @Attr() accessor loading: boolean = false;
  /** Comportement dans un formulaire. */
  @Attr() accessor type: ButtonType = 'button';
  /** Nom accessible. Obligatoire pour un bouton qui ne contient qu'une icône. */
  @Attr() accessor label: string = '';
  /** Nom de l'icône affichée avant le texte. */
  @Attr('icon-before') accessor iconBefore: string = '';
  /** Nom de l'icône affichée après le texte. */
  @Attr('icon-after') accessor iconAfter: string = '';
  /** Espace entre l'icône et le texte (longueur CSS, ex. `1rem`). */
  @Attr('icon-gap') accessor iconGap: string = '';

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = [
    'variant',
    'size',
    'disabled',
    'loading',
    'type',
    'label',
    'icon-before',
    'icon-after',
    'icon-gap',
  ];

  /** Variante imposée par une sous-classe (`null` : lue dans l'attribut `variant`). */
  static fixedVariant: ButtonVariant | null = null;

  /** Variante effective : variante figée de la classe, sinon attribut valide, sinon `primary`. */
  protected get _p_resolvedVariant(): ButtonVariant {
    const fixed = (this.constructor as typeof RotomecaButton).fixedVariant;
    if (fixed) return fixed;
    return BUTTON_VARIANTS.includes(this.variant) ? this.variant : 'primary';
  }

  /** Icônes `[avant, après]` ; surchargé par `rds-icon-button`. */
  protected _p_resolveIcons(): [string, string] {
    return [this.iconBefore, this.iconAfter];
  }

  /** Point d'extension appelé en fin de `update` (ARIA supplémentaire des sous-classes). */
  protected _p_afterButtonUpdate(_button: HTMLButtonElement): void {}

  /** Point d'extension appelé après un clic non bloqué. */
  protected _p_onActivate(_event: Event): void {}

  #_warned = false;

  protected onConnect(): void {
    this.resources.listen(this.renderRoot, 'click', (event) => this.#_onClick(event));
  }

  protected update(): void {
    const button = this.#_button;

    button.dataset.variant = this._p_resolvedVariant;
    button.disabled = this.disabled;
    button.type = this.type;

    if (this.label) button.setAttribute('aria-label', this.label);
    else button.removeAttribute('aria-label');

    // `aria-disabled` plutôt que `disabled` : le focus clavier n'est pas perdu pendant le chargement.
    if (this.loading) {
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');
    } else {
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-disabled');
    }

    // Pendant le chargement, le spinner remplace les icônes.
    (this.renderRoot.querySelector('#spinner') as RotomecaIcon).hidden = !this.loading;
    const [before, after] = this._p_resolveIcons();
    this.#_syncIcon('icon-before', this.loading ? '' : before);
    this.#_syncIcon('icon-after', this.loading ? '' : after);
    this.setCSSProperty('--_gap', this.iconGap || null);
    this._p_afterButtonUpdate(button);
    this.#_updateIconOnly();
  }

  protected slotChanged(slot: HTMLSlotElement): void {
    if (slot.id === 'text') this.#_updateIconOnly();
  }

  get #_button(): HTMLButtonElement {
    return this.renderRoot.querySelector('#button') as HTMLButtonElement;
  }

  #_syncIcon(id: string, name: string): void {
    const icon = this.renderRoot.querySelector(`#${id}`) as RotomecaIcon;

    icon.hidden = !name;
    if (name) icon.setAttribute('name', name);
    else icon.removeAttribute('name');
  }

  /** Icône seule : pas de texte, au moins une icône. Le nom accessible devient alors indispensable. */
  #_updateIconOnly(): void {
    const iconOnly = !hasContent(this.#_text) && this.#_hasIcon();

    if (iconOnly) this._p_addState('icon-only');
    else this._p_removeState('icon-only');

    // Pendant le parsing, le texte n'est pas encore là : l'avertissement attend la fin du chargement.
    if (iconOnly && !this.label && !this.#_warned) {
      const check = (): void => {
        if (!this.label && !hasContent(this.#_text) && this.#_hasIcon() && !this.#_warned) {
          this.#_warned = true;
          Log.warn(
            'rds-button',
            'Un bouton icône seul doit avoir un attribut `label` (nom accessible).',
            this,
          );
        }
      };
      if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => queueMicrotask(check), { once: true });
      else queueMicrotask(check);
    }
  }

  get #_text(): HTMLSlotElement {
    return this.renderRoot.querySelector('#text') as HTMLSlotElement;
  }

  #_hasIcon(): boolean {
    const [before, after] = this._p_resolveIcons();
    return this.loading || !!before || !!after;
  }

  /** Le bouton natif est dans le Shadow DOM : il ne peut pas soumettre le formulaire parent. */
  #_onClick(event: Event): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const form = this.closest('form');
    if (this.type === 'submit') form?.requestSubmit();
    else if (this.type === 'reset') form?.reset();
    this._p_onActivate(event);
  }
}
