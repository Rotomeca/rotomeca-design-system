import { Define } from '../../../core/scripts/decorators';
import { TAG_SWITCH } from '../../../core/scripts/utils/tags';
import { BaseFormElement } from '../../base/BaseFormElement';
import { RotomecaIcon } from '../icon/icon';
import style from './switch.less';

export { RotomecaSwitch };

const TEMPLATE = (
  <span class="root">
    <span class="track" part="track">
      <span class="thumb" part="thumb">
        <RotomecaIcon id="icon-on" name="check" />
        <RotomecaIcon id="icon-off" name="x" />
      </span>
    </span>
    <span class="label" part="label">
      <slot></slot>
    </span>
  </span>
);

/**
 * Interrupteur on/off (rôle `switch`), associé aux formulaires.
 *
 * @remarks
 * Un réglage qui prend effet immédiatement (notifications, mode sombre). Si le choix n'est appliqué
 * qu'à la validation d'un formulaire, préférer `rds-checkbox` ou des `rds-radio`.
 * Le libellé décrit l'option activée, sans « Activer… ». Clavier : Espace ou Entrée.
 *
 * | Attribut | Rôle |
 * | --- | --- |
 * | `checked` | État initial (restauré par `reset`). |
 * | `value` | Valeur soumise quand activé (défaut `on`). |
 * | `icons` | Coche dans le pouce activé, croix dans le pouce désactivé. |
 * | `label-position="start"` | Libellé à gauche. |
 * | `disabled`, `required` | Comme un contrôle natif. |
 *
 * Animation : le pouce glisse (`translateX`) et grandit de 16 à 24 px, s'étire à la pression ;
 * l'icône apparaît en tournant ; la piste passe à la couleur « coché ».
 *
 * @slot - Libellé.
 * @csspart track - La piste.
 * @csspart thumb - Le pouce.
 * @csspart label - Libellé.
 *
 * @fires input - Interrupteur basculé par l'utilisateur.
 * @fires change - Interrupteur basculé par l'utilisateur.
 * @fires {CustomEvent<{checked: boolean}>} rds-switch:change - Interrupteur basculé par l'utilisateur.
 *
 * @cssstate checked - Activé.
 * @cssstate disabled - Désactivé.
 *
 * @example
 * ```html
 * <rds-switch name="notifications" checked>Notifications</rds-switch>
 * ```
 */
@Define({ tag: TAG_SWITCH, template: TEMPLATE, styles: style })
class RotomecaSwitch extends BaseFormElement {
  static observedAttributes: string[] = [
    ...BaseFormElement.observedAttributes,
    'checked',
    'value',
    'icons',
  ];

  #_checked = false;
  #_initial = false;

  /** `true` si l'interrupteur est activé. */
  get checked(): boolean {
    return this.#_checked;
  }
  set checked(value: boolean) {
    this.#_set(!!value, false);
  }

  /** Valeur soumise quand l'interrupteur est activé. */
  get value(): string {
    return this.getAttribute('value') ?? 'on';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  /**
   * Bascule l'interrupteur (sans événement utilisateur).
   *
   * @param force - État imposé ; inverse l'état courant si omis.
   */
  toggle(force?: boolean): void {
    this.#_set(force === undefined ? !this.#_checked : !!force, false);
  }

  protected build(): void {
    this.internals.role = 'switch';
    this.#_initial = this.hasAttribute('checked');
    this.#_checked = this.#_initial;
  }

  protected onConnect(): void {
    this.resources.listen(this, 'click', () => {
      if (!this.effectivelyDisabled) this.#_set(!this.#_checked, true);
    });
    this.resources.listen(this, 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        if (!this.effectivelyDisabled) this.#_set(!this.#_checked, true);
      }
    });
  }

  protected attributeChanged(name: string, _old: string | null, value: string | null): void {
    if (name === 'checked') {
      this.#_initial = value !== null;
      this.#_set(value !== null, false);
    }
  }

  protected update(): void {
    const disabled = this.effectivelyDisabled;
    if (disabled) this.internals.states.add('disabled');
    else this.internals.states.delete('disabled');
    if (this.#_checked) this.internals.states.add('checked');
    else this.internals.states.delete('checked');
    this.internals.ariaChecked = String(this.#_checked);
    this.internals.ariaDisabled = String(disabled);
    this.tabIndex = disabled ? -1 : 0;
    this.setFormValue(this.#_checked ? this.value : null);
    if (this.required && !this.#_checked) {
      this.setValidity({ valueMissing: true }, 'Veuillez activer cette option.');
    } else this.setValidity();
  }

  protected onFormReset(): void {
    this.#_checked = this.#_initial;
  }

  protected onFormRestore(state: string | File | FormData): void {
    this.#_checked = state === this.value;
  }

  #_set(on: boolean, notify: boolean): void {
    if (on === this.#_checked) return;
    this.#_checked = on;
    void this.requestUpdate('checked-state');
    if (notify) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
      this.emit('rds-switch:change', { checked: on });
    }
  }
}
