import { Define, Light } from '../../../core/scripts/decorators';
import { TAG_FRAGMENT } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './fragment.less';

export { RotomecaFragment };

/**
 * Conteneur logique « Fragment » : regroupe des éléments du DOM sans introduire de boîte de rendu
 * (`display: contents`).
 *
 * @remarks
 * Permet de grouper des éléments (boucles, conditions) sans briser le contexte de formatage CSS
 * du parent (ex. `display: grid` ou `display: flex`).
 *
 * @example
 * ```html
 * <div class="grid-container">
 *   <rds-fragment>
 *     <div class="cell-1">Item A</div>
 *     <div class="cell-2">Item B</div>
 *   </rds-fragment>
 * </div>
 * ```
 */
@Define({ tag: TAG_FRAGMENT })
@Light()
class RotomecaFragment extends BaseElementInternal {
  protected onConnect(): void {
    if (this.style.display !== 'contents') this.style.display = 'contents';
  }
}

window.rotomeca ??= {};
window.rotomeca.rds ??= {};
window.rotomeca.rds.styles ??= {};

// Clé = tag (stable à la minification, contrairement à `RotomecaFlexBox.name`)
if (!window.rotomeca.rds.styles[TAG_FRAGMENT]) {
  window.rotomeca.rds.styles[TAG_FRAGMENT] = true;

  const tmp = new CSSStyleSheet();
  tmp.replaceSync(style);

  document.adoptedStyleSheets = [...document.adoptedStyleSheets, tmp];
}
