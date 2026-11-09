import { Define } from '../../../core/scripts/decorators';
import { adoptGlobalStyle } from '../../../core/scripts/utils/globalStyle';
import { TAG_FOOTER } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './footer.less';
import globalStyle from './footer-global.less';

export { RotomecaFooter };

const TEMPLATE = (
  <footer part="footer">
    <div class="inner">
      <div class="top">
        <div class="brand">
          <slot name="brand"></slot>
        </div>
        <div class="cols">
          <slot></slot>
        </div>
      </div>
      <div class="bottom">
        <slot name="bottom"></slot>
        <slot name="legal"></slot>
      </div>
    </div>
  </footer>
);

/**
 * Pied de page (`role="contentinfo"`) : marque et description, colonnes de liens, ligne légale.
 *
 * @remarks
 * Règle RGAA / DSFR : le lien « Accessibilité : non / partiellement / totalement conforme » figure
 * dans la ligne légale. Les liens slottés restent en light DOM ; leur style vient d'une feuille globale.
 *
 * @slot brand - Marque et description.
 * @slot - Colonnes (titre `.rds-footer-title` ou `h2` + `<ul>` de liens).
 * @slot bottom - Mentions légales, accessibilité, plan du site.
 * @slot legal - Mention de droits (©).
 * @csspart footer - Le conteneur.
 *
 * @example
 * ```html
 * <rds-footer>
 *   <strong slot="brand">Rotomeca</strong>
 *   <div><p class="rds-footer-title">Système</p><ul><li><a href="/tokens">Tokens</a></li></ul></div>
 *   <div slot="bottom"><a href="/mentions">Mentions légales</a></div>
 * </rds-footer>
 * ```
 */
@Define({ tag: TAG_FOOTER, template: TEMPLATE, styles: style })
class RotomecaFooter extends BaseElementInternal {
  protected onConnect(): void {
    adoptGlobalStyle(TAG_FOOTER, globalStyle);
    this._p_internal.role = 'contentinfo';
  }
}
