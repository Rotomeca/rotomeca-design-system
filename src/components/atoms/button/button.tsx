import { Attr, Define } from '../../../core/scripts/decorators';
import { Log } from '../../../core/scripts/utils/Log';
import { TAG_BUTTON } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../icon/icon';
import style from './button.less';

export { RotomecaButton };
export type { ButtonVariant, ButtonType };

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'warning' | 'danger' | 'success';
type ButtonType = 'button' | 'submit' | 'reset';

const TEMPLATE = (
  <button id="button" part="button" type="button">
    <slot name="icon-before">
      <RotomecaIcon id="icon-before" hidden />
    </slot>
    <RotomecaIcon id="spinner" name="loader-circle" hidden />
    <slot id="text"></slot>
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
    'disabled',
    'loading',
    'type',
    'label',
    'icon-before',
    'icon-after',
    'icon-gap',
  ];

  protected onConnect(): void {
    this.resources.listen(this.renderRoot, 'click', (event) => this.#_onClick(event));
  }

  protected update(): void {
    const button = this.#_button;

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
    this.#_syncIcon('icon-before', this.loading ? '' : this.iconBefore);
    this.#_syncIcon('icon-after', this.loading ? '' : this.iconAfter);
    this.setCSSProperty('--_gap', this.iconGap || null);
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
    const slot = this.renderRoot.querySelector('#text') as HTMLSlotElement;
    const hasContent = slot
      .assignedNodes()
      .some((node) => node.nodeType === Node.ELEMENT_NODE || !!node.textContent?.trim());
    const hasIcon = this.loading || !!this.iconBefore || !!this.iconAfter;
    const iconOnly = !hasContent && hasIcon;

    if (iconOnly) {
      this._p_addState('icon-only');
      if (!this.label)
        Log.warn(
          'rds-button',
          'Un bouton icône seul doit avoir un attribut `label` (nom accessible).',
          this,
        );
    } else this._p_removeState('icon-only');
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
  }
}
