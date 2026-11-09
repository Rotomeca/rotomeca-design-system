import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_CARD } from '../../../core/scripts/utils/tags';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import style from './card.less';

export { RotomecaCard };
export type { CardVariant };

/** Variante d'une carte (vide : contour). */
type CardVariant = '' | 'filled' | 'elevated' | 'tile';

/** Slots testés, avec l'état personnalisé associé. */
const SLOT_STATES: readonly (readonly [string, string])[] = [
  ['media', 'has-media'],
  ['tags', 'has-tags'],
  ['meta', 'has-meta'],
  ['actions', 'has-footer'],
];

const TEMPLATE = (
  <article class="card" part="card">
    <div class="media">
      <slot name="media" id="media"></slot>
    </div>
    <div class="content">
      <div class="tags">
        <slot name="tags" id="tags"></slot>
      </div>
      <h3 class="title" id="title"></h3>
      <div class="desc">
        <slot></slot>
      </div>
      <div class="meta">
        <slot name="meta" id="meta"></slot>
      </div>
    </div>
    <div class="footer">
      <slot name="actions" id="actions"></slot>
    </div>
    <RotomecaIcon class="arrow" name="arrow-right" />
  </article>
);

/**
 * Carte : média, tags, titre, description, métadonnées, actions ; entièrement cliquable avec `href`.
 *
 * @remarks
 * `href` et `slot="actions"` sont exclusifs : une carte cliquable ne contient pas d'autres actions.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `heading` | texte | Titre (niveau `level`, 3 par défaut). |
 * | `href` | URL | Rend toute la carte cliquable via le lien du titre. |
 * | `level` | 2 à 6 | Niveau du titre. |
 * | `variant` | *(contour)* · `filled` · `elevated` · `tile` | Tuile : contenu centré. |
 * | `orientation` | `horizontal` | Média à gauche (40 %). |
 * | `size` | `sm` | Marge intérieure réduite. |
 *
 * Animation : avec `href`, la carte s'élève de 2 px, le média zoome légèrement et la flèche glisse.
 *
 * @slot - Description.
 * @slot media - Image (`rds-picture`).
 * @slot tags - Badges ou tags.
 * @slot meta - Métadonnées (date…).
 * @slot actions - Boutons.
 * @csspart card - Le conteneur.
 * @cssstate link - La carte est cliquable.
 * @cssstate has-media - Un média est présent.
 * @cssstate has-tags - Des tags sont présents.
 * @cssstate has-meta - Des métadonnées sont présentes.
 * @cssstate has-footer - Des actions sont présentes.
 *
 * @example
 * ```html
 * <rds-card href="/motifs/chene" heading="Feuille de chêne">
 *   <rds-picture slot="media" src="chene.jpg" alt="" ratio="16/9"></rds-picture>
 *   Motif vectoriel aux tons cuivre et ocre.
 * </rds-card>
 * ```
 */
@Define({ tag: TAG_CARD, template: TEMPLATE, styles: style })
class RotomecaCard extends BaseElementInternal {
  /** Variante visuelle. */
  @Attr() accessor variant: CardVariant = '';
  /** Orientation : `horizontal` place le média à gauche. */
  @Attr() accessor orientation: string = '';
  /** Taille : `sm` réduit la marge intérieure. */
  @Attr() accessor size: string = '';

  static observedAttributes: string[] = ['href', 'heading', 'level'];

  /** Titre de la carte. */
  get heading(): string {
    return this.stringAttribute('heading');
  }
  set heading(value: string) {
    this.setStringAttribute('heading', value || null);
  }

  /** Adresse de destination : rend toute la carte cliquable. */
  get href(): string {
    return this.stringAttribute('href');
  }
  set href(value: string) {
    this.setStringAttribute('href', value || null);
  }

  /** Niveau de titre (2 à 6, 3 par défaut). */
  get level(): number {
    return Math.min(6, Math.max(2, this.numberAttribute('level', 3)));
  }
  set level(value: number) {
    this.setStringAttribute('level', value);
  }

  protected update(): void {
    const { href, heading } = this;
    const title = this.require('#title');
    title.replaceChildren();
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = heading;
      title.append(link);
    } else title.textContent = heading;
    title.hidden = !heading;
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', String(this.level));
    if (href) this._p_addState('link');
    else this._p_removeState('link');
    this.#_refreshSlots();
  }

  protected slotChanged(): void {
    this.#_refreshSlots();
  }

  #_refreshSlots(): void {
    for (const [slot, state] of SLOT_STATES) {
      if (hasContent(this.require<HTMLSlotElement>(`#${slot}`))) this._p_addState(state);
      else this._p_removeState(state);
    }
  }
}
