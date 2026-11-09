import { Define } from '../../../core/scripts/decorators';
import { TAG_SKIP_LINKS } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './skip-links.less';

export { RotomecaSkipLinks };

const TEMPLATE = (
  <nav id="nav" part="nav">
    <slot></slot>
  </nav>
);

/**
 * Liens d'évitement : invisibles jusqu'à la première tabulation, pour aller directement au contenu,
 * au menu ou à la recherche (RGAA 12.7).
 *
 * @remarks
 * À placer en tout premier dans le `<body>`, avec des `<a href="#id">` vers des cibles existantes.
 * Animation : la barre descend du haut de l'écran au focus.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte (défaut « Accès rapide ») | Nom accessible de la navigation. |
 *
 * @slot - Les liens `<a href="#id">`.
 * @csspart nav - La barre de liens.
 *
 * @example
 * ```html
 * <rds-skip-links><a href="#contenu">Contenu</a><a href="#menu">Menu</a></rds-skip-links>
 * ```
 */
@Define({ tag: TAG_SKIP_LINKS, template: TEMPLATE, styles: style })
class RotomecaSkipLinks extends BaseElementInternal {
  static observedAttributes: string[] = ['label'];

  /** Nom accessible de la navigation. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected update(): void {
    this.require('#nav').setAttribute('aria-label', this.label || 'Accès rapide');
  }
}
