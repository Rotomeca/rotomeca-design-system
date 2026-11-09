import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_CALLOUT } from '../../../core/scripts/utils/tags';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import style from './callout.less';

export { RotomecaCallout };
export type { CalloutTone };

/** Ton d'une mise en avant. */
type CalloutTone = 'brand' | 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

const TONES: readonly CalloutTone[] = ['brand', 'accent', 'neutral', 'success', 'warning', 'danger'];

const TEMPLATE = (
  <div class="callout" part="callout">
    <div class="head">
      <span class="badge">
        <RotomecaIcon id="icon" />
      </span>
      <p class="title" id="title">
        <span id="title-text"></span>
        <slot name="title" id="title-slot"></slot>
      </p>
    </div>
    <div class="text">
      <slot></slot>
    </div>
    <div class="actions">
      <slot name="actions" id="actions"></slot>
    </div>
  </div>
);

/**
 * Mise en avant : un contenu important dans le fil d'une page (fond teinté, titre, actions).
 *
 * @remarks
 * À utiliser pour une information utile mais non urgente. Pour un retour lié à une action de
 * l'utilisateur, utiliser `rds-alert`.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `tone` | `brand` (défaut) · `accent` · `neutral` · `success` · `warning` · `danger` | Teinte. |
 * | `icon` | nom Lucide | Pastille ronde avec icône (absente sans `icon`). |
 * | `heading` | texte | Titre (ou slot `title`). |
 *
 * @slot - Le texte.
 * @slot title - Titre riche.
 * @slot actions - Boutons.
 * @csspart callout - Le conteneur.
 * @cssstate has-title - Un titre est présent.
 * @cssstate has-actions - Des actions sont présentes.
 *
 * @example
 * ```html
 * <rds-callout icon="leaf" heading="Pensez au thème sombre">Testez vos assemblages dans les deux thèmes.</rds-callout>
 * ```
 */
@Define({ tag: TAG_CALLOUT, template: TEMPLATE, styles: style })
class RotomecaCallout extends BaseElementInternal {
  /** Teinte de la mise en avant. */
  @Attr() accessor tone: CalloutTone = 'brand';

  static observedAttributes: string[] = ['icon', 'heading'];

  /** Nom de l'icône de la pastille. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  /** Titre. */
  get heading(): string {
    return this.stringAttribute('heading');
  }
  set heading(value: string) {
    this.setStringAttribute('heading', value || null);
  }

  protected update(): void {
    this.require('.callout').dataset.tone = TONES.includes(this.tone) ? this.tone : 'brand';
    const icon = this.require('#icon');
    if (this.icon) icon.setAttribute('name', this.icon);
    else icon.removeAttribute('name');
    this.require('#title-text').textContent = this.heading;
    this.#_refreshSlots();
  }

  protected slotChanged(): void {
    this.#_refreshSlots();
  }

  #_refreshSlots(): void {
    const title = !!this.heading || hasContent(this.require<HTMLSlotElement>('#title-slot'));
    if (title) this._p_addState('has-title');
    else this._p_removeState('has-title');
    if (hasContent(this.require<HTMLSlotElement>('#actions'))) this._p_addState('has-actions');
    else this._p_removeState('has-actions');
  }
}
