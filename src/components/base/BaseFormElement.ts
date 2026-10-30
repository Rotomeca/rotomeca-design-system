import { BaseElement } from './BaseElement.js';

/** Valeur ou état acceptés par `ElementInternals.setFormValue`. */
export type FormValue = string | File | FormData | null;

/**
 * Base optionnelle pour un contrôle associé aux formulaires natifs.
 *
 * @remarks
 * La classe dérivée reste responsable de `value`, du reset, de la restauration,
 * du focus, du nom accessible et de la synchronisation de la validité.
 */
export abstract class BaseFormElement extends BaseElement {
  /** Déclare l'élément comme associé aux formulaires. */
  static formAssociated = true;
  /** Attributs observés par défaut : `disabled`, `name` et `required`. */
  static override observedAttributes = ['disabled', 'name', 'required'];

  /** Interface d'association au formulaire. */
  readonly #internals: ElementInternals;
  /** `true` si le formulaire (ex. un `fieldset` désactivé) a désactivé le contrôle. */
  #disabledByForm = false;

  /** Crée l'élément et attache ses `ElementInternals`. */
  constructor() {
    super();
    this.#internals = this.attachInternals();
  }

  /** `ElementInternals` de l'élément, pour les classes dérivées. */
  protected get internals(): ElementInternals {
    return this.#internals;
  }

  /** Formulaire associé, ou `null`. */
  get form(): HTMLFormElement | null {
    return this.#internals.form;
  }

  /** Libellés (`<label>`) associés au contrôle. */
  get labels(): NodeList {
    return this.#internals.labels;
  }

  /** État de validité du contrôle. */
  get validity(): ValidityState {
    return this.#internals.validity;
  }

  /** Message de validation courant. */
  get validationMessage(): string {
    return this.#internals.validationMessage;
  }

  /** `true` si le contrôle participe à la validation du formulaire. */
  get willValidate(): boolean {
    return this.#internals.willValidate;
  }

  /** Nom du contrôle, reflété sur l'attribut `name`. */
  get name(): string {
    return this.stringAttribute('name');
  }
  set name(value: string) {
    this.setStringAttribute('name', value);
  }

  /** État désactivé, reflété sur l'attribut `disabled`. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.setBooleanAttribute('disabled', value);
  }

  /** Caractère obligatoire, reflété sur l'attribut `required`. */
  get required(): boolean {
    return this.hasAttribute('required');
  }
  set required(value: boolean) {
    this.setBooleanAttribute('required', value);
  }

  /**
   * État désactivé effectif.
   *
   * @remarks
   * Inclut `disabled` hérité d'un `fieldset` ; ne pas refléter ce résultat sur l'attribut.
   */
  get effectivelyDisabled(): boolean {
    return this.disabled || this.#disabledByForm;
  }

  /**
   * Vérifie la validité du contrôle, sans afficher de message.
   *
   * @returns `true` si le contrôle est valide.
   */
  checkValidity(): boolean {
    this.beforeValidate();
    return this.#internals.checkValidity();
  }

  /**
   * Vérifie la validité du contrôle et affiche le message d'erreur le cas échéant.
   *
   * @returns `true` si le contrôle est valide.
   */
  reportValidity(): boolean {
    this.beforeValidate();
    return this.#internals.reportValidity();
  }

  /** Appelé avant chaque vérification de validité, pour synchroniser {@link BaseFormElement.setValidity}. */
  protected beforeValidate(): void {}

  /**
   * Définit la valeur soumise avec le formulaire.
   *
   * @param value - Valeur soumise.
   * @param state - État à restaurer ; la valeur est utilisée si omis.
   */
  protected setFormValue(value: FormValue, state?: FormValue): void {
    if (state === undefined) this.#internals.setFormValue(value);
    else this.#internals.setFormValue(value, state);
  }

  /**
   * Définit la validité du contrôle.
   *
   * @param flags - Drapeaux de validité (aucun : le contrôle est valide).
   * @param message - Message d'erreur, requis si un drapeau est levé.
   * @param anchor - Élément sur lequel ancrer la bulle de validation.
   */
  protected setValidity(flags: ValidityStateFlags = {}, message = '', anchor?: HTMLElement): void {
    this.#internals.setValidity(flags, message, anchor);
  }

  /**
   * Callback natif d'association à un formulaire.
   *
   * @param form - Nouveau formulaire, ou `null` s'il est dissocié.
   */
  formAssociatedCallback(form: HTMLFormElement | null): void {
    this.onFormAssociated(form);
  }

  /**
   * Callback natif de désactivation par le formulaire (ex. `fieldset`).
   *
   * @param disabled - `true` si le formulaire désactive le contrôle.
   */
  formDisabledCallback(disabled: boolean): void {
    this.#disabledByForm = disabled;
    this.onFormDisabled(disabled);
    void this.requestUpdate('form-disabled');
  }

  /** Callback natif de réinitialisation du formulaire. */
  formResetCallback(): void {
    this.onFormReset();
    void this.requestUpdate('form-reset');
  }

  /**
   * Callback natif de restauration de l'état (navigation ou saisie automatique).
   *
   * @param state - État à restaurer.
   * @param mode - Origine de la restauration.
   */
  formStateRestoreCallback(
    state: string | File | FormData,
    mode: 'restore' | 'autocomplete',
  ): void {
    this.onFormRestore(state, mode);
    void this.requestUpdate('form-restore');
  }

  /**
   * Appelé quand le contrôle est associé ou dissocié d'un formulaire.
   *
   * @param _form - Nouveau formulaire, ou `null`.
   */
  protected onFormAssociated(_form: HTMLFormElement | null): void {}

  /**
   * Appelé quand le formulaire désactive ou réactive le contrôle.
   *
   * @param _disabled - `true` si le contrôle est désactivé par le formulaire.
   */
  protected onFormDisabled(_disabled: boolean): void {}

  /** Rétablit la valeur initiale du contrôle. */
  protected abstract onFormReset(): void;

  /**
   * Restaure l'état du contrôle.
   *
   * @param state - État à restaurer.
   * @param mode - Origine de la restauration.
   */
  protected abstract onFormRestore(
    state: string | File | FormData,
    mode: 'restore' | 'autocomplete',
  ): void;
}
