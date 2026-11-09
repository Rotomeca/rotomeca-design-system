import { Define } from '../../../core/scripts/decorators';
import { TAG_PRIMARY_BUTTON } from '../../../core/scripts/utils/tags';
import { RotomecaButton } from '../button/button';

export { RotomecaPrimaryButton };

/**
 * Bouton à variante figée `primary` : `<rds-primary-button>`.
 *
 * @remarks
 * Action principale de la zone : une seule par vue ou par dialogue.
 * Mêmes attributs, slots et parts que {@link RotomecaButton}, sauf `variant` (ignoré).
 * Template et styles sont hérités du bouton de base.
 *
 * @example
 * ```html
 * <rds-primary-button icon-before="leaf">Créer un motif</rds-primary-button>
 * ```
 */
@Define({ tag: TAG_PRIMARY_BUTTON })
class RotomecaPrimaryButton extends RotomecaButton {
  static fixedVariant = 'primary' as const;
}
