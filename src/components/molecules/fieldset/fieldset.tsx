import { Attr, Define } from '../../../core/scripts/decorators';
import {
  TAG_CHECKBOX,
  TAG_FIELDSET,
  TAG_INPUT,
  TAG_RADIO,
  TAG_SEGMENTED_CONTROL,
  TAG_SELECT,
  TAG_SWITCH,
  TAG_TEXTAREA,
} from '../../../core/scripts/utils/tags';
import { RotomecaMessage } from '../../atoms/message/message';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './fieldset.less';

export { RotomecaFieldset };
export type { FieldsetState };

/** État de validation du groupe (vide : neutre). */
type FieldsetState = '' | 'error' | 'success';

/** Contrôles enfants désactivés avec le groupe. */
const CONTROLS = [
  TAG_CHECKBOX,
  TAG_RADIO,
  TAG_SWITCH,
  TAG_INPUT,
  TAG_SELECT,
  TAG_TEXTAREA,
  TAG_SEGMENTED_CONTROL,
].join(', ');

const TEMPLATE = (
  <div class="group" id="group" part="group" aria-labelledby="legend">
    <div class="legend" id="legend">
      <span id="legend-text"></span>
      <slot name="legend"></slot>
      <span class="req" id="req" aria-hidden="true" hidden>
        *
      </span>
      <slot name="helper"></slot>
    </div>
    <RotomecaMessage id="hint">
      <slot name="hint"></slot>
    </RotomecaMessage>
    <div class="items" part="items">
      <slot></slot>
    </div>
    <div class="messages">
      <RotomecaMessage id="error" state="error" hidden>
        <slot name="error"></slot>
      </RotomecaMessage>
      <RotomecaMessage id="success" state="success" hidden>
        <slot name="success"></slot>
      </RotomecaMessage>
    </div>
  </div>
);

/**
 * Groupe de champs : légende, aide « ? », indice, contrôles et message de validation commun.
 *
 * @remarks
 * `role="group"`, ou `radiogroup` s'il contient des radios. Les contrôles enfants sont désactivés
 * avec le groupe (et réactivés ensuite s'ils ne l'étaient pas avant).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `legend` | texte | Intitulé du groupe (ou slot `legend`). |
 * | `required` | booléen | Astérisque + `aria-required`. |
 * | `inline` | booléen | Contrôles côte à côte. |
 * | `state` | `error` · `success` | Trait vertical et message (slots `error` / `success`). |
 * | `disabled` | booléen | Désactive tous les contrôles enfants. |
 *
 * @slot - Les contrôles (`rds-checkbox`, `rds-radio`, `rds-switch`, champs…).
 * @slot legend - Légende riche.
 * @slot hint - Indice sous la légende.
 * @slot helper - Aide `rds-helper` à côté de la légende.
 * @slot error - Message d'erreur du groupe.
 * @slot success - Message de succès du groupe.
 * @csspart group - Le conteneur.
 * @csspart items - La zone des contrôles.
 * @cssstate error - Le groupe est en erreur.
 * @cssstate success - Le groupe est valide.
 *
 * @example
 * ```html
 * <rds-fieldset legend="Format d'export" inline state="error">
 *   <rds-radio name="f" value="svg">SVG</rds-radio><rds-radio name="f" value="png">PNG</rds-radio>
 *   <span slot="error">Choisissez un format.</span>
 * </rds-fieldset>
 * ```
 */
@Define({ tag: TAG_FIELDSET, template: TEMPLATE, styles: style })
class RotomecaFieldset extends BaseElementInternal {
  /** État de validation du groupe. */
  @Attr() accessor state: FieldsetState = '';
  /** Groupe obligatoire. */
  @Attr() accessor required: boolean = false;
  /** Désactive tous les contrôles enfants. */
  @Attr() accessor disabled: boolean = false;
  /** Contrôles côte à côte. */
  @Attr() accessor inline: boolean = false;

  static observedAttributes: string[] = ['legend', 'state', 'required', 'disabled', 'inline'];

  /** Intitulé du groupe. */
  get legend(): string {
    return this.stringAttribute('legend');
  }
  set legend(value: string) {
    this.setStringAttribute('legend', value || null);
  }

  protected update(): void {
    const group = this.require('#group');
    group.setAttribute('role', this.querySelector(TAG_RADIO) ? 'radiogroup' : 'group');
    this.require('#legend-text').textContent = this.legend;
    this.require('#req').hidden = !this.required;

    const { state } = this;
    const error = state === 'error';
    const success = state === 'success';
    if (error) this._p_addState('error');
    else this._p_removeState('error');
    if (success) this._p_addState('success');
    else this._p_removeState('success');
    this.require('#error').hidden = !error;
    this.require('#success').hidden = !success;

    // Les messages vivent dans le Shadow DOM : le texte est relié par `aria-describedby` interne.
    group.setAttribute('aria-describedby', ['hint', error ? 'error' : success ? 'success' : ''].filter(Boolean).join(' '));
    if (this.required) group.setAttribute('aria-required', 'true');
    else group.removeAttribute('aria-required');

    this.#_propagateDisabled(!!this.disabled);
  }

  protected slotChanged(): void {
    this.requestUpdate('slot');
  }

  #_propagateDisabled(disabled: boolean): void {
    for (const control of this.querySelectorAll<HTMLElement>(CONTROLS)) {
      if (disabled) {
        control.setAttribute('disabled', '');
        control.dataset.fsDisabled = '';
      } else if (control.dataset.fsDisabled !== undefined) {
        control.removeAttribute('disabled');
        delete control.dataset.fsDisabled;
      }
    }
  }
}
