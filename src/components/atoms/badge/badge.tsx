import { Attr, Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_BADGE } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../icon/icon';
import style from './badge.less';

export { RotomecaBadge, BADGE_TONES };
export type { BadgeTone, BadgeAppearance, BadgeSize };

type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';
type BadgeAppearance = 'subtle' | 'bold';
type BadgeSize = 'sm' | 'md';

const BADGE_TONES: readonly BadgeTone[] = [
  'neutral',
  'brand',
  'accent',
  'success',
  'warning',
  'danger',
];

const TEMPLATE = (
  <span class="badge" part="badge">
    <span class="dot"></span>
    <RotomecaIcon id="icon" hidden />
    <span id="count" hidden></span>
    <slot id="text"></slot>
  </span>
);

/**
 * Badge : statut, catégorie ou compteur, en six tons et deux intensités.
 *
 * @remarks
 * Ce n'est pas un bouton : jamais cliquable seul. Un statut ne repose jamais sur la couleur seule
 * (le texte ou l'icône le dit aussi).
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `tone` | `neutral` (défaut) · `brand` · `accent` · `success` · `warning` · `danger` | Couleur. |
 * | `appearance` | `subtle` (défaut) · `bold` | Fond teinté ou fond plein. |
 * | `dot` | booléen | Pastille ronde devant le texte. |
 * | `icon` | nom Lucide | Icône 14 px devant le texte. |
 * | `count` / `max` | nombres (max : 99) | Mode compteur : `count`, ou `max+` au-delà. |
 * | `size` | `sm` · `md` | 20 / 24 px de haut. |
 *
 * Le compteur « rebondit » quand sa valeur change (aucune animation sous `prefers-reduced-motion`).
 *
 * @slot - Texte court (1–2 mots).
 * @csspart badge - La pastille.
 * @cssstate count - Mode compteur.
 *
 * @example
 * ```html
 * <rds-badge tone="success" dot>En ligne</rds-badge>
 * <rds-badge tone="danger" appearance="bold" count="128"></rds-badge>
 * ```
 */
@Define({ tag: TAG_BADGE, template: TEMPLATE, styles: style })
class RotomecaBadge extends BaseElementInternal {
  /** Ton de couleur. */
  @Attr() accessor tone: BadgeTone = 'neutral';
  /** Intensité : `subtle` (défaut) ou `bold`. */
  @Attr() accessor appearance: BadgeAppearance = 'subtle';
  /** Taille : `sm` (20 px) ou `md` (24 px, défaut). */
  @Attr() accessor size: BadgeSize = 'md';
  /** Pastille ronde devant le texte. */
  @Attr() accessor dot: boolean = false;
  /** Valeur du compteur (le mode compteur s'active dès que l'attribut est présent). */
  @Attr() accessor count: number = 0;
  /** Valeur au-delà de laquelle le compteur affiche `max+`. */
  @Attr() accessor max: number = 99;

  static observedAttributes: string[] = ['tone', 'appearance', 'icon', 'count', 'max'];

  #_lastCount: string | null = null;

  /** Nom de l'icône devant le texte. */
  get icon(): string {
    return this.stringAttribute('icon');
  }
  set icon(value: string) {
    this.setStringAttribute('icon', value || null);
  }

  protected update(): void {
    const badge = this.require('.badge');
    badge.dataset.tone = BADGE_TONES.includes(this.tone) ? this.tone : 'neutral';
    badge.dataset.appearance = this.appearance === 'bold' ? 'bold' : 'subtle';

    const icon = this.require('#icon');
    icon.hidden = !this.icon;
    if (this.icon) icon.setAttribute('name', this.icon);

    const countElement = this.require('#count');
    const hasCount = this.hasAttribute('count');
    if (hasCount) this._p_addState('count');
    else this._p_removeState('count');
    countElement.hidden = !hasCount;
    this.require('#text').hidden = hasCount;
    if (!hasCount) return;

    const value = Math.max(0, Math.floor(Number(this.count)));
    const max = Number(this.max);
    const text = value > max ? `${max}+` : String(value);
    countElement.textContent = text;
    if (this.#_lastCount !== null && this.#_lastCount !== text && !reducedMotion()) {
      badge.animate(
        [{ transform: 'scale(0.7)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
        { duration: 300, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' },
      );
    }
    this.#_lastCount = text;
  }
}
