import { Attr, Define } from '../../../core/scripts/decorators';
import { reducedMotion } from '../../../core/scripts/utils/motion';
import { TAG_BACK_TO_TOP } from '../../../core/scripts/utils/tags';
import { RotomecaIcon } from '../../atoms/icon/icon';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './back-to-top.less';

export { RotomecaBackToTop };

const TEMPLATE = (
  <a href="#top" id="a" part="link">
    <RotomecaIcon name="arrow-up" />
    <span id="text"></span>
  </a>
);

/**
 * Retour en haut de page : lien en fin de page, ou bouton flottant qui apparaît après défilement.
 *
 * @remarks
 * Défilement doux sauf sous `prefers-reduced-motion` ; le focus est replacé en haut pour les
 * utilisateurs clavier.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte (défaut « Haut de page ») | Libellé du lien. |
 * | `floating` | booléen | Bouton flottant, visible après `threshold`. |
 * | `threshold` | px (400) | Défilement avant apparition. |
 * | `target` | sélecteur CSS | Élément qui reçoit le focus (`#top`, sinon `main` ou `h1`). |
 *
 * @csspart link - Le lien.
 * @cssstate visible - Le bouton flottant est affiché.
 *
 * @example
 * ```html
 * <rds-back-to-top floating></rds-back-to-top>
 * ```
 */
@Define({ tag: TAG_BACK_TO_TOP, template: TEMPLATE, styles: style })
class RotomecaBackToTop extends BaseElementInternal {
  /** Bouton flottant, affiché après défilement. */
  @Attr() accessor floating: boolean = false;
  /** Défilement (px) avant l'apparition du bouton flottant. */
  @Attr() accessor threshold: number = 400;

  static shadowOptions: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static observedAttributes: string[] = ['label', 'target'];

  /** Libellé du lien. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  /** Sélecteur de l'élément qui reçoit le focus. */
  get target(): string {
    return this.stringAttribute('target');
  }
  set target(value: string) {
    this.setStringAttribute('target', value || null);
  }

  protected onConnect(): void {
    this.resources.listen(this.require('#a'), 'click', (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      const target = document.querySelector<HTMLElement>(this.target || '#top') ??
        document.querySelector<HTMLElement>('main, h1');
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
    const check = (): void => {
      if (window.scrollY > (Number(this.threshold) || 400)) this._p_addState('visible');
      else this._p_removeState('visible');
    };
    this.resources.listen(window, 'scroll', check, { passive: true });
    check();
  }

  protected update(): void {
    this.require('#text').textContent = this.label || 'Haut de page';
  }
}
