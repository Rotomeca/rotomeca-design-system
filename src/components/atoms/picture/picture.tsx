import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_PICTURE } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { hasContent } from '../../base/dom';
import { RotomecaIcon } from '../icon/icon';
import style from './picture.less';

export { RotomecaPicture };
export type { PictureFit, PictureLoading };

type PictureFit = 'cover' | 'contain';
type PictureLoading = 'lazy' | 'eager';

/** Attributs recopiés tels quels sur l'`<img>` interne. */
const COPIED_ATTRIBUTES = ['srcset', 'sizes', 'width', 'height'] as const;

const TEMPLATE = (
  <figure part="figure">
    <div class="frame" part="frame">
      <img id="img" part="image" decoding="async" alt="" />
      <div class="fallback">
        <RotomecaIcon id="fallback" name="image-off" />
      </div>
    </div>
    <figcaption>
      <slot name="caption" id="caption"></slot>
    </figcaption>
  </figure>
);

/**
 * Image : ratio réservé, chargement différé, squelette pendant le chargement, fondu à l'apparition,
 * icône de repli en cas d'erreur, légende optionnelle.
 *
 * @remarks
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `src`, `srcset`, `sizes`, `width`, `height` | comme `<img>` | Source(s) de l'image. |
 * | `alt` | texte | **Obligatoire** ; `alt=""` si l'image est décorative. |
 * | `ratio` | `16/9`, `4/3`, `1`… | `aspect-ratio` réservé avant chargement. |
 * | `fit` | `cover` (défaut) · `contain` | Recadrage. |
 * | `rounded` / `circle` | booléen | Rayon `--ds-radius-lg` / cercle (ratio 1). |
 * | `loading` | `lazy` (défaut) · `eager` | `eager` pour l'image principale. |
 * | `fallback-icon` | nom Lucide | Icône d'erreur (défaut `image-off`). |
 *
 * @slot caption - Légende (`<figcaption>`).
 * @csspart figure - Le `<figure>`.
 * @csspart frame - Le cadre de l'image.
 * @csspart image - L'`<img>` natif.
 * @fires rds-picture:load - Image chargée.
 * @fires rds-picture:error - Échec du chargement.
 * @cssstate loaded - Image chargée.
 * @cssstate error - Échec du chargement.
 * @cssstate caption - Une légende est fournie.
 *
 * @example
 * ```html
 * <rds-picture src="foret.jpg" alt="Sous-bois en octobre" ratio="16/9" rounded>
 *   <span slot="caption">Forêt de Brocéliande</span>
 * </rds-picture>
 * ```
 */
@Define({ tag: TAG_PICTURE, template: TEMPLATE, styles: style })
class RotomecaPicture extends BaseElementInternal {
  /** Recadrage : `cover` (défaut) ou `contain`. */
  @Attr() accessor fit: PictureFit = 'cover';
  /** Chargement : `lazy` (défaut) ou `eager`. */
  @Attr() accessor loading: PictureLoading = 'lazy';
  /** Rayon `--ds-radius-lg`. */
  @Attr() accessor rounded: boolean = false;
  /** Cercle (ratio 1). */
  @Attr() accessor circle: boolean = false;

  static observedAttributes: string[] = [
    'src',
    'srcset',
    'sizes',
    'width',
    'height',
    'alt',
    'ratio',
    'fit',
    'loading',
    'fallback-icon',
  ];

  #_src: string | null = null;

  /** URL de l'image. */
  get src(): string {
    return this.stringAttribute('src');
  }
  set src(value: string) {
    this.setStringAttribute('src', value || null);
  }

  /** Texte alternatif (vide si l'image est décorative). */
  get alt(): string {
    return this.stringAttribute('alt');
  }
  set alt(value: string) {
    this.setStringAttribute('alt', value);
  }

  /** Ratio réservé (`16/9`, `4/3`, `1`…). */
  get ratio(): string {
    return this.stringAttribute('ratio');
  }
  set ratio(value: string) {
    this.setStringAttribute('ratio', value || null);
  }

  /** Icône d'erreur (défaut `image-off`). */
  get fallbackIcon(): string {
    return this.stringAttribute('fallback-icon');
  }
  set fallbackIcon(value: string) {
    this.setStringAttribute('fallback-icon', value || null);
  }

  protected onConnect(): void {
    const img = this.require<HTMLImageElement>('#img');
    this.resources.listen(img, 'load', () => {
      this._p_removeState('error');
      this._p_addState('loaded');
      this.emit('rds-picture:load', null);
    });
    this.resources.listen(img, 'error', () => {
      if (!img.getAttribute('src')) return;
      this._p_removeState('loaded');
      this._p_addState('error');
      this.emit('rds-picture:error', null);
    });
  }

  protected update(): void {
    const img = this.require<HTMLImageElement>('#img');
    img.alt = this.alt;
    img.loading = this.loading === 'eager' ? 'eager' : 'lazy';
    for (const name of COPIED_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value === null) img.removeAttribute(name);
      else img.setAttribute(name, value);
    }

    this.setCSSProperty('--_ratio', this.ratio || null);
    this.setCSSProperty('--_fit', this.fit === 'contain' ? 'contain' : 'cover');
    this.require('#fallback').setAttribute('name', this.fallbackIcon || 'image-off');

    const src = this.src;
    if (src !== this.#_src) {
      this.#_src = src;
      this._p_removeStates(['loaded', 'error']);
      if (src) img.src = src;
      else img.removeAttribute('src');
      // Image déjà en cache : l'événement `load` peut être passé.
      if (img.complete && img.naturalWidth > 0) this._p_addState('loaded');
    }
    this.#_syncCaption();
  }

  protected slotChanged(): void {
    this.#_syncCaption();
  }

  #_syncCaption(): void {
    if (hasContent(this.require<HTMLSlotElement>('#caption'))) this._p_addState('caption');
    else this._p_removeState('caption');
  }
}
