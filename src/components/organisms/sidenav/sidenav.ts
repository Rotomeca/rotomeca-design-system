import { Define, Light } from '../../../core/scripts/decorators';
import { adoptGlobalStyle } from '../../../core/scripts/utils/globalStyle';
import { TAG_SIDENAV } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import { whenParsed } from '../../base/dom';
import style from './sidenav.less';

export { RotomecaSideNav };

/**
 * Navigation latérale : liens et groupes repliables (`<details>`), page courante en pilule
 * `--ds-background-surface-strong`.
 *
 * @remarks
 * Composant en light DOM : vos liens et votre routeur restent intacts. Le groupe qui contient
 * `aria-current="page"` s'ouvre automatiquement. Un `rds-icon` peut précéder le texte d'un lien.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `heading` | texte | Titre de la rubrique. |
 * | `label` | texte (défaut « Menu latéral ») | Nom accessible de la navigation. |
 *
 * @example
 * ```html
 * <rds-sidenav heading="Documentation">
 *   <div class="rds-sn-list">
 *     <a href="/intro">Introduction</a>
 *     <details><summary>Fondations</summary>
 *       <div class="rds-sn-list"><a href="/couleurs" aria-current="page">Couleurs</a></div>
 *     </details>
 *   </div>
 * </rds-sidenav>
 * ```
 */
@Define({ tag: TAG_SIDENAV })
@Light()
class RotomecaSideNav extends BaseElementInternal {
  static observedAttributes: string[] = ['label'];

  /** Nom accessible de la navigation. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected onConnect(): void {
    adoptGlobalStyle(TAG_SIDENAV, style);
    this._p_internal.role = 'navigation';
    this._p_internal.ariaLabel = this.label || 'Menu latéral';
    // Les enfants ne sont pas encore là si l'élément est connecté pendant le parsing.
    whenParsed(this, () => this.#_build());
  }

  protected attributeChanged(name: string): void {
    if (name === 'label') this._p_internal.ariaLabel = this.label || 'Menu latéral';
  }

  #_build(): void {
    const title = this.getAttribute('heading');
    if (title && !this.querySelector(':scope > .rds-sn-title')) {
      const heading = document.createElement('p');
      heading.className = 'rds-sn-title';
      heading.textContent = title;
      this.prepend(heading);
    }
    // Le groupe qui contient la page courante est ouvert.
    this.querySelector('a[aria-current="page"]')?.closest('details')?.setAttribute('open', '');
  }
}
