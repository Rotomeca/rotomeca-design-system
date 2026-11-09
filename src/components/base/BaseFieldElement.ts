import { hasContent } from './dom';
import { BaseFormElement } from './BaseFormElement';

/** Contrôle natif interne d'un champ. */
type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Drapeaux de validité copiés d'une `ValidityState` (non itérable). */
const VALIDITY_KEYS = [
  'valueMissing',
  'typeMismatch',
  'patternMismatch',
  'tooLong',
  'tooShort',
  'rangeUnderflow',
  'rangeOverflow',
  'stepMismatch',
  'badInput',
  'customError',
] as const;

/**
 * Base des champs à libellé flottant (`rds-input`, `rds-select`, `rds-textarea`).
 *
 * @remarks
 * Porte la logique partagée : états de validation (`:state(error)` / `:state(success)`), messages
 * (`rds-message` via {@link FieldMessages}), description accessible et API `setSuccessState`,
 * `setErrorState`, `clearState`, `setHint`, `removeHint`.
 * Les erreurs natives ne s'affichent qu'après interaction (`touched`).
 */
export abstract class BaseFieldElement extends BaseFormElement {
  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };

  /** `true` après une interaction : autorise l'affichage des erreurs natives. */
  protected touched = false;

  /** Contrôle natif interne (`input`, `select` ou `textarea`). */
  protected abstract get control(): FieldControl;

  /** Ajoute ou retire un `:state()` CSS de l'hôte. */
  protected setState(name: string, on: boolean): void {
    if (on) this.internals.states.add(name);
    else this.internals.states.delete(name);
  }

  /** Synchronise états visuels, message d'état, `aria-invalid` et validité du formulaire. */
  protected syncStates(): void {
    const control = this.control;
    const forced = this.getAttribute('state');
    const nativeError = this.touched && !control.validity.valid && !control.disabled;
    const state =
      forced === 'success' || forced === 'error' ? forced : nativeError ? 'error' : '';
    this.setState('success', state === 'success');
    this.setState('error', state === 'error');

    const message = this.require('#state-msg');
    message.hidden = !state;
    if (state) message.setAttribute('state', state);
    else message.removeAttribute('state');
    this.require('#success-text').hidden = state !== 'success';
    this.require('#error-text').hidden = state !== 'error';
    // Message natif quand aucun message d'erreur n'est fourni.
    this.require('#error-fallback').textContent =
      (!forced && control.validationMessage) || 'Ce champ contient une erreur.';
    control.setAttribute('aria-invalid', String(state === 'error'));

    if (control.validity.valid) this.setValidity();
    else this.setValidity(flagsOf(control.validity), control.validationMessage, control);
  }

  /** Synchronise libellé flottant, indice et description accessible. */
  protected syncLabelStates(): void {
    this.setState('has-label', hasContent(this.query<HTMLSlotElement>('#label-slot')));
    const hint = this.require('#hint');
    hint.hidden = !hasContent(this.query<HTMLSlotElement>('#hint-slot'));

    const ids: string[] = [];
    if (!hint.hidden) ids.push('hint');
    if (!this.require('#state-msg').hidden) ids.push('state-msg');
    if (ids.length) this.control.setAttribute('aria-describedby', ids.join(' '));
    else this.control.removeAttribute('aria-describedby');
  }

  protected beforeValidate(): void {
    this.touched = true;
    this.syncStates();
  }

  protected onConnect(): void {
    // Soumission d'un formulaire invalide : le navigateur notifie l'hôte.
    this.resources.listen(this, 'invalid', () => {
      this.touched = true;
      this.syncStates();
      this.syncLabelStates();
    });
  }

  //#region API publique
  /** Passe le champ en succès, avec un message optionnel. */
  setSuccessState(message?: string): this {
    return this.#_force('success', message);
  }

  /** Passe le champ en erreur, avec un message optionnel. */
  setErrorState(message?: string): this {
    return this.#_force('error', message);
  }

  /** Retire l'état forcé (succès ou erreur) et ses messages. */
  clearState(): this {
    this.removeAttribute('state');
    this.setSlotText('success', null);
    this.setSlotText('error', null);
    return this;
  }

  /** Définit l'indice d'utilisation. */
  setHint(hint: string): this {
    return this.setSlotText('hint', hint);
  }

  /** Retire l'indice d'utilisation. */
  removeHint(): this {
    return this.setSlotText('hint', null);
  }
  //#endregion

  /** Remplace (ou supprime si `text` est `null`) le contenu d'un slot nommé. */
  protected setSlotText(name: string, text: string | null): this {
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

  #_force(state: 'success' | 'error', message?: string): this {
    this.setAttribute('state', state);
    if (message) this.setSlotText(state, message);
    return this;
  }
}

/** Copie une `ValidityState` en `ValidityStateFlags`. */
function flagsOf(validity: ValidityState): ValidityStateFlags {
  const flags: ValidityStateFlags = {};
  for (const key of VALIDITY_KEYS) if (validity[key]) flags[key] = true;
  return flags;
}
