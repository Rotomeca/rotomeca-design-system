import { Define } from '../../../core/scripts/decorators';
import { TAG_INPUT } from '../../../core/scripts/utils/tags';
import { BaseFieldElement } from '../../base/BaseFieldElement';
import { FieldMessages } from '../../base/FieldMessages';
import { hasContent } from '../../base/dom';
import { RotomecaButton, type ButtonVariant } from '../button/button';
import { RotomecaFragment } from '../fragment/fragment';
import { RotomecaIcon } from '../icon/icon';
import style from './input.less';

export { RotomecaInput };
export type { InputButtonConfig, InputCreateOptions, InputState };

/** État de validation imposé par l'attribut `state`. */
type InputState = 'success' | 'error';

/** Configuration du bouton interne d'un champ. */
type InputButtonConfig = {
  /** Nom de l'icône Lucide. */
  icon: string;
  /** Nom accessible (indispensable pour un bouton icône seule). */
  label: string;
  variant?: ButtonVariant;
};

/** Options de {@link RotomecaInput.Create} : attributs HTML, plus les contenus de slots. */
type InputCreateOptions = {
  hint?: string;
  success?: string;
  error?: string;
  /** Texte du bouton interne. */
  buttonText?: string;
  [attribute: string]: string | undefined;
};

const SLOT_HINT = 'hint';
const SLOT_BUTTON = 'button';

const BUTTON_VARIANTS: readonly string[] = [
  'primary',
  'secondary',
  'tertiary',
  'warning',
  'danger',
  'success',
];

/** Attributs recopiés tels quels sur l'`<input>` interne. */
const SYNCED_ATTRIBUTES = [
  'pattern',
  'minlength',
  'maxlength',
  'autocomplete',
  'inputmode',
  'spellcheck',
  'min',
  'max',
  'step',
  'list',
] as const;

/** Types dont l'interface native est toujours visible : le label ne peut pas rester dans le champ. */
const ALWAYS_FLOAT_TYPES: readonly string[] = [
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'color',
  'range',
  'file',
];

// Angle animé de la bordure : une propriété personnalisée doit être enregistrée au niveau du
// document (un `@property` dans un Shadow DOM est ignoré). Sans support, la bordure reste statique.
try {
  CSS.registerProperty({
    name: '--rds-input-angle',
    syntax: '<angle>',
    inherits: false,
    initialValue: '0deg',
  });
} catch {
  // Déjà enregistrée, ou navigateur sans CSS.registerProperty.
}

const TEMPLATE = (
  <RotomecaFragment>
    <div class="container">
      <div class="addons">
        <div class="addon__inner">
          <input id="input" class="input-like" type="text" part="input" />
          <label id="label" for="input" class="floating-label">
            <slot id="label-slot"></slot>
          </label>
          <RotomecaIcon id="input__icon" class="trailing-icon" />
          <output id="output" for="input"></output>
        </div>
        <RotomecaButton id="input__button" variant="primary" disabled>
          <slot id="button-slot" name="button"></slot>
        </RotomecaButton>
      </div>
      <FieldMessages />
    </div>
  </RotomecaFragment>
);

/**
 * Champ de saisie du design system.
 *
 * @remarks
 * Un vrai `<input>` natif est rendu dans le Shadow DOM : le composant est associé aux formulaires
 * (valeur, validité, reset, restauration) et délègue le focus à cet input. Il accepte tous les `type`
 * natifs ; les composants `rds-input-*` en proposent des versions spécialisées.
 *
 * Les erreurs de validation native ne s'affichent qu'après une interaction (sortie du champ, saisie
 * ou tentative de soumission). L'attribut `state` (`success` | `error`) force un état.
 *
 * @slot - Libellé du champ.
 * @slot hint - Indice d'utilisation.
 * @slot success - Message de succès.
 * @slot error - Message d'erreur.
 * @slot button - Texte du bouton interne.
 *
 * @csspart input - L'`<input>` natif.
 *
 * @fires input - Saisie (événement natif, composé).
 * @fires change - Valeur validée.
 * @fires {CustomEvent<{value: string}>} rds-input:value - Valeur modifiée.
 * @fires {CustomEvent<{innerEvent: Event}>} rds-input:button-click - Clic sur le bouton interne.
 *
 * @cssstate value - Le champ contient une valeur.
 * @cssstate have-icon - Une icône est affichée.
 * @cssstate have-button - Un bouton interne est affiché.
 * @cssstate obi - Le bouton interne n'a qu'une icône.
 * @cssstate success - Message de succès affiché.
 * @cssstate error - Message d'erreur affiché.
 * @cssstate has-label - Un libellé est fourni (libellé flottant).
 * @cssstate button-inline - Bouton « en ligne » (variantes password / search).
 *
 * @example
 * ```html
 * <rds-input name="email" type="email" required icon="mail">
 *   Adresse e-mail
 *   <span slot="hint">Format : prenom@domaine.fr</span>
 * </rds-input>
 * ```
 */
