import { Attr, Define } from '../../../core/scripts/decorators';
import type { Placement } from '../../../core/scripts/utils/floating';
import { TAG_TOOLTIP } from '../../../core/scripts/utils/tags';
import { TipController } from '../../../core/scripts/utils/tip';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './tooltip.less';

export { RotomecaTooltip };

const TEMPLATE = (
  <>
    <slot id="trigger"></slot>
    <div class="tip" id="tip" role="tooltip" part="tooltip">
      <span id="text"></span>
      <slot name="content"></slot>
    </div>
  </>
);

/**
 * Infobulle autour d'un déclencheur : un texte court, non interactif, qui nomme ou précise.
 *
 * @remarks
 * À utiliser pour nommer un bouton icône ou afficher un raccourci clavier. Pour une aide « ? »
 * autonome, utiliser `rds-helper`. Le texte est aussi posé en `aria-description` sur le déclencheur
 * (`aria-describedby` ne traverse pas le Shadow DOM). L'infobulle passe dans le top layer (Popover API).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `text` | texte | Contenu de l'infobulle (slot `content` pour du HTML court). |
 * | `placement` | `top` (défaut) · `bottom` · `left` · `right` | Côté préféré, retourné si besoin. |
 *
 * Animation : fondu + zoom léger ; délai d'apparition 400 ms au survol, immédiat au focus.
 *
 * @slot - Déclencheur (un seul élément focalisable).
 * @slot content - HTML court à la place de `text`.
 * @csspart tooltip - La bulle.
 *
 * @example
 * ```html
 * <rds-tooltip text="Enregistrer (Ctrl+S)">
 *   <rds-icon-button icon="download" label="Enregistrer"></rds-icon-button>
 * </rds-tooltip>
 * ```
 */
@Define({ tag: TAG_TOOLTIP, template: TEMPLATE, styles: style })
class RotomecaTooltip extends BaseElementInternal {
  /** Côté préféré : `top` (défaut), `bottom`, `left` ou `right`. */
  @Attr() accessor placement: Placement = 'top';

  static observedAttributes: string[] = ['text'];

  #_controller: TipController | null = null;
  #_described: Element | null = null;

  /** Contenu texte de l'infobulle. */
  get text(): string {
    return this.stringAttribute('text');
  }
  set text(value: string) {
    this.setStringAttribute('text', value || null);
  }

  /** Affiche l'infobulle immédiatement. */
  show(): void {
    this.#_controller?.open(0);
  }

  /** Masque l'infobulle. */
  hide(): void {
    this.#_controller?.close(0);
  }

  protected build(): void {
    this.#_controller = new TipController(
      this,
      this.require('#tip'),
      () => this.#_trigger() ?? this,
      () => this.placement,
    );
  }

  protected onConnect(): void {
    this.#_controller?.connect(this.resources);
  }

  protected update(): void {
    const text = this.text;
    this.require('#text').textContent = text;
    const trigger = this.#_trigger();
    if (this.#_described && this.#_described !== trigger) {
      this.#_described.removeAttribute('aria-description');
      this.#_described = null;
    }
    // Le déclencheur est en light DOM : la description passe par `aria-description`.
    if (trigger) {
      if (text) trigger.setAttribute('aria-description', text);
      else trigger.removeAttribute('aria-description');
      this.#_described = trigger;
    }
  }

  protected slotChanged(): void {
    this.requestUpdate('slot');
  }

  #_trigger(): Element | null {
    return this.require<HTMLSlotElement>('#trigger').assignedElements()[0] ?? null;
  }
}
