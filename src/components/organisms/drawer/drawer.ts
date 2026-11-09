import { Define } from '../../../core/scripts/decorators';
import { TAG_DRAWER } from '../../../core/scripts/utils/tags';
import { RotomecaDialog } from '../dialog/dialog';
import style from './drawer.less';

export { RotomecaDrawer };

/**
 * Tiroir : panneau latéral modal, même API que {@link RotomecaDialog}.
 *
 * @remarks
 * Filtres, détails d'un élément, navigation mobile. Pour une question bloquante, `rds-dialog`.
 * Animation : glissement depuis le bord (`transform`, `--ds-duration-long`), voile en fondu.
 *
 * | Attribut | Valeurs | Rôle |
 * | --- | --- | --- |
 * | `placement` | `start` (défaut) · `end` | Bord d'ancrage. |
 * | `size` | `sm` 288 · `md` 384 (défaut) · `lg` 576 | Largeur en px. |
 *
 * Les autres attributs, slots, parts et événements sont ceux de `rds-dialog`
 * (`rds-dialog:open` / `rds-dialog:close`).
 *
 * @example
 * ```html
 * <rds-drawer heading="Filtres" placement="end">
 *   …<rds-primary-button slot="actions" data-close="ok">Appliquer</rds-primary-button>
 * </rds-drawer>
 * ```
 */
@Define({ tag: TAG_DRAWER, styles: style })
class RotomecaDrawer extends RotomecaDialog {
  static observedAttributes: string[] = [...RotomecaDialog.observedAttributes, 'placement'];
}
