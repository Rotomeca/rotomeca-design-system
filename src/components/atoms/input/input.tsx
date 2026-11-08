import { Define } from '../../../core/scripts/decorators';
import { TAG_INPUT } from '../../../core/scripts/utils/tags';
import { BaseFormElement } from '../../base/BaseFormElement';
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

const TEXT_VALID = 'Le champ est valide.';
const TEXT_INVALID = 'Le champ est invalide.';
const TEXT_ERROR = 'Ce champ contient une erreur.';

const ICON_SUCCESS = 'circle-check';
const ICON_ERROR = 'circle-x';

const SLOT_HINT = 'hint';
const SLOT_BUTTON = 'button';
const SLOT_SUCCESS = 'success';
const SLOT_ERROR = 'error';

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
] as const;

const TEMPLATE = (
  <RotomecaFragment>
    <label id="label" for="input" class="label-container">
      <span class="label-container--label">
        <slot id="label-slot"></slot>
      </span>
      <span class="label-container--hint">
        <slot id="hint-slot" name="hint"></slot>
      </span>
    </label>
    <div class="container">
      <div class="addons">
        <div class="addon__inner">
          <input id="input" class="input-like" type="text" part="input" />
          <RotomecaIcon id="input__icon" />
          <output id="output" for="input"></output>
        </div>
        <RotomecaButton id="input__button" variant="primary" disabled>
          <slot id="button-slot" name="button"></slot>
        </RotomecaButton>
      </div>
      <div id="state" class="state" part="state-container" aria-live="polite">
        <RotomecaIcon id="state__icon" />
        <span id="success-text" class="state__text success">
          <slot name="success">
            <span id="success-fallback">{TEXT_VALID}</span>
          </slot>
        </span>
        <span id="error-text" class="state__text error">
          <slot name="error">
            <span id="error-fallback">{TEXT_INVALID}</span>
          </slot>
        </span>
      </div>
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
 * @csspart state-container - Zone du message de validation.
 *
 * @fires input - Saisie (événement natif, composé).
 * @fires change - Valeur validée.
 * @fires {CustomEvent<{innerEvent: Event}>} rds-input:button-click - Clic sur le bouton interne.
 *
 * @cssstate value - Le champ contient une valeur.
 * @cssstate have-icon - Une icône est affichée.
 * @cssstate have-button - Un bouton interne est affiché.
 * @cssstate obi - Le bouton interne n'a qu'une icône.
 * @cssstate success - Message de succès affiché.
 * @cssstate error - Message d'erreur affiché.
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
class RotomecaInput extends BaseFormElement {
  /** Type imposé par une variante (`null` : l'attribut `type` est utilisé). */
  static inputType: string | null = null;
  /** Icône affichée par défaut dans le champ (vide : aucune). */
  static defaultIcon = '';

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = [
    ...BaseFormElement.observedAttributes,
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
  /** `true` après une interaction : autorise l'affichage des erreurs natives. */
  #_touched = false;

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
    const input = this.#_input;

    this.resources.listen(input, 'input', () => {
      this.#_dirty = true;
      this.#_afterValueChange();
    });
    this.resources.listen(input, 'change', () => {
      this.#_touched = true;
      this.#_afterValueChange();
      // `change` n'est pas composé : on le relaie depuis l'hôte.
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
    this.resources.listen(input, 'focusout', () => {
      this.#_touched = true;
      this.#_syncValidity();
    });
    // Soumission d'un formulaire invalide : le navigateur notifie l'hôte.
    this.resources.listen(this, 'invalid', () => {
      this.#_touched = true;
      this.#_syncValidity();
    });
    this.resources.listen(this.#_button, 'click', (event) => {
      this.emit('rds-input:button-click', { innerEvent: event });
      this.onButtonClick(event);
    });
  }

  protected update(): void {
    const input = this.#_input;

    input.type = this.resolveType();
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
    this.#_setState('disabled', input.disabled);

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
    if (slot.id === 'label-slot' || slot.id === 'hint-slot') {
      this.#_setState('has-label', this.#_hasSlotted('label-slot') || this.#_hasSlotted('hint-slot'));
      this.#_setState('has-hint', this.#_hasSlotted('hint-slot'));
    } else if (slot.id === 'button-slot') {
      void this.requestUpdate('button-slot');
    } else {
      this.#_syncValidity();
    }
  }

  protected onFormReset(): void {
    this.#_input.value = this.#_initial;
    this.#_dirty = false;
    this.#_touched = false;
    this.#_afterValueChange(false);
  }

  protected onFormRestore(state: string | File | FormData): void {
    this.#_input.value = typeof state === 'string' ? state : '';
    this.#_dirty = true;
    this.#_afterValueChange(false);
  }

  protected beforeValidate(): void {
    this.#_touched = true;
    this.#_syncValidity();
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
    if (text !== undefined) this.#_setSlotText(SLOT_BUTTON, text);
    if (icon !== undefined) this.setAttribute('button-icon', icon);
    if (label !== undefined) this.setAttribute('button-label', label);
    return this;
  }

  /** Active un bouton interne qui ne contient qu'une icône. */
  enableButtonIconOnly(icon: string, label: string): this {
    this.#_setSlotText(SLOT_BUTTON, null);
    this.setAttribute('button', '');
    this.setAttribute('button-icon', icon);
    this.setAttribute('button-label', label);
    return this;
  }

  /** Masque le bouton interne. */
  hideButton(): this {
    this.#_setSlotText(SLOT_BUTTON, null);
    for (const name of ['button', 'button-icon', 'button-label']) this.removeAttribute(name);
    return this;
  }

  /** Passe le champ en succès, avec un message optionnel. */
  setSuccessState(message?: string): this {
    return this.#_forceState('success', SLOT_SUCCESS, message);
  }

  /** Passe le champ en erreur, avec un message optionnel. */
  setErrorState(message?: string): this {
    return this.#_forceState('error', SLOT_ERROR, message);
  }

  /** Retire l'état forcé (succès ou erreur) et ses messages. */
  clearState(): this {
    this.removeAttribute('state');
    this.#_setSlotText(SLOT_SUCCESS, null);
    this.#_setSlotText(SLOT_ERROR, null);
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

  /** Définit l'indice d'utilisation. */
  setHint(hint: string): this {
    return this.#_setSlotText(SLOT_HINT, hint);
  }

  /** Retire l'indice d'utilisation. */
  removeHint(): this {
    return this.#_setSlotText(SLOT_HINT, null);
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

  #_setState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }

  #_hasSlotted(slotId: string): boolean {
    const slot = this.query<HTMLSlotElement>(`#${slotId}`);
    return (
      slot
        ?.assignedNodes()
        .some((node) => node.nodeType === Node.ELEMENT_NODE || !!node.textContent?.trim()) ?? false
    );
  }

  /** Remplace (ou supprime si `text` est `null`) le contenu d'un slot nommé. */
  #_setSlotText(name: string, text: string | null): this {
    for (const child of [...this.children]) {
      if (child.getAttribute('slot') === name) child.remove();
    }
    if (text) {
      const span = document.createElement('span');
      span.slot = name;
      span.textContent = text;
      this.append(span);
    }
    return this;
  }

  #_forceState(state: InputState, slot: string, message?: string): this {
    this.setAttribute('state', state);
    if (message) this.#_setSlotText(slot, message);
    return this;
  }

  #_afterValueChange(requestUpdate = true): void {
    const input = this.#_input;
    this.setFormValue(input.value);
    this.#_setState('value', input.value !== '');
    this.#_syncOutput();
    this.#_syncValidity();
    if (requestUpdate) void this.requestUpdate('value');
  }

  #_syncIcon(): void {
    const name = this.getAttribute('icon') || this.resolveIcon();
    const icon = this.require<RotomecaIcon>('#input__icon');
    if (name) icon.setAttribute('name', name);
    else icon.removeAttribute('name');
    this.#_setState('have-icon', !!name);
  }

  #_syncButton(): void {
    const explicit = this.hasAttribute('button') || this.hasAttribute('button-icon');
    const fallback = explicit ? null : this.resolveButton();
    const enabled = explicit || fallback !== null;

    const button = this.#_button;
    const icon = this.getAttribute('button-icon') ?? fallback?.icon ?? '';
    const label = this.getAttribute('button-label') ?? fallback?.label ?? '';
    const requested = this.getAttribute('button') ?? fallback?.variant ?? '';
    const variant = BUTTON_VARIANTS.includes(requested) ? requested : 'primary';

    button.setAttribute('variant', variant);
    if (icon) button.setAttribute('icon-before', icon);
    else button.removeAttribute('icon-before');
    if (label) button.setAttribute('label', label);
    else button.removeAttribute('label');
    button.disabled = !enabled || this.effectivelyDisabled || this.hasAttribute('readonly');

    this.#_setState('have-button', enabled);
    this.#_setState('button-flat', enabled && variant === 'tertiary');
    this.#_setState('obi', enabled && !!icon && !this.#_hasSlotted('button-slot'));
  }

  #_syncOutput(): void {
    const text = this.resolveOutput();
    const output = this.require<HTMLOutputElement>('#output');
    output.textContent = text ?? '';
    this.#_setState('has-output', text !== null);
  }

  /** Synchronise validité du formulaire, états visuels et attributs ARIA. */
  #_syncValidity(): void {
    const input = this.#_inputOrNull;
    if (!input) return;

    const forced = this.getAttribute('state');
    const nativeError = this.#_touched && !input.validity.valid;
    const isError = forced === 'error' || (forced !== 'success' && nativeError);
    const isSuccess = !isError && forced === 'success';

    const errorFallback = this.require('#error-fallback');
    errorFallback.textContent =
      forced === 'error'
        ? TEXT_ERROR
        : input.validationMessage || TEXT_INVALID;

    // Validité exposée au formulaire (indépendante de l'affichage différé).
    if (forced === 'error') {
      this.setValidity({ customError: true }, this.#_errorMessage(input), input);
    } else if (!input.validity.valid) {
      this.setValidity(flagsOf(input.validity), input.validationMessage, input);
    } else {
      this.setValidity();
    }

    this.#_setState('state', isError || isSuccess);
    this.#_setState('error', isError);
    this.#_setState('success', isSuccess);

    const stateIcon = this.require<RotomecaIcon>('#state__icon');
    if (isError) stateIcon.setAttribute('name', ICON_ERROR);
    else if (isSuccess) stateIcon.setAttribute('name', ICON_SUCCESS);
    else stateIcon.removeAttribute('name');

    if (isError || isSuccess) {
      input.setAttribute('aria-invalid', String(isError));
      input.setAttribute('aria-describedby', isError ? 'error-text' : 'success-text');
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  }

  #_errorMessage(input: HTMLInputElement): string {
    const slotted = this.assignedElements(SLOT_ERROR)[0]?.textContent?.trim();
    return slotted || input.validationMessage || TEXT_ERROR;
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
      success: SLOT_SUCCESS,
      error: SLOT_ERROR,
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

/** Copie une `ValidityState` (non itérable) en `ValidityStateFlags`. */
function flagsOf(validity: ValidityState): ValidityStateFlags {
  return {
    badInput: validity.badInput,
    customError: validity.customError,
    patternMismatch: validity.patternMismatch,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch,
    tooLong: validity.tooLong,
    tooShort: validity.tooShort,
    typeMismatch: validity.typeMismatch,
    valueMissing: validity.valueMissing,
  };
}