@Define({ tag: TAG_INPUT, template: TEMPLATE, styles: style })
class RotomecaInput extends BaseFieldElement {
  /** Type imposé par une variante (`null` : l'attribut `type` est utilisé). */
  static inputType: string | null = null;
  /** Icône affichée par défaut dans le champ (vide : aucune). */
  static defaultIcon = '';

  static upgradeProperties = ['value'];
  static observedAttributes: string[] = [
    ...BaseFieldElement.observedAttributes,
    'aria-label',
    'type',
    'placeholder',
    'value',
    'readonly',
    'state',
    'icon',
    'button',
    'button-icon',
    'button-label',
    ...SYNCED_ATTRIBUTES,
  ];

  /** Valeur initiale, restaurée par `reset`. */
  #_initial = '';
  /** `true` dès que la valeur a été modifiée (saisie ou propriété `value`). */
  #_dirty = false;

  //#region Propriétés
  /** Valeur courante. */
  get value(): string {
    return this.#_inputOrNull?.value ?? this.getAttribute('value') ?? '';
  }
  set value(value: string) {
    const input = this.#_inputOrNull;
    if (!input) {
      this.setAttribute('value', value);
      return;
    }
    input.value = String(value);
    this.#_dirty = true;
    this.#_afterValueChange();
  }

  /** Valeur numérique (`NaN` si le type n'est pas numérique ou si la valeur est vide). */
  get valueAsNumber(): number {
    return this.#_inputOrNull?.valueAsNumber ?? Number.NaN;
  }
  set valueAsNumber(value: number) {
    const input = this.#_inputOrNull;
    if (!input) return;
    input.valueAsNumber = value;
    this.#_dirty = true;
    this.#_afterValueChange();
  }

  /** Valeur en date (`null` si le type n'est pas une date ou si la valeur est vide). */
  get valueAsDate(): Date | null {
    return this.#_inputOrNull?.valueAsDate ?? null;
  }
  set valueAsDate(value: Date | null) {
    const input = this.#_inputOrNull;
    if (!input) return;
    input.valueAsDate = value;
    this.#_dirty = true;
    this.#_afterValueChange();
  }

