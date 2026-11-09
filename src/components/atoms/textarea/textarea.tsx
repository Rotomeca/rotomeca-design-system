import { Define } from '../../../core/scripts/decorators';
import { TAG_TEXTAREA } from '../../../core/scripts/utils/tags';
import { BaseFieldElement } from '../../base/BaseFieldElement';
import { FieldMessages } from '../../base/FieldMessages';
import style from './textarea.less';

export { RotomecaTextarea };

/** Attributs recopiés tels quels sur le `<textarea>` interne. */
const SYNCED_ATTRIBUTES = ['minlength', 'maxlength', 'spellcheck', 'autocomplete'] as const;

const TEMPLATE = (
  <div class="container">
    <div class="addon__inner">
      <textarea id="input" class="input-like" part="textarea"></textarea>
      <label for="input" class="floating-label">
        <slot id="label-slot"></slot>
      </label>
      <span class="counter" id="counter" aria-live="polite"></span>
    </div>
    <FieldMessages />
  </div>
);

/**
 * Zone de texte multiligne : libellé flottant, hauteur qui suit le contenu, compteur de caractères.
 *
 * @remarks
 * Mêmes briques que `rds-input` (anneau animé, messages `rds-message`, validation différée).
 * La hauteur automatique utilise `field-sizing: content` (navigateurs récents ; ailleurs, poignée manuelle).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `value`, `placeholder`, `required`, `disabled`, `readonly` | comme `<textarea>` | |
 * | `rows` | nombre (3) | Hauteur minimale en lignes. |
 * | `max-rows` | nombre | Hauteur maximale avant défilement. |
 * | `maxlength` / `minlength` | nombre | `maxlength` affiche le compteur « 12 / 200 » (rouge à la limite). |
 * | `resize` | `none` | Désactive la poignée de redimensionnement. |
 * | `state` | `success` · `error` | État forcé. |
 *
 * @slot - Libellé flottant.
 * @slot hint - Indice d'utilisation.
 * @slot success - Message de succès.
 * @slot error - Message d'erreur.
 *
 * @csspart textarea - Le `<textarea>` natif.
 *
 * @fires input - Saisie (événement natif, composé).
 * @fires change - Valeur validée.
 * @fires {CustomEvent<{value: string}>} rds-textarea:value - Valeur modifiée par la saisie.
 *
 * @cssstate value - Le champ contient une valeur.
 * @cssstate has-label - Un libellé est fourni.
 * @cssstate has-counter - Le compteur est affiché (`maxlength`).
 * @cssstate over - La limite `maxlength` est atteinte.
 * @cssstate success - Message de succès affiché.
 * @cssstate error - Message d'erreur affiché.
 * @cssstate disabled - Champ désactivé.
 *
 * @example
 * ```html
 * <rds-textarea name="desc" maxlength="200">
 *   Description <span slot="hint">Visible dans la galerie</span>
 * </rds-textarea>
 * ```
 */
@Define({ tag: TAG_TEXTAREA, template: TEMPLATE, styles: style })
class RotomecaTextarea extends BaseFieldElement {
  static upgradeProperties = ['value'];
  static observedAttributes: string[] = [
    ...BaseFieldElement.observedAttributes,
    'value',
    'placeholder',
    'readonly',
    'state',
    'rows',
    'max-rows',
    ...SYNCED_ATTRIBUTES,
  ];

  /** Valeur initiale, restaurée par `reset`. */
  #_initial = '';
  /** `true` dès que la valeur a été modifiée. */
  #_dirty = false;

  /** Valeur courante. */
  get value(): string {
    return this.query<HTMLTextAreaElement>('#input')?.value ?? this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    const control = this.query<HTMLTextAreaElement>('#input');
    if (!control) {
      this.setAttribute('value', value ?? '');
      return;
    }
    control.value = value ?? '';
    this.#_dirty = true;
    this.#_after();
  }

  /** Texte indicatif. */
  get placeholder(): string {
    return this.stringAttribute('placeholder');
  }
  set placeholder(value: string) {
    this.setStringAttribute('placeholder', value);
  }

  /** Lecture seule. */
  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }
  set readOnly(value: boolean) {
    this.setBooleanAttribute('readonly', value);
  }

  protected get control(): HTMLTextAreaElement {
    return this.require<HTMLTextAreaElement>('#input');
  }

  protected build(): void {
    this.#_initial = this.getAttribute('value') ?? '';
    this.control.value = this.#_initial;
    this.setFormValue(this.control.value);
  }

  protected onConnect(): void {
    super.onConnect();
    const control = this.control;
    this.resources.listen(control, 'input', () => {
      this.#_dirty = true;
      this.#_after(true);
    });
    this.resources.listen(control, 'change', () => {
      this.touched = true;
      this.#_after();
      // `change` n'est pas composé : on le relaie depuis l'hôte.
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.resources.listen(control, 'blur', () => {
      this.touched = true;
      this.#_after();
    });
  }

  protected update(): void {
    const control = this.control;
    control.placeholder = this.stringAttribute('placeholder');
    control.disabled = this.effectivelyDisabled;
    control.readOnly = this.hasAttribute('readonly');
    control.required = this.required;
    for (const name of SYNCED_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value === null) control.removeAttribute(name);
      else control.setAttribute(name, value);
    }
    this.setCSSProperty('--_rows', String(Number(this.getAttribute('rows')) || 3));
    const max = this.getAttribute('max-rows');
    this.setCSSProperty('--_max', max ? `calc(${Number(max)} * 1.5rem + 2.25rem)` : null);
    this.setState('disabled', control.disabled);
    this.#_after();
  }

  protected attributeChanged(name: string, _old: string | null, value: string | null): void {
    // Comme un `<textarea>` natif : `value` n'est qu'une valeur par défaut tant qu'il n'est pas modifié.
    if (name === 'value' && !this.#_dirty) {
      this.#_initial = value ?? '';
      this.control.value = this.#_initial;
      this.#_after();
    }
  }

  protected slotChanged(): void {
    this.syncLabelStates();
    this.syncStates();
  }

  protected onFormReset(): void {
    this.control.value = this.#_initial;
    this.#_dirty = false;
    this.touched = false;
    this.#_after();
  }

  protected onFormRestore(state: string | File | FormData): void {
    this.control.value = typeof state === 'string' ? state : '';
    this.#_dirty = true;
    this.#_after();
  }

  /** Sélectionne le contenu du champ. */
  select(): void {
    this.control.select();
  }

  #_after(notify = false): void {
    const control = this.control;
    this.setFormValue(control.value);
    this.setState('value', control.value !== '');
    const max = Number(this.getAttribute('maxlength')) || 0;
    this.setState('has-counter', max > 0);
    this.setState('over', max > 0 && control.value.length >= max);
    this.require('#counter').textContent = max ? `${control.value.length} / ${max}` : '';
    this.syncStates();
    this.syncLabelStates();
    if (notify) this.emit('rds-textarea:value', { value: control.value });
  }
}
