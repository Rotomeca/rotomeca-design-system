import { Define } from '../../../core/scripts/decorators';
import { TAG_TERTIARY_BUTTON } from '../../../core/scripts/utils/tags';
import { RotomecaButton } from '../button/button';

export { RotomecaTertiaryButton };

/**
 * Bouton à variante figée `tertiary` : `<rds-tertiary-button>`.
 *
 * @remarks
 * Action discrète, sans fond ni bordure.
 * Mêmes attributs, slots et parts que {@link RotomecaButton}, sauf `variant` (ignoré).
 * Template et styles sont hérités du bouton de base.
 *
 * @example
 * ```html
 * <rds-tertiary-button icon-before="leaf">Créer un motif</rds-tertiary-button>
 * ```
 */
@Define({ tag: TAG_TERTIARY_BUTTON })
class RotomecaTertiaryButton extends RotomecaButton {
  static fixedVariant = 'tertiary' as const;
}
