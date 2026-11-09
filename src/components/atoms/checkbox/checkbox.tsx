import { Define } from '../../../core/scripts/decorators';
import { TAG_CHECKBOX } from '../../../core/scripts/utils/tags';
import { BaseFormElement } from '../../base/BaseFormElement';
import { hasContent } from '../../base/dom';
import style from './checkbox.less';

export { RotomecaCheckbox };

const TEMPLATE = (
  <span class="root">
    <span class="control" part="control">
      <span class="halo"></span>
      <span class="box">
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path id="check" d="M2 7.5 5.5 11 12 3.5"></path>
          <path id="dash" d="M2.5 7h9"></path>
        </svg>
      </span>
    </span>
    <span class="text">
      <span class="label" part="label">
        <slot></slot>
      </span>
      <span class="hint">
        <slot name="hint" id="hint"></slot>
      </span>
    </span>
  </span>
);

/**
 * Case à cocher associée aux formulaires, avec état indéterminé et coche dessinée.
 *
 * @remarks
 * Pour plusieurs cases liées, les grouper dans un `rds-fieldset`. Pour un réglage à effet immédiat,
 * préférer `rds-switch`. Rôle `checkbox` posé par `ElementInternals`. Clavier : Espace.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `checked` | booléen | État initial (restauré par `reset`). |
 * | `indeterminate` | booléen | État mixte ; propriété `indeterminate`. |
 * | `required` | booléen | Doit être cochée (`valueMissing`). |
 * | `disabled` | booléen | Désactivée. |
 * | `value` | texte (`on`) | Valeur soumise quand cochée. |
 * | `state` | `error` | Bordure d'erreur forcée. |
 *
 * Animation : la coche se dessine (`stroke-dashoffset`), fond en fondu, halo de survol / pression.
 *
 * @slot - Libellé.
 * @slot hint - Précision sous le libellé.
 * @csspart control - Zone de la case et de son halo.
 * @csspart label - Libellé.
 *
 * @fires input - Case modifiée par l'utilisateur.
 * @fires change - Case modifiée par l'utilisateur.
 *
 * @cssstate checked - Cochée.
 * @cssstate mixed - Indéterminée.
 * @cssstate disabled - Désactivée.
 * @cssstate error - Erreur affichée.
 * @cssstate has-hint - Une précision est fournie.
 *
 * @example
 * ```html
 * <rds-checkbox name="news" checked>
 *   Recevoir la lettre <span slot="hint">Une fois par mois.</span>
 * </rds-checkbox>
 * ```
 */
@Define({ tag: TAG_CHECKBOX, template: TEMPLATE, styles: style })
class RotomecaCheckbox extends BaseFormElement {
  static observedAttributes: string[] = [
    ...BaseFormElement.observedAttributes,
    'checked',
    'indeterminate',
    'value',
    'state',
  ];

  #_checked = false;
  #_initial = false;
  #_indeterminate = false;
  /** `true` après une interaction ou une validation : autorise l'affichage de l'erreur. */
  #_touched = false;

  /** `true` si la case est cochée. */
  get checked(): boolean {
    return this.#_checked;
  }
  set checked(value: boolean) {
    this.#_set(!!value, false);
  }

  /** `true` si la case est dans l'état mixte. */
  get indeterminate(): boolean {
    return this.#_indeterminate;
  }
  set indeterminate(value: boolean) {
    this.#_indeterminate = !!value;
    void this.requestUpdate('indeterminate');
  }

  /** Valeur soumise quand la case est cochée. */
  get value(): string {
    return this.getAttribute('value') ?? 'on';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  protected build(): void {
    this.internals.role = 'checkbox';
    this.#_initial = this.hasAttribute('checked');
    this.#_checked = this.#_initial;
    this.#_indeterminate = this.hasAttribute('indeterminate');
  }

  protected onConnect(): void {
    this.resources.listen(this, 'click', (event) => {
      // Un lien dans le libellé garde son comportement.
      if ((event.target as Element | null)?.closest?.('a')) return;
      this.#_toggle();
    });
    this.resources.listen(this, 'keydown', (event) => {
      if ((event as KeyboardEvent).key === ' ') {
        event.preventDefault();
        this.#_toggle();
      }
    });
  }

  protected attributeChanged(name: string, _old: string | null, value: string | null): void {
    if (name === 'checked') {
      this.#_initial = value !== null;
      this.#_set(value !== null, false);
    }
    if (name === 'indeterminate') this.#_indeterminate = value !== null;
  }

  protected slotChanged(): void {
    this.#_setState('has-hint', hasContent(this.query<HTMLSlotElement>('#hint')));
  }

  protected update(): void {
    const disabled = this.effectivelyDisabled;
    this.#_setState('disabled', disabled);
    this.#_setState('checked', this.#_checked && !this.#_indeterminate);
    this.#_setState('mixed', this.#_indeterminate);
    this.#_setState('has-hint', hasContent(this.query<HTMLSlotElement>('#hint')));
    this.internals.ariaChecked = this.#_indeterminate ? 'mixed' : String(this.#_checked);
    this.internals.ariaDisabled = String(disabled);
    this.internals.ariaRequired = String(this.required);
    this.tabIndex = disabled ? -1 : 0;
    this.setFormValue(this.#_checked ? this.value : null);

    const missing = this.required && !this.#_checked;
    if (missing) this.setValidity({ valueMissing: true }, 'Veuillez cocher cette case.');
    else this.setValidity();
    this.#_setState('error', this.getAttribute('state') === 'error' || (missing && this.#_touched));
  }

  protected beforeValidate(): void {
    this.#_touched = true;
    void this.requestUpdate('validate');
  }

  protected onFormReset(): void {
    this.#_checked = this.#_initial;
    this.#_touched = false;
  }

  protected onFormRestore(state: string | File | FormData): void {
    this.#_checked = state === this.value;
  }

  #_toggle(): void {
    if (this.effectivelyDisabled) return;
    this.#_indeterminate = false;
    this.#_set(!this.#_checked, true);
  }

  #_set(on: boolean, notify: boolean): void {
    if (on === this.#_checked && !notify) return;
    this.#_checked = on;
    void this.requestUpdate('checked-state');
    if (notify) {
      this.#_touched = true;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  #_setState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }
}
