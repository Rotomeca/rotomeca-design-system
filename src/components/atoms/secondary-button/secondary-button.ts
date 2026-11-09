import { Define } from '../../../core/scripts/decorators';
import { TAG_SECONDARY_BUTTON } from '../../../core/scripts/utils/tags';
import { RotomecaButton } from '../button/button';

export { RotomecaSecondaryButton };

/**
 * Bouton à variante figée `secondary` : `<rds-secondary-button>`.
 *
 * @remarks
 * Alternative à l'action principale (ex. « Annuler »).
 * Mêmes attributs, slots et parts que {@link RotomecaButton}, sauf `variant` (ignoré).
 * Template et styles sont hérités du bouton de base.
 *
 * @example
 * ```html
 * <rds-secondary-button icon-before="leaf">Créer un motif</rds-secondary-button>
 * ```
 */
@Define({ tag: TAG_SECONDARY_BUTTON })
class RotomecaSecondaryButton extends RotomecaButton {
  static fixedVariant = 'secondary' as const;
}
