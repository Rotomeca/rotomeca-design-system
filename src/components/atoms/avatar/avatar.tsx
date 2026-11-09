import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_AVATAR } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { RotomecaIcon } from '../icon/icon';
import style from './avatar.less';

export { RotomecaAvatar };
export type { AvatarSize, AvatarStatus, AvatarTone };

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarStatus = '' | 'online' | 'away' | 'busy' | 'offline';
type AvatarTone = '' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

/** Tons attribuables par le hash du nom (le ton `neutral` est réservé à l'absence de nom). */
const HASHED_TONES = ['brand', 'accent', 'success', 'warning', 'danger'] as const;

const STATUS_LABELS: Record<Exclude<AvatarStatus, ''>, string> = {
  online: 'en ligne',
  away: 'absent',
  busy: 'occupé',
  offline: 'hors ligne',
};

const TEMPLATE = (
  <span class="avatar" part="avatar">
    <span id="initials"></span>
    <RotomecaIcon id="icon" name="user" hidden />
    <img id="img" alt="" hidden />
    <span class="status"></span>
  </span>
);

/**
 * Avatar : photo, sinon initiales sur une couleur stable dérivée du nom, sinon icône ; pastille de statut.
 *
 * @remarks
 * Le nom accessible (`role="img"`) combine le nom et le statut.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `name` | texte | Nom complet : initiales, couleur, nom accessible. |
 * | `src` | URL | Photo (fondu à l'apparition ; repli sur les initiales si erreur). |
 * | `size` | `xs` 24 · `sm` 32 · `md` 40 · `lg` 56 · `xl` 80 | Diamètre. |
 * | `status` | `online` · `away` · `busy` · `offline` | Pastille de statut. |
 * | `shape` | `square` | Carré arrondi (organisation, équipe). |
 * | `tone` | ton du système | Impose la couleur. |
 *
 * @csspart avatar - Le disque de l'avatar.
 * @cssstate loaded - La photo est chargée.
 *
 * @example
 * ```html
 * <rds-avatar name="Camille Roux" status="online"></rds-avatar>
 * ```
 */
@Define({ tag: TAG_AVATAR, template: TEMPLATE, styles: style })
class RotomecaAvatar extends BaseElementInternal {
  /** Diamètre : `xs`, `sm`, `md` (défaut), `lg` ou `xl`. */
  @Attr() accessor size: AvatarSize = 'md';
  /** Pastille de statut. */
  @Attr() accessor status: AvatarStatus = '';
  /** Forme `square` (carré arrondi) ; vide pour un disque. */
  @Attr() accessor shape: '' | 'square' = '';
  /** Ton imposé ; vide pour une couleur dérivée du nom. */
  @Attr() accessor tone: AvatarTone = '';

  static observedAttributes: string[] = ['name', 'src', 'status', 'tone', 'size', 'shape'];

  /** Nom complet de la personne ou de l'organisation. */
  get name(): string {
    return this.stringAttribute('name');
  }
  set name(value: string) {
    this.setStringAttribute('name', value || null);
  }

  /** URL de la photo. */
  get src(): string {
    return this.stringAttribute('src');
  }
  set src(value: string) {
    this.setStringAttribute('src', value || null);
  }

  protected onConnect(): void {
    const img = this.require<HTMLImageElement>('#img');
    this.resources.listen(img, 'load', () => this._p_addState('loaded'));
    this.resources.listen(img, 'error', () => {
      this._p_removeState('loaded');
      img.hidden = true;
    });
  }

  protected update(): void {
    const name = this.name.trim();
    const initials = name
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');

    // Couleur stable : hash du nom.
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const tone = this.tone || (name ? HASHED_TONES[hash % HASHED_TONES.length] : 'neutral');
    this.require('.avatar').dataset.tone = tone;

    this.require('#initials').textContent = initials;
    this.require('#icon').hidden = !!initials;

    const src = this.src;
    const img = this.require<HTMLImageElement>('#img');
    if (src) {
      if (img.getAttribute('src') !== src) {
        this._p_removeState('loaded');
        img.hidden = false;
        img.src = src;
      }
    } else {
      this._p_removeState('loaded');
      img.hidden = true;
      img.removeAttribute('src');
    }

    const statusLabel = this.status ? STATUS_LABELS[this.status] : undefined;
    this._p_internal.role = 'img';
    this._p_internal.ariaLabel = [name || 'Utilisateur', statusLabel].filter(Boolean).join(', ');
  }
}
