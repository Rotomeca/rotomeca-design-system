import { Define } from '../../../core/scripts/decorators';
import { TAG_SELECT } from '../../../core/scripts/utils/tags';
import { BaseFieldElement } from '../../base/BaseFieldElement';
import { FieldMessages } from '../../base/FieldMessages';
import { hasContent } from '../../base/dom';
import { RotomecaIcon } from '../icon/icon';
import style from './select.less';

export { RotomecaSelect };

const TEMPLATE = (
  <div class="container">
    <div class="addon__inner">
      <select id="select" class="input-like" part="select"></select>
      <label for="select" class="floating-label">
        <slot name="label" id="label-slot"></slot>
        <span id="label-attr"></span>
      </label>
      <RotomecaIcon class="chevron" name="chevron-down" />
    </div>
    <slot id="options" hidden></slot>
    <FieldMessages />
  </div>
);

/** Enfants directs recopiés dans le `<select>` interne. */
const OPTION_TAGS = ['option', 'optgroup', 'hr'];

/**
 * Liste déroulante : `<select>` natif (accessible, adapté au mobile) habillé comme les champs.
 *
 * @remarks
 * Un slot ne pouvant pas alimenter un `<select>`, les `<option>` / `<optgroup>` du light DOM sont
 * **clonées** dans le `<select>` interne et resynchronisées à chaque mutation. La liste devient stylée
 * et animée là où `appearance: base-select` existe (amélioration progressive).
 *
 * | Attribut | Rôle |
 * | --- | --- |
 * | `label` | Libellé flottant (ou slot `label`). |
 * | `placeholder` | Option vide initiale ; non sélectionnable si `required`. |
 * | `required`, `disabled` | Comme `<select>`. |
 * | `state` | `success` · `error` : état forcé. |
 * | `<option selected>` | Valeur initiale (restaurée par `reset`). |
 *
 * @slot - Les `<option>` / `<optgroup>` (recopiées, jamais affichées telles quelles).
 * @slot label - Libellé flottant.
 * @slot hint - Indice d'utilisation.
 * @slot success - Message de succès.
 * @slot error - Message d'erreur.
 *
 * @csspart select - Le `<select>` natif.
 *
 * @fires change - Valeur validée.
 * @fires {CustomEvent<{value: string}>} rds-select:change - Choix modifié.
 *
 * @cssstate open - La liste est ouverte.
 * @cssstate empty-choice - Le placeholder est sélectionné.
 * @cssstate has-label - Un libellé est fourni.
 * @cssstate success - Message de succès affiché.
 * @cssstate error - Message d'erreur affiché.
 *
 * @example
 * ```html
 * <rds-select name="saison" label="Saison" placeholder="Choisir">
 *   <option value="automne">Automne</option>
 *   <option value="hiver">Hiver</option>
 * </rds-select>
 * ```
 */
@Define({ tag: TAG_SELECT, template: TEMPLATE, styles: style })
class RotomecaSelect extends BaseFieldElement {
  static observedAttributes: string[] = [
    ...BaseFieldElement.observedAttributes,
    'label',
    'placeholder',
    'state',
  ];

  /** Valeur initiale (`null` tant que les options n'ont pas été recopiées). */
  #_initial: string | null = null;

  /** Valeur de l'option choisie. */
  get value(): string {
    return this.query<HTMLSelectElement>('#select')?.value ?? '';
  }
  set value(value: string) {
    this.control.value = value;
    this.#_afterChange(false);
  }

  /** Index de l'option choisie (`-1` si aucune). */
  get selectedIndex(): number {
    return this.control.selectedIndex;
  }

  /** Options du `<select>` interne. */
  get options(): HTMLOptionsCollection {
    return this.control.options;
  }

  protected get control(): HTMLSelectElement {
    return this.require<HTMLSelectElement>('#select');
  }

  protected onConnect(): void {
    super.onConnect();
    const select = this.control;
    // `attributeFilter` : sans lui, ce que le composant pose sur l'hôte le relancerait en boucle.
    this.observeMutations(this, () => this.#_syncOptions(), {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'selected', 'disabled', 'label'],
    });
    this.#_syncOptions();

    this.resources.listen(select, 'change', () => {
      this.touched = true;
      this.setState('open', false);
      this.#_afterChange(true);
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.resources.listen(select, 'input', () => this.#_afterChange(false));
    this.resources.listen(select, 'blur', () => {
      this.touched = true;
      this.setState('open', false);
      this.#_afterChange(false);
    });
    // Rotation du chevron : `:open` si supporté, sinon approximation souris / clavier.
    this.resources.listen(select, 'pointerdown', () =>
      this.setState('open', !this.internals.states.has('open')),
    );
    this.resources.listen(select, 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      const altKey = (event as KeyboardEvent).altKey;
      if ([' ', 'Enter', 'ArrowDown', 'ArrowUp'].includes(key) && (altKey || key === ' ' || key === 'Enter'))
        this.setState('open', true);
      if (key === 'Escape' || key === 'Tab') this.setState('open', false);
    });
  }

  protected update(): void {
    const select = this.control;
    select.disabled = this.effectivelyDisabled;
    select.required = this.required;
    this.setState('disabled', select.disabled);
    this.require('#label-attr').textContent = hasContent(
      this.query<HTMLSlotElement>('#label-slot'),
    )
      ? ''
      : this.getAttribute('label') || '';
    this.#_syncOptions();
  }

  protected slotChanged(): void {
    this.syncLabelStates();
  }

  protected syncLabelStates(): void {
    super.syncLabelStates();
    if (this.getAttribute('label')) this.setState('has-label', true);
  }

  protected onFormReset(): void {
    this.control.value = this.#_initial ?? '';
    this.touched = false;
    this.#_afterChange(false);
  }

  protected onFormRestore(state: string | File | FormData): void {
    if (typeof state === 'string') this.control.value = state;
    this.#_afterChange(false);
  }

  /** Recopie les options du light DOM dans le `<select>` interne en conservant le choix courant. */
  #_syncOptions(): void {
    const select = this.query<HTMLSelectElement>('#select');
    if (!select) return;
    const previous = select.value;
    const fragment = document.createDocumentFragment();
    const placeholder = this.getAttribute('placeholder');
    if (placeholder !== null) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder;
      option.disabled = this.required;
      fragment.append(option);
    }
    for (const child of this.children) {
      if (OPTION_TAGS.includes(child.localName)) fragment.append(child.cloneNode(true));
    }
    select.replaceChildren(fragment);

    const selected = [...this.querySelectorAll('option')].find((o) => o.hasAttribute('selected'));
    if (this.#_initial === null) {
      this.#_initial = selected ? selected.value : placeholder !== null ? '' : select.value;
    }
    if (previous && [...select.options].some((o) => o.value === previous)) select.value = previous;
    else if (selected) select.value = selected.value;
    else if (placeholder !== null) select.value = '';
    this.#_afterChange(false);
  }

  #_afterChange(notify: boolean): void {
    const select = this.control;
    this.setFormValue(select.value);
    this.setState('value', true);
    this.setState('placeholder', true);
    this.setState('empty-choice', select.value === '' && this.hasAttribute('placeholder'));
    this.syncStates();
    this.syncLabelStates();
    if (notify) this.emit('rds-select:change', { value: select.value });
  }
}
