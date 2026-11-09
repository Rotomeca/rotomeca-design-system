import { Attr, Define } from '../../../core/scripts/decorators';
import type { Placement } from '../../../core/scripts/utils/floating';
import { TAG_HELPER } from '../../../core/scripts/utils/tags';
import { TipController } from '../../../core/scripts/utils/tip';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../icon/icon';
import style from './helper.less';

export { RotomecaHelper };
export type { HelperSize };

type HelperSize = 'sm' | 'md' | 'lg';

const TEMPLATE = (
  <>
    <button type="button" id="btn" part="button" aria-describedby="tip">
      <RotomecaIcon name="circle-help" />
    </button>
    <div class="tip" id="tip" role="tooltip" part="tooltip">
      <span id="text"></span>
      <slot></slot>
    </div>
  </>
);

/**
 * Aide contextuelle : un petit bouton « ? » qui affiche une infobulle (motif « toggletip »).
 *
 * @remarks
 * À placer à côté d'un libellé, d'un titre ou d'une légende de `rds-fieldset`, pour une précision
 * facultative. Une information indispensable va dans l'indice visible (`slot="hint"`).
 * Survol (400 ms), focus clavier (immédiat), clic / toucher (bascule), Échap ferme.
 * L'infobulle passe dans le top layer (`popover`), au-dessus des modales. Elle ne doit contenir
 * ni lien ni bouton : pour du contenu interactif, utiliser `rds-menu` ou `rds-dialog`.
 * Animation : fondu + zoom 0.94 → 1.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `title` ou `text` | texte | Contenu de l'infobulle. `title` est repris puis retiré de l'hôte (pas de bulle native en double). |
 * | slot par défaut | HTML court | Contenu riche à la place du texte. |
 * | `label` | texte (défaut « Aide ») | Nom accessible du bouton. |
 * | `placement` | `top` (défaut) · `bottom` · `left` · `right` | Côté préféré ; retourné si la place manque. |
 * | `size` | `sm` · `md` · `lg` | 20 / 24 / 32 px. |
 *
 * @slot - Contenu riche de l'infobulle.
 * @csspart button - Le bouton « ? ».
 * @csspart tooltip - La bulle.
 *
 * @cssstate open - Infobulle ouverte.
 *
 * @example
 * ```html
 * <label>Identifiant fiscal</label>
 * <rds-helper title="Numéro à 13 chiffres inscrit en haut de votre déclaration."></rds-helper>
 * ```
 */
@Define({ tag: TAG_HELPER, template: TEMPLATE, styles: style })
class RotomecaHelper extends BaseElementInternal {
  /** Côté préféré : `top` (défaut), `bottom`, `left` ou `right`. */
  @Attr() accessor placement: Placement = 'top';
  /** Taille : `sm` (20 px), `md` (24 px, défaut) ou `lg` (32 px). */
  @Attr() accessor size: HelperSize = 'md';

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = ['text', 'label', 'title'];

  #_controller: TipController | null = null;
  #_title = '';

  /** Contenu texte de l'infobulle (`text`, sinon `title` repris de l'hôte). */
  get text(): string {
    return this.stringAttribute('text') || this.#_title;
  }
  set text(value: string) {
    this.setStringAttribute('text', value || null);
  }

  /** Nom accessible du bouton (défaut « Aide »). */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
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
    const tip = this.require('#tip');
    this.#_controller = new TipController(
      this,
      tip,
      () => this.require('#btn'),
      () => this.placement,
    );
    // L'événement `toggle` du popover suit l'état d'ouverture (état CSS `open`).
    tip.addEventListener('toggle', (event) => {
      this.#_setOpen((event as ToggleEvent).newState === 'open');
    });
  }

  protected onConnect(): void {
    this.#_controller?.connect(this.resources);
    this.resources.listen(this.require('#btn'), 'click', () => {
      this.#_controller?.toggle();
    });
  }

  protected attributeChanged(name: string, _old: string | null, value: string | null): void {
    // Le `title` natif afficherait une seconde bulle : il est repris puis retiré.
    if (name === 'title' && value !== null) {
      this.#_title = value;
      this.removeAttribute('title');
      this.requestUpdate('title');
    }
  }

  protected update(): void {
    this.require('#text').textContent = this.text;
    this.require('#btn').setAttribute('aria-label', this.label || 'Aide');
  }

  #_setOpen(open: boolean): void {
    if (open) this._p_addState('open');
    else this._p_removeState('open');
  }
}