  /** Type effectif de l'input interne. */
  get type(): string {
    return this.resolveType();
  }
  set type(value: string) {
    this.setStringAttribute('type', value);
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

  /** `<input>` interne, pour les variantes. */
  protected get inputElement(): HTMLInputElement {
    return this.#_input;
  }

  protected get control(): HTMLInputElement {
    return this.#_input;
  }
  //#endregion

  //#region Points d'extension pour les variantes
  /** Type de l'input interne. */
  protected resolveType(): string {
    const locked = (this.constructor as typeof RotomecaInput).inputType;
    return locked ?? (this.stringAttribute('type') || 'text');
  }

  /** Icône du champ quand l'attribut `icon` est absent. */
  protected resolveIcon(): string {
    return (this.constructor as typeof RotomecaInput).defaultIcon;
  }

  /** Bouton interne quand ni `button` ni `button-icon` ne sont présents (`null` : aucun). */
  protected resolveButton(): InputButtonConfig | null {
    return null;
  }

  /** Texte affiché dans la sortie (`<output>`) du champ (`null` : masquée). */
  protected resolveOutput(): string | null {
    return null;
  }

  /** Ajuste l'input interne après chaque synchronisation (attributs par défaut d'une variante). */
  protected configureInput(_input: HTMLInputElement): void {}

  /** Appelé au clic sur le bouton interne. */
  protected onButtonClick(_event: Event): void {}

  /** Demande une resynchronisation complète (valeur, états, validité). */
  protected refreshInput(): void {
    this.#_afterValueChange(false);
  }
  //#endregion

  //#region Cycle de vie
  protected build(): void {
    this.#_initial = this.getAttribute('value') ?? '';
    this.#_input.value = this.#_initial;
    this.setFormValue(this.#_input.value);
  }

  protected onConnect(): void {
    super.onConnect();
    const input = this.#_input;

    this.resources.listen(input, 'input', () => {
      this.#_dirty = true;
      this.#_afterValueChange();
    });
    this.resources.listen(input, 'change', () => {
      this.touched = true;
      this.#_afterValueChange();
      // `change` n'est pas composé : on le relaie depuis l'hôte.
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.resources.listen(input, 'focusout', () => {
      this.touched = true;
      this.#_afterValueChange(false);
    });
    this.resources.listen(this.#_button, 'click', (event) => {
      this.emit('rds-input:button-click', { innerEvent: event });
      this.onButtonClick(event);
    });
  }

  protected update(): void {
    const input = this.#_input;

    input.type = this.resolveType();
    this.setState('always-float', ALWAYS_FLOAT_TYPES.includes(input.type));
    input.placeholder = this.stringAttribute('placeholder');
    input.disabled = this.effectivelyDisabled;
    input.readOnly = this.hasAttribute('readonly');
    input.required = this.required;
    for (const name of SYNCED_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value === null) input.removeAttribute(name);
      else input.setAttribute(name, value);
    }
    const ariaLabel = this.getAttribute('aria-label');
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    else input.removeAttribute('aria-label');
    this.configureInput(input);
    this.setState('disabled', input.disabled);

    this.#_syncIcon();
    this.#_syncButton();
    this.#_syncOutput();
    this.#_afterValueChange(false);
  }

  protected attributeChanged(name: string, _old: string | null, value: string | null): void {
    // Comme un `<input>` natif : l'attribut `value` n'est qu'une valeur par défaut.
    if (name === 'value' && !this.#_dirty) {
      this.#_initial = value ?? '';
      this.#_input.value = this.#_initial;
      this.#_afterValueChange(false);
    }
  }

  protected slotChanged(slot: HTMLSlotElement): void {
    if (slot.id === 'button-slot') this.#_syncButton();
    this.syncLabelStates();
    this.syncStates();
  }

  protected onFormReset(): void {
    this.#_input.value = this.#_initial;
    this.#_dirty = false;
    this.touched = false;
    this.#_afterValueChange(false);
  }

  protected onFormRestore(state: string | File | FormData): void {
    this.#_input.value = typeof state === 'string' ? state : '';
    this.#_dirty = true;
    this.#_afterValueChange(false);
  }
  //#endregion

  //#region API publique
  /** Sélectionne le contenu du champ. */
  select(): void {
    this.#_input.select();
  }

  /**
   * Active le bouton interne.
   *
   * @param options - `text` (texte), `icon` (icône), `label` (nom accessible), `variation`.
   */
  enableButton({
    text,
    icon,
    label,
    variation = 'primary',
  }: { text?: string; icon?: string; label?: string; variation?: ButtonVariant } = {}): this {
    this.setAttribute('button', variation);
    if (text !== undefined) this.setSlotText(SLOT_BUTTON, text);
    if (icon !== undefined) this.setAttribute('button-icon', icon);
    if (label !== undefined) this.setAttribute('button-label', label);
    return this;
  }

  /** Active un bouton interne qui ne contient qu'une icône. */
  enableButtonIconOnly(icon: string, label: string): this {
    this.setSlotText(SLOT_BUTTON, null);
    this.setAttribute('button', '');
    this.setAttribute('button-icon', icon);
    this.setAttribute('button-label', label);
    return this;
  }

  /** Masque le bouton interne. */
  hideButton(): this {
    this.setSlotText(SLOT_BUTTON, null);
    for (const name of ['button', 'button-icon', 'button-label']) this.removeAttribute(name);
    return this;
  }

  /** Affiche une icône dans le champ. */
  setIcon(icon: string): this {
    this.setAttribute('icon', icon);
    return this;
  }

  /** Retire l'icône du champ. */
  removeIcon(): this {
    this.removeAttribute('icon');
    return this;
  }

  /** Définit le libellé (texte ou élément). */
  setLabel(label: string | Node): this {
    for (const node of [...this.childNodes]) {
      if (!(node instanceof Element) || !node.hasAttribute('slot')) node.remove();
    }
    this.prepend(label);
    return this;
  }
  //#endregion

  //#region Interne
  get #_input(): HTMLInputElement {
    return this.require<HTMLInputElement>('#input');
  }

  get #_inputOrNull(): HTMLInputElement | null {
    return this.query<HTMLInputElement>('#input');
  }

