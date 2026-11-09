import { Attr, Define } from '../../../core/scripts/decorators';
import { TAG_BUTTON_GROUP } from '../../../core/scripts/utils/tags';
import { BaseElementInternal } from '../../base/BaseElementInternal';
import style from './button-group.less';

export { RotomecaButtonGroup };

const TEMPLATE = <slot></slot>;

/**
 * Groupe de boutons : barre d'actions espacée, ou boutons accolés en une seule pièce.
 *
 * @remarks
 * Dans une barre d'actions, l'action primaire est à droite (`align="end"`) ; un seul
 * `rds-primary-button`. Les boutons accolés reçoivent `--_radius` pour fusionner leurs rayons.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `label` | texte | Nom accessible du groupe. |
 * | `attached` | booléen | Boutons accolés, rayons fusionnés. |
 * | `orientation` | `vertical` | Empilement vertical. |
 * | `align` | `end` · `center` · `between` | Répartition (groupe sur toute la largeur). |
 * | `full` | booléen | Boutons de largeur égale. |
 *
 * @slot - Les boutons `rds-*-button`.
 *
 * @example
 * ```html
 * <rds-button-group align="end">
 *   <rds-tertiary-button>Annuler</rds-tertiary-button>
 *   <rds-primary-button>Enregistrer</rds-primary-button>
 * </rds-button-group>
 * ```
 */
@Define({ tag: TAG_BUTTON_GROUP, template: TEMPLATE, styles: style })
class RotomecaButtonGroup extends BaseElementInternal {
  /** Boutons accolés. */
  @Attr() accessor attached: boolean = false;
  /** Orientation : `vertical` pour empiler. */
  @Attr() accessor orientation: '' | 'vertical' = '';
  /** Répartition : `end`, `center` ou `between`. */
  @Attr() accessor align: '' | 'end' | 'center' | 'between' = '';
  /** Boutons de largeur égale. */
  @Attr() accessor full: boolean = false;

  static observedAttributes: string[] = ['label'];

  /** Nom accessible du groupe. */
  get label(): string {
    return this.stringAttribute('label');
  }
  set label(value: string) {
    this.setStringAttribute('label', value || null);
  }

  protected update(): void {
    this._p_internal.role = 'group';
    this._p_internal.ariaLabel = this.label || null;
  }
}
