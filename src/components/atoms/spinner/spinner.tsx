import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_SPINNER } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './spinner.less';

export { RotomecaSpinner };
export type { SpinnerSize };

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const TEMPLATE = (
  <>
    <svg viewBox="0 0 50 50" aria-hidden="true">
      <circle class="track" cx="25" cy="25" r="20"></circle>
      <circle cx="25" cy="25" r="20"></circle>
    </svg>
    <span class="sr-only" id="sr"></span>
  </>
);

/**
 * Indicateur de chargement circulaire (arc qui s'allonge et tourne), indéterminé.
 *
 * @remarks
 * Pour une attente mesurable, utiliser `rds-progress` ; si la forme du contenu est connue,
 * `rds-placeholder`.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `size` | `sm` (16) · `md` (24, défaut) · `lg` (40) · `xl` (64 px) | Diamètre. |
 * | `label` | texte | Annoncé (`role="status"`) ; sans libellé, le spinner est décoratif. |
 * | `inherit-color` | booléen | Prend la couleur du texte (dans un bouton). |
 *
 * @example
 * ```html
 * <rds-spinner size="lg" label="Chargement des motifs"></rds-spinner>
 * ```
 */
@Define({ tag: TAG_SPINNER, template: TEMPLATE, styles: style })
class RotomecaSpinner extends BaseElementInternal {
  /** Diamètre : `sm`, `md` (défaut), `lg` ou `xl`. */
  @Attr() accessor size: SpinnerSize = 'md';
  /** Reprend la couleur du texte environnant. */
  @Attr('inherit-color') accessor inheritColor: boolean = false;

  static observedAttributes: string[] = ['label'];

  /** Libellé annoncé aux lecteurs d'écran. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected update(): void {
    const label = this.label;
    this.require('#sr').textContent = label;
    this._p_internal.role = label ? 'status' : null;
    this._p_internal.ariaHidden = label ? null : 'true';
  }
}
