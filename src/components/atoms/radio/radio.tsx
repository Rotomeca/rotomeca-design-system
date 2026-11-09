import { Define } from '../../../core/scripts/decorators';
import { TAG_RADIO } from '../../../core/scripts/utils/tags';
import { BaseFormElement } from '../../base/BaseFormElement';
import style from './radio.less';

export { RotomecaRadio };

const TEMPLATE = (
  <span class="root">
    <span class="control" part="control">
      <span class="halo"></span>
      <span class="ring">
        <span class="dot"></span>
      </span>
    </span>
    <span class="label" part="label">
      <slot></slot>
    </span>
  </span>
);

/** Déplacement des flèches dans le groupe. */
const ARROWS: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/**
 * Bouton radio associé aux formulaires.
 *
 * @remarks
 * Les radios de même `name` (même formulaire, même racine, Shadow DOM compris) forment un groupe :
 * un seul est coché, les flèches déplacent et cochent, la tabulation est itinérante (Tab entre dans
 * le groupe sur l'option cochée). Espace coche. Envelopper le groupe dans un élément
 * `role="radiogroup"` avec `aria-label` (ou un `<fieldset>` + `<legend>`).
 *
 * Validité : `valueMissing` si `required` et rien de coché dans le groupe.
 *
 * | Attribut | Rôle |
 * | --- | --- |
 * | `name`, `value` | Groupe et valeur soumise (`on` par défaut). |
 * | `checked` | État initial (restauré par `reset`). |
 * | `required`, `disabled` | Comme un contrôle natif. |
 *
 * Animation : le point central grandit de 0 à 1 ; halo au survol (8 %) et à la pression (12 %).
 *
 * @slot - Libellé.
 * @csspart control - Zone du radio et de son halo.
 * @csspart label - Libellé.
 *
 * @fires input - Radio coché par l'utilisateur.
 * @fires change - Radio coché par l'utilisateur.
 *
 * @cssstate checked - Coché.
 * @cssstate disabled - Désactivé.
 * @cssstate error - Aucune option cochée alors que le groupe est requis.
 *
 * @example
 * ```html
 * <div role="radiogroup" aria-label="Taille">
 *   <rds-radio name="taille" value="s">Petit</rds-radio>
 *   <rds-radio name="taille" value="m" checked>Moyen</rds-radio>
 * </div>
 * ```
 */
@Define({ tag: TAG_RADIO, template: TEMPLATE, styles: style })
class RotomecaRadio extends BaseFormElement {
  static observedAttributes: string[] = [...BaseFormElement.observedAttributes, 'checked', 'value'];

  #_checked = false;
  #_initial = false;
  /** `true` après une interaction ou une validation : autorise l'affichage de l'erreur. */
  #_touched = false;

  /** `true` si le radio est coché. */
  get checked(): boolean {
    return this.#_checked;
  }
  set checked(value: boolean) {
    this.#_setChecked(!!value, false);
  }

  /** Valeur soumise quand le radio est coché. */
  get value(): string {
    return this.getAttribute('value') ?? 'on';
  }
  set value(value: string) {
    this.setAttribute('value', value);
  }

  protected build(): void {
    this.internals.role = 'radio';
    this.#_initial = this.hasAttribute('checked');
    this.#_checked = this.#_initial;
  }

  protected onConnect(): void {
    this.resources.listen(this, 'click', () => this.#_select());
    this.resources.listen(this, 'keydown', (event) => this.#_onKey(event as KeyboardEvent));
    // Les autres radios du groupe ne sont pas forcément encore là : on resynchronise ensuite.
    queueMicrotask(() => this.#_syncGroup());
  }

  protected attributeChanged(name: string, _old: string | null, value: string | null): void {
    if (name === 'checked') {
      this.#_initial = value !== null;
      this.#_setChecked(value !== null, false);
    }
  }

  protected update(): void {
    const disabled = this.effectivelyDisabled;
    this.#_setState('disabled', disabled);
    this.#_setState('checked', this.#_checked);
    this.internals.ariaChecked = String(this.#_checked);
    this.internals.ariaDisabled = String(disabled);
    this.internals.ariaRequired = String(this.required);
    this.setFormValue(this.#_checked ? this.value : null);
    this.#_syncValidity();
    this.#_syncTabIndex();
  }

  protected beforeValidate(): void {
    this.#_touched = true;
    this.#_syncGroup();
  }

  protected onFormReset(): void {
    this.#_checked = this.#_initial;
    this.#_touched = false;
    this.#_syncGroup();
  }

  protected onFormRestore(state: string | File | FormData): void {
    this.#_checked = state === this.value;
    this.#_syncGroup();
  }

  /** Radios du même groupe (même `name`, même racine, même formulaire), l'élément compris. */
  #_group(): RotomecaRadio[] {
    const name = this.name;
    if (!name) return [this];
    const root = this.getRootNode() as Document | ShadowRoot;
    return [...root.querySelectorAll<RotomecaRadio>(TAG_RADIO)].filter(
      (radio) => radio.name === name && radio.form === this.form,
    );
  }

  #_setChecked(on: boolean, notify: boolean): void {
    if (on === this.#_checked) return;
    this.#_checked = on;
    if (on) {
      for (const radio of this.#_group()) {
        if (radio !== this && radio.checked) radio.#_setChecked(false, false);
      }
    }
    this.#_syncGroup();
    if (notify) {
      this.#_touched = true;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  #_syncGroup(): void {
    for (const radio of this.#_group()) void radio.requestUpdate('group');
  }

  #_select(): void {
    if (this.effectivelyDisabled || this.#_checked) return;
    this.#_setChecked(true, true);
  }

  #_onKey(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
      this.#_select();
      return;
    }
    const direction = ARROWS[event.key];
    if (!direction) return;
    event.preventDefault();
    const enabled = this.#_group().filter((radio) => !radio.effectivelyDisabled);
    const index = enabled.indexOf(this);
    const next = enabled[(index + direction + enabled.length) % enabled.length];
    if (next && next !== this) {
      next.focus();
      next.#_setChecked(true, true);
    }
  }

  /** Tabulation itinérante : seul le radio coché (ou le premier) est dans l'ordre de tabulation. */
  #_syncTabIndex(): void {
    const group = this.#_group().filter((radio) => !radio.effectivelyDisabled);
    const focusable = group.find((radio) => radio.checked) ?? group[0];
    this.tabIndex = this.effectivelyDisabled ? -1 : focusable === this ? 0 : -1;
  }

  #_syncValidity(): void {
    const missing = this.required && !this.#_group().some((radio) => radio.checked);
    if (missing) this.setValidity({ valueMissing: true }, 'Veuillez sélectionner une option.');
    else this.setValidity();
    this.#_setState('error', missing && this.#_touched);
  }

  #_setState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }
}
