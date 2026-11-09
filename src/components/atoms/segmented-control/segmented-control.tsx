import { Define } from '../../../core/scripts/decorators';
import { TAG_SEGMENTED_CONTROL } from '../../../core/scripts/utils/tags';
import { BaseFormElement } from '../../base/BaseFormElement';
import { RotomecaIcon } from '../icon/icon';
import style from './segmented-control.less';

export { RotomecaSegmentedControl };

const TEMPLATE = (
  <>
    <div class="group" role="radiogroup" part="group">
      <span class="thumb" part="thumb"></span>
    </div>
    <slot hidden></slot>
  </>
);

/** Déplacement des flèches entre segments. */
const ARROWS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * Contrôle segmenté : choix exclusif parmi 2 à 5 options courtes (vue, période, thème), avec un pouce
 * qui glisse vers l'option choisie. Associé aux formulaires.
 *
 * @remarks
 * Plus de 5 options ou des libellés longs : préférer `rds-radio` ou `rds-select`.
 * Les options sont des enfants `<option value>` (`selected`, `disabled`, `data-icon="nom"`,
 * `data-icon-only` + `label` pour une option icône seule), recopiées en boutons `role="radio"`.
 * Clavier : flèches (déplacent et choisissent).
 *
 * | Attribut | Rôle |
 * | --- | --- |
 * | `label` | Nom accessible du groupe. |
 * | `size="lg"` | Segments plus grands. |
 * | `full` | Pleine largeur. |
 * | `disabled` | Désactive tout le contrôle. |
 *
 * Animation : le pouce glisse en `transform` (`--ds-duration-long`, courbe standard).
 *
 * @slot - Les `<option>` (non affichées telles quelles).
 * @csspart group - Le conteneur des segments.
 * @csspart thumb - Le pouce.
 *
 * @fires input - Valeur modifiée par l'utilisateur.
 * @fires change - Valeur modifiée par l'utilisateur.
 * @fires {CustomEvent<{value: string}>} rds-segmented-control:change - Valeur modifiée par l'utilisateur.
 *
 * @cssstate empty - Aucune option choisie.
 * @cssstate disabled - Contrôle désactivé.
 *
 * @example
 * ```html
 * <rds-segmented-control name="vue" label="Affichage">
 *   <option value="grille" data-icon="layout-grid" selected>Grille</option>
 *   <option value="liste">Liste</option>
 * </rds-segmented-control>
 * ```
 */
@Define({ tag: TAG_SEGMENTED_CONTROL, template: TEMPLATE, styles: style })
class RotomecaSegmentedControl extends BaseFormElement {
  static upgradeProperties = ['value'];
  static observedAttributes: string[] = [...BaseFormElement.observedAttributes, 'label'];

  #_value: string | null = null;
  #_initial: string | null = null;

  /** Valeur de l'option choisie (chaîne vide si aucune). */
  get value(): string {
    return this.#_value ?? '';
  }
  set value(value: string) {
    this.#_select(String(value), false);
  }

  protected onConnect(): void {
    // `attributeFilter` : le composant pose `--_n` / `--_i` sur l'hôte, sans lui la boucle serait infinie.
    this.observeMutations(this, () => this.#_render(), {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'selected', 'data-icon', 'data-icon-only', 'label'],
    });
    const group = this.require('.group');
    this.resources.listen(group, 'click', (event) => {
      const button = (event.target as Element).closest('button');
      if (button && !button.disabled) this.#_select(button.dataset.value ?? '', true);
    });
    this.resources.listen(group, 'keydown', (event) => {
      const direction = ARROWS[(event as KeyboardEvent).key];
      if (!direction) return;
      event.preventDefault();
      const buttons = [...group.querySelectorAll('button:not(:disabled)')] as HTMLButtonElement[];
      if (!buttons.length) return;
      const index = buttons.findIndex((button) => button.dataset.value === this.#_value);
      const next = buttons[(index + direction + buttons.length) % buttons.length];
      next.focus();
      this.#_select(next.dataset.value ?? '', true);
    });
  }

  protected update(): void {
    this.#_render();
  }

  protected onFormReset(): void {
    this.#_value = this.#_initial;
    this.#_paint();
  }

  protected onFormRestore(state: string | File | FormData): void {
    if (typeof state === 'string') this.#_value = state;
    this.#_paint();
  }

  #_options(): HTMLOptionElement[] {
    return [...this.querySelectorAll<HTMLOptionElement>(':scope > option')];
  }

  /** Recrée les boutons depuis les `<option>` (2 à 5 éléments : coût négligeable). */
  #_render(): void {
    const options = this.#_options();
    if (this.#_value === null) {
      const selected = options.find((o) => o.selected || o.hasAttribute('selected')) ?? options[0];
      this.#_value = this.getAttribute('value') ?? (selected ? selected.value : null);
      this.#_initial = this.#_value;
    }
    const group = this.require('.group');
    group.querySelectorAll('button').forEach((button) => button.remove());
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.dataset.value = option.value;
      button.disabled = option.disabled || this.effectivelyDisabled;
      const iconName = option.dataset.icon;
      if (iconName) {
        const icon = new RotomecaIcon();
        icon.setAttribute('name', iconName);
        button.append(icon);
      }
      const text = option.textContent.trim();
      const iconOnly = option.hasAttribute('data-icon-only');
      if (text && !iconOnly) button.append(text);
      if (iconOnly || !text) button.setAttribute('aria-label', option.getAttribute('label') || text);
      group.append(button);
    }
    group.setAttribute('aria-label', this.getAttribute('label') ?? '');
    this.#_paint();
  }

  /** Reflète la valeur : `aria-checked`, tabulation itinérante, position du pouce. */
  #_paint(): void {
    const buttons = [...this.require('.group').querySelectorAll('button')];
    const index = buttons.findIndex((button) => button.dataset.value === this.#_value);
    buttons.forEach((button, i) => {
      button.setAttribute('aria-checked', String(i === index));
      button.tabIndex = i === (index < 0 ? 0 : index) ? 0 : -1;
    });
    this.setCSSProperty('--_n', String(Math.max(1, buttons.length)));
    this.setCSSProperty('--_i', String(Math.max(0, index)));
    const states = this.internals.states;
    if (index < 0) states.add('empty');
    else states.delete('empty');
    if (this.effectivelyDisabled) states.add('disabled');
    else states.delete('disabled');
    this.setFormValue(this.#_value);
  }

  #_select(value: string, notify: boolean): void {
    if (value === this.#_value) return;
    this.#_value = value;
    this.#_paint();
    if (notify) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
      this.emit('rds-segmented-control:change', { value });
    }
  }
}
