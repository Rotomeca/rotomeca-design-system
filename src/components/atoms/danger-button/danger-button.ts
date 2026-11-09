import { Define } from '../../../core/scripts/decorators';
import { TAG_DANGER_BUTTON } from '../../../core/scripts/utils/tags';
import { RotomecaButton } from '../button/button';

export { RotomecaDangerButton };

/**
 * Bouton à variante figée `danger` : `<rds-danger-button>`.
 *
 * @remarks
 * Action destructrice, idéalement confirmée.
 * Mêmes attributs, slots et parts que {@link RotomecaButton}, sauf `variant` (ignoré).
 * Template et styles sont hérités du bouton de base.
 *
 * @example
 * ```html
 * <rds-danger-button icon-before="leaf">Créer un motif</rds-danger-button>
 * ```
 */
@Define({ tag: TAG_DANGER_BUTTON })
class RotomecaDangerButton extends RotomecaButton {
  static fixedVariant = 'danger' as const;
}
