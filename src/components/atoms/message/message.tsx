import { Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_MESSAGE } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import { RotomecaIcon } from '../icon/icon';
import style from './message.less';

export { RotomecaMessage };
export type { MessageState };

/** État d'un message (vide : indice neutre). */
type MessageState = '' | 'info' | 'success' | 'warning' | 'error';

/** Icône par défaut de chaque état (aucune pour l'indice neutre). */
const STATE_ICONS: Readonly<Record<string, string>> = {
  info: 'info',
  success: 'circle-check',
  warning: 'triangle-alert',
  error: 'circle-x',
};

const TEMPLATE = (
  <div class="message" part="message">
    <RotomecaIcon id="icon" hidden />
    <span class="text" id="live">
      <slot id="text"></slot>
    </span>
  </div>
);

/**
 * Message `rds-message` : texte d'aide ou de validation, avec icône d'état et apparition douce.
 *
 * @remarks
 * C'est la brique des messages sous les champs (`hint`, `success`, `error`). Un message vide est
 * masqué automatiquement. La couleur est toujours doublée d'une icône (RGAA 3.2).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `state` | *(vide)* · `info` · `success` · `warning` · `error` | Couleur et icône par défaut. |
 * | `icon` | nom Lucide | Remplace l'icône de l'état. |
 *
 * Accessibilité : `aria-live="polite"`, `assertive` pour `error`. Hors d'un champ, relier le message
 * à son contrôle via `aria-describedby`.
 *
 * Animation : à chaque nouveau message, fondu + glissement de 4 px (200 ms).
 *
 * @slot - Le message (une phrase ponctuée).
 * @csspart message - Le conteneur du message.
 * @cssstate empty - Aucun contenu : le message est masqué.
 *
 * @example
 * ```html
 * <rds-message state="error">Ce champ est obligatoire.</rds-message>
 * ```
 */
@Define({ tag: TAG_MESSAGE, template: TEMPLATE, styles: style })
class RotomecaMessage extends BaseElementInternal {
  static observedAttributes: string[] = ['state', 'icon'];

  #_signature = '';

  /** État du message. */
  get state(): MessageState {
    return this.stringAttribute('state') as MessageState;
  }
  set state(value: MessageState) {
    this.setStringAttribute('state', value || null);
  }

  /** Nom de l'icône remplaçant celle de l'état. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  protected update(): void {
    const requested = this.state;
    const state = requested in STATE_ICONS ? requested : '';
    this.require('.message').dataset.state = state;

    const name = this.icon || STATE_ICONS[state] || '';
    const icon = this.require('#icon');
    icon.hidden = !name;
    if (name) icon.setAttribute('name', name);
    else icon.removeAttribute('name');

    // Une erreur est annoncée tout de suite ; le reste poliment.
    this.require('#live').setAttribute('aria-live', state === 'error' ? 'assertive' : 'polite');
    this.#_refresh();
  }

  protected slotChanged(): void {
    this.#_refresh();
  }

  #_refresh(): void {
    const slot = this.require<HTMLSlotElement>('#text');
    const empty = !hasContent(slot);
    if (empty) this._p_addState('empty');
    else this._p_removeState('empty');

    const text = slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent)
      .join('')
      .trim();
    const signature = `${this.state}|${text}`;
    if (!empty && signature !== this.#_signature && !reducedMotion()) {
      this.require('.message').animate(
        [
          { opacity: 0, transform: 'translateY(-4px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 200, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
      );
    }
    this.#_signature = empty ? '' : signature;
  }
}