  get #_button(): RotomecaButton {
    return this.require<RotomecaButton>('#input__button');
  }

  #_afterValueChange(emit = true): void {
    const input = this.#_input;
    this.setFormValue(input.value);
    this.setState('value', input.value !== '');
    this.#_syncOutput();
    this.#_syncButton();
    this.syncStates();
    this.syncLabelStates();
    if (emit) this.emit('rds-input:value', { value: input.value });
  }

  #_syncIcon(): void {
    const name = this.getAttribute('icon') ?? this.resolveIcon();
    const icon = this.require<RotomecaIcon>('#input__icon');
    if (name) icon.setAttribute('name', name);
    else icon.removeAttribute('name');
    this.setState('have-icon', !!name);
  }

  #_syncButton(): void {
    const button = this.#_button;
    const requested = this.getAttribute('button');
    let config: InputButtonConfig | null;
    let inline = false;
    if (requested !== null || this.hasAttribute('button-icon')) {
      config = {
        variant: BUTTON_VARIANTS.includes(requested ?? '')
          ? (requested as ButtonVariant)
          : 'primary',
        icon: this.getAttribute('button-icon') ?? '',
        label: this.getAttribute('button-label') ?? '',
      };
    } else {
      config = this.resolveButton();
      inline = config !== null;
    }
    this.setState('have-button', config !== null);
    this.setState('button-inline', inline);
    if (!config) return;

    const variant = config.variant ?? 'primary';
    button.setAttribute('variant', variant);
    if (config.icon) button.setAttribute('icon-before', config.icon);
    else button.removeAttribute('icon-before');
    if (config.label) button.setAttribute('label', config.label);
    else button.removeAttribute('label');
    button.toggleAttribute('rounded', inline);
    button.setAttribute('size', inline ? 'sm' : 'md');
    button.disabled = this.effectivelyDisabled || this.hasAttribute('readonly');
    this.setState('button-flat', !inline && variant === 'tertiary');
    this.setState('obi', !hasContent(this.query<HTMLSlotElement>('#button-slot')) && !!config.icon);
  }

  #_syncOutput(): void {
    const text = this.resolveOutput();
    const output = this.require<HTMLOutputElement>('#output');
    output.textContent = text ?? '';
    this.setState('has-output', text !== null);
  }
  //#endregion

  /**
   * Crée un champ prêt à l'emploi.
   *
   * @param label - Libellé.
   * @param options - Attributs HTML, plus `hint`, `success`, `error` et `buttonText` (contenus de slots).
   */
  static Create<T extends RotomecaInput = RotomecaInput>(
    this: { tagName: string },
    label: string,
    options: InputCreateOptions = {},
  ): T {
    const slots: Record<string, string> = {
      hint: SLOT_HINT,
      success: 'success',
      error: 'error',
      buttonText: SLOT_BUTTON,
    };
    const element = document.createElement(this.tagName) as T;
    element.textContent = label;

    for (const [key, value] of Object.entries(options)) {
      if (value === undefined) continue;
      const slot = slots[key];
      if (slot) {
        const span = document.createElement('span');
        span.slot = slot;
        span.textContent = value;
        element.append(span);
      } else element.setAttribute(key, value);
    }
    return element;
  }
}
